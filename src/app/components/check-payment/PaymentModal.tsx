"use client";
// Import Library
import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import Link from "next/link";
import { LuBanknote, LuCreditCard, LuQrCode } from "react-icons/lu";
// Import Components
import { FeeBreakdownList } from "@/src/app/components/check-payment/FeeBreakdownList";
// Import Providers
import { useRefundAlerts } from "@/src/app/providers/RefundAlertsProvider";
// Import Api
import { createCharge, getChargeQrImage, getEdcTerminals, getPaymentMethods, verifyCharge } from "@/src/app/lib/api/payments";
import { getTransactionByPlate, payTransaction } from "@/src/app/lib/api/transactions";
// Import Auth
import { FORBIDDEN_EVENT } from "@/src/app/lib/auth/fetchInterceptor";
import { handleSessionRevoked, refreshSession } from "@/src/app/lib/auth/session";
// Import Landing
import { ADMIN_CHANNEL_CODE, CARD_METHOD_ID, CASH_METHOD_ID, NO_ADMIN_PAYMENT_OPTIONS, REFUNDS_PATH, REFUND_REASON_LABELS, SCAN_METHOD_ID, resolveAdminPaymentOptions } from "@/src/app/lib/landing/checkPayment";
// Import Types
import type { PaymentModalProps, ActiveCharge, AdminPaymentOptions, PaymentDetail, PaymentMode, PendingChargeDialog, PendingGatewayCharge, ScanAlert } from "@/src/app/type/ui/checkPayment";
import type { EdcTerminal, PaymentSocketMessage, PaymentUpdatedEvent } from "@/src/app/type/api/payments";
import type { AdminPaymentRequest, AdminPaymentResponse, PendingGatewayChargeDetails, Transaction } from "@/src/app/type/api/transactions";
// Import Shared
import { ApiError, getErrorMessage, getFieldErrors, getPaymentWebSocketUrl, isApiErrorCode } from "@/src/app/lib/shared/http";
import { formatMoney, satangToBaht } from "@/src/app/lib/shared/format";

/* -------------------------------------- Config -------------------------------------- */

// Config key ใน localStorage ของเครื่อง EDC ที่พนักงานเลือกไว้ในเครื่องนี้
const EDC_DEVICE_STORAGE_KEY = "adminEdcDeviceId";

// Config error ที่เกิดจากเครื่อง EDC ที่เลือก ให้เลือกเครื่องใหม่ ไม่ต้อง void
const EDC_SELECTION_ERRORS = new Set([
  "EDC_DEVICE_REQUIRED",
  "EDC_DEVICE_NOT_FOUND",
  "EDC_DEVICE_NOT_CASHIER",
  "EDC_DEVICE_UNAVAILABLE",
]);

// Config ระยะรอก่อนต่อ WebSocket ใหม่แต่ละครั้ง
const PAYMENT_WS_RECONNECT_DELAYS_MS = [1_000, 2_000, 5_000, 10_000, 30_000];

// Config close code 4401 (invalid_token = cookie หมดอายุ/ผิด หรือ reason ที่ session จบ)
const WS_CLOSE_UNAUTHORIZED = 4401;

// Config close code 4403 (forbidden = ไม่มีสิทธิ์ transactions, origin_not_allowed = ADMIN_ORIGINS)
const WS_CLOSE_FORBIDDEN = 4403;

// Config รอหลัง QR หมดอายุก่อนขอให้ backend ตรวจ charge อีกครั้ง
const EXPIRED_QR_VERIFY_DELAY_MS = 15_000;

/* -------------------------------------- Helpers -------------------------------------- */

// Function อ่านเครื่อง EDC ที่จำไว้ (อ่านไม่ได้ = ไม่มี)
function readStoredEdcDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(EDC_DEVICE_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

// Function จำเครื่อง EDC ที่เลือก (ค่าว่าง = ลบ)
function storeEdcDeviceId(value: string): void {
  try {
    if (value) localStorage.setItem(EDC_DEVICE_STORAGE_KEY, value);
    else localStorage.removeItem(EDC_DEVICE_STORAGE_KEY);
  } catch {
    // จำไม่ได้ ให้พนักงานเลือกใหม่ครั้งหน้า
  }
}

// Function แปลงจำนวนเงินเป็นข้อความทศนิยม 2 ตำแหน่ง
const formatCurrency = formatMoney;

// Function แปลงช่องจำนวนเงินเป็นตัวเลขทศนิยมไม่เกิน 2 ตำแหน่ง (ผิดรูปแบบ = NaN)
function parseMoneyInput(value: string): number {
  const trimmed = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return Number.NaN;
  return Number(trimmed);
}

// Function สร้าง URL ของ WebSocket ชำระเงิน (browser แนบ cookie เอง backend ตรวจ Origin)
function buildPaymentWebSocketUrl(baseUrl: string, chargeId: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set("chargeId", chargeId);
  return url.toString();
}

// Function แปลงข้อความจาก WebSocket (ไม่ใช่ JSON ที่มี type = null)
function parseSocketMessage(raw: unknown): PaymentSocketMessage | null {
  if (typeof raw !== "string") return null;
  try {
    const data: unknown = JSON.parse(raw);
    return data && typeof data === "object" && typeof (data as { type?: unknown }).type === "string"
      ? (data as PaymentSocketMessage)
      : null;
  } catch {
    return null;
  }
}

// Function อ่าน QR ที่รอจ่ายจาก error 409 PENDING_GATEWAY_CHARGE (amount เป็นสตางค์)
function readPendingGatewayCharge(err: ApiError): PendingGatewayCharge {
  // รายละเอียดอยู่ข้าง message/code อ่านทีละค่าและตรวจ type
  const details = (err.data ?? {}) as Partial<Record<keyof PendingGatewayChargeDetails, unknown>>;
  return {
    chargeId: String(details.chargeId ?? ""),
    amount: Number(details.amount ?? 0),
    expiresAt: typeof details.expiresAt === "string" ? details.expiresAt : null,
    method: String(details.method ?? SCAN_METHOD_ID),
    channel: String(details.channel ?? ADMIN_CHANNEL_CODE),
  };
}

// Function รายการวิธีชำระที่เปิดใช้ qr = สแกนจ่าย PromptPay, cash = เงินสด, card = EDC
function getAvailablePaymentModes(options: AdminPaymentOptions): PaymentMode[] {
  const modes: PaymentMode[] = [];
  if (options.scan.enabled) modes.push("qr");
  if (options.cash.enabled) modes.push("cash");
  if (options.card.enabled) modes.push("card");
  return modes;
}

// Function รวมยอดที่จ่ายแล้วของ transaction
function sumPaidAmount(raw: Transaction): number {
  return raw.payments.reduce((sum, payment) => sum + (payment.paidAmount ?? 0), 0);
}

// Function บวกเวลา 1 หน่วยให้วันที่
function addUnit(date: Date, unit: "year" | "month" | "day" | "hour" | "minute"): Date {
  const next = new Date(date);

  if (unit === "year") next.setFullYear(next.getFullYear() + 1);
  if (unit === "month") next.setMonth(next.getMonth() + 1);
  if (unit === "day") next.setDate(next.getDate() + 1);
  if (unit === "hour") next.setHours(next.getHours() + 1);
  if (unit === "minute") next.setMinutes(next.getMinutes() + 1);

  return next;
}

// Function นับจำนวนหน่วยปฏิทินเต็มที่อยู่ระหว่างสองเวลา
function countCalendarUnit(
  cursor: Date,
  end: Date,
  unit: "year" | "month" | "day" | "hour" | "minute"
): { count: number; cursor: Date } {
  let count = 0;
  let next = addUnit(cursor, unit);

  while (next <= end) {
    count += 1;
    cursor = next;
    next = addUnit(cursor, unit);
  }

  return { count, cursor };
}

// Function แปลงจำนวนนาทีเป็นข้อความระยะเวลา
function formatDurationFromMinutes(totalMinutes: number): string {
  let remaining = Math.max(0, Math.floor(totalMinutes));
  const years = Math.floor(remaining / (365 * 24 * 60));
  remaining -= years * 365 * 24 * 60;
  const months = Math.floor(remaining / (30 * 24 * 60));
  remaining -= months * 30 * 24 * 60;
  const days = Math.floor(remaining / (24 * 60));
  remaining -= days * 24 * 60;
  const hours = Math.floor(remaining / 60);
  const minutes = remaining % 60;

  return formatDurationParts({ years, months, days, hours, minutes });
}

// Function สร้างข้อความระยะเวลาจากปี เดือน วัน ชั่วโมง นาที
function formatDurationParts(parts: {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
}): string {
  const labels = [
    parts.years ? `${parts.years} ปี` : "",
    parts.months ? `${parts.months} เดือน` : "",
    parts.days ? `${parts.days} วัน` : "",
    parts.hours ? `${parts.hours} ชั่วโมง` : "",
    parts.minutes ? `${parts.minutes} นาที` : "",
  ].filter(Boolean);

  return labels.length > 0 ? labels.join(" ") : "0 นาที";
}

// Function สร้างข้อความระยะเวลาจอดของ transaction
function formatParkingDuration(raw: Transaction): string {
  const start = raw.entryAt ? new Date(raw.entryAt) : null;
  const endSource = raw.exitAt ?? raw.calculatedAt;
  const end = endSource ? new Date(endSource) : new Date();

  if (
    !start ||
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end < start
  ) {
    return formatDurationFromMinutes(raw.totalMinutes);
  }

  let cursor = new Date(start);
  const yearsResult = countCalendarUnit(cursor, end, "year");
  cursor = yearsResult.cursor;
  const monthsResult = countCalendarUnit(cursor, end, "month");
  cursor = monthsResult.cursor;
  const daysResult = countCalendarUnit(cursor, end, "day");
  cursor = daysResult.cursor;
  const hoursResult = countCalendarUnit(cursor, end, "hour");
  cursor = hoursResult.cursor;
  const minutesResult = countCalendarUnit(cursor, end, "minute");

  return formatDurationParts({
    years: yearsResult.count,
    months: monthsResult.count,
    days: daysResult.count,
    hours: hoursResult.count,
    minutes: minutesResult.count,
  });
}

// Function แปลง Transaction เป็นข้อมูลที่ dialog แสดง
function normalizeDetail(
  raw: Transaction,
  fallbackId: string
): PaymentDetail {
  const latestPayment = raw.payments.at(-1);
  const paidAmount = raw.totalPaid ?? sumPaidAmount(raw);
  const discountAmount = Math.max(raw.baseAmount - raw.netAmount, 0);

  return {
    id: raw.id ?? fallbackId,
    billNo: raw.billNo,
    plateNo: raw.plateNo,
    durationDisplay: formatParkingDuration(raw),
    baseAmount: raw.baseAmount,
    netAmount: raw.netAmount,
    paidAmount,
    remainingAmount: raw.remainingAmount,
    discountAmount,
    status: raw.status,
    paymentReferences: raw.payments
      .map((payment) => payment.reference)
      .filter((reference): reference is string => Boolean(reference)),
    billableHours: raw.durationHour,
    feeBreakdown: raw.feeBreakdown ?? null,

    payment: {
      method: latestPayment?.method ?? null,
      qrCodeText: raw.qrData || null,
      qrCodeImageUrl: null,
    },

    receiptPreview: {
      printableText: null,
      canPrint: false,
    },
  };
}

/* -------------------------------------- Component -------------------------------------- */

// Function dialog รับชำระเงินสด QR PromptPay และบัตร EDC รอผล QR ผ่าน WebSocket
function PaymentModal({
  open,
  transactionId,
  transaction,
  onClose,
  onSuccess,
}: PaymentModalProps): JSX.Element | null {
  const [detail, setDetail] = useState<PaymentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<PaymentMode>("qr");
  const [printReceipt, setPrintReceipt] = useState(true);
  const [cashReceived, setCashReceived] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [availableMethods, setAvailableMethods] = useState<PaymentMode[]>([]);
  const [paymentOptions, setPaymentOptions] =
    useState<AdminPaymentOptions>(NO_ADMIN_PAYMENT_OPTIONS);
  const [omiseCharge, setOmiseCharge] = useState<ActiveCharge | null>(null);
  const [qrRequested, setQrRequested] = useState(false);
  const [qrRequestKey, setQrRequestKey] = useState(0);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState("");
  const [qrImageObjectUrl, setQrImageObjectUrl] = useState("");
  const [paymentVerifyError, setPaymentVerifyError] = useState("");
  // จ่ายบางส่วน (เฉพาะแอดมิน) ปิด = จ่ายยอดค้างทั้งหมด
  const [partialPayment, setPartialPayment] = useState(false);
  const [payAmountInput, setPayAmountInput] = useState("");
  const [payAmountError, setPayAmountError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [pendingChargeDialog, setPendingChargeDialog] = useState<PendingChargeDialog | null>(null);
  // ตั้งเมื่อแอดมินกด "รับเงินสด" เท่านั้น ใช้ได้กับการส่งครั้งเดียว
  const confirmPendingChargeRef = useRef(false);
  const [scanAlert, setScanAlert] = useState<ScanAlert | null>(null);
  // charge ที่ให้ backend ตรวจอีกครั้งแล้วหลัง QR หมดอายุ
  const autoVerifiedChargeRef = useRef<string | null>(null);
  // ชำระด้วยบัตร EDC
  const [cardReference, setCardReference] = useState("");
  const [edcTerminals, setEdcTerminals] = useState<EdcTerminal[]>([]);
  const [edcTerminalsError, setEdcTerminalsError] = useState("");
  const [edcDeviceId, setEdcDeviceId] = useState(() => readStoredEdcDeviceId());
  const [cardAmountInput, setCardAmountInput] = useState("");
  const [cardFieldError, setCardFieldError] = useState("");
  // สีแดง: ยอดที่รูดไม่ถูกบันทึก ต้อง void ที่เครื่อง EDC
  const [cardAlert, setCardAlert] = useState("");
  const [cardSuccess, setCardSuccess] = useState("");
  // ไม่รู้ผลของ request (เน็ต/5xx) ต้องตรวจก่อนให้ส่งใหม่
  const [cardNeedsVerify, setCardNeedsVerify] = useState(false);
  const paymentSocketRef = useRef<WebSocket | null>(null);
  const paymentFinalizedRef = useRef(false);
  // โหลดรายละเอียดครั้งถัดไปห้ามสร้าง QR อัตโนมัติ (ให้แอดมินเลือกเอง)
  const suppressAutoQrRef = useRef(false);
  const submittingRef = useRef(false);
  const loadedTransactionIdRef = useRef<string | null>(null);
  const modeRef = useRef<PaymentMode>("qr");
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // โหลดใหม่ทุกครั้ง เพราะแอดมินอาจแก้การตั้งค่าระหว่างเปิดหน้านี้
  async function loadPaymentSettings() {
    const result = await getPaymentMethods();

    const options = resolveAdminPaymentOptions(result);
    // card มีในรายการเมื่อมีเครื่อง EDC เคาน์เตอร์ที่ใช้ได้อย่างน้อยหนึ่งเครื่อง
    if (options.card.enabled) void loadEdcTerminals();
    const modes = getAvailablePaymentModes(options);
    setPaymentOptions(options);
    setAvailableMethods(modes);
    return modes;
  }

  // ได้ payment_settings_updated จาก stream คืนเงิน ให้โหลดวิธีชำระใหม่
  const { paymentSettingsVersion } = useRefundAlerts();
  const seenSettingsVersionRef = useRef(paymentSettingsVersion);

  useEffect(() => {
    if (seenSettingsVersionRef.current === paymentSettingsVersion) return;
    seenSettingsVersionRef.current = paymentSettingsVersion;
    if (!open || !detail) return;

    void (async () => {
      try {
        const modes = await loadPaymentSettings();
        if (modes.includes(modeRef.current)) return;

        if (modeRef.current === "card") {
          // ปิดรับบัตรแล้ว ห้ามรูดเครื่อง EDC
          setNotice("การรับบัตรถูกปิดแล้ว ห้ามรูดเครื่อง EDC หากรูดไปแล้วกรุณายกเลิกรายการ (void) ที่เครื่อง EDC");
        } else {
          setNotice("วิธีชำระเงินที่เลือกถูกปิดใช้งานแล้ว");
        }
        if (modeRef.current === "qr") {
          closePaymentSocket();
          setOmiseCharge(null);
          setQrRequested(false);
        }
        if (modes[0]) setMode(modes[0]);
      } catch {
        // คงปุ่มเดิมไว้ backend ยังปฏิเสธวิธีที่ปิดอยู่ดี
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react to the stream signal only
  }, [paymentSettingsVersion]);

  async function loadEdcTerminals() {
    try {
      setEdcTerminalsError("");
      const list: EdcTerminal[] = (await getEdcTerminals()).data ?? [];
      setEdcTerminals(list);

      // เครื่องที่จำไว้ถูกลบหรือปิด ให้ลืมแล้วเลือกใหม่
      setEdcDeviceId((current) => {
        if (current && list.some((terminal) => terminal.deviceId === current)) return current;
        const next = list.length === 1 ? list[0].deviceId : "";
        storeEdcDeviceId(next);
        return next;
      });
      return list;
    } catch (err) {
      setEdcTerminalsError(getErrorMessage(err, "โหลดรายการเครื่อง EDC ไม่สำเร็จ"));
      return null;
    }
  }

  // 400 PAYMENT_SELECTION_INVALID วิธีชำระถูกปิดหรือลบระหว่างนั้น
  async function handlePaymentSelectionInvalid(reason: string) {
    setError(`วิธีชำระเงินนี้ถูกปิดใช้งาน (${reason})`);
    try {
      const modes = await loadPaymentSettings();
      if (!modes.includes(mode)) {
        closePaymentSocket();
        setOmiseCharge(null);
        setQrError("");
        setQrRequested(false);
        if (modes[0]) setMode(modes[0]);
      }
    } catch {
      // คงข้อความ error และปุ่มเดิมไว้
    }
  }

  const qrExpiresAtMs = omiseCharge?.expiresAt ? Date.parse(omiseCharge.expiresAt) : NaN;
  const qrMsLeft = Number.isNaN(qrExpiresAtMs) ? null : qrExpiresAtMs - now;
  const qrExpired = qrMsLeft !== null && qrMsLeft <= 0;

  // QR หมดอายุโดยไม่มีผลจาก WebSocket ให้ตรวจอีกครั้งหลังหมดอายุสักครู่ (Omise อาจยังตอบ pending)
  useEffect(() => {
    const chargeId = omiseCharge?.chargeId;
    if (!open || !qrExpired || !chargeId || paymentFinalizedRef.current) return;
    if (autoVerifiedChargeRef.current === chargeId) return;
    const timer = window.setTimeout(() => {
      if (paymentFinalizedRef.current) return;
      autoVerifiedChargeRef.current = chargeId;
      void verifyExpiredCharge(chargeId);
    }, EXPIRED_QR_VERIFY_DELAY_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per expired charge
  }, [open, qrExpired, omiseCharge?.chargeId]);

  // นาฬิกานับถอยหลังของ QR ทุก 1 วินาที เฉพาะตอนมี QR
  useEffect(() => {
    if (!open || Number.isNaN(qrExpiresAtMs)) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [open, qrExpiresAtMs]);

  function formatCountdown(ms: number) {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  function getMinutesLeft(expiresAt: string | null) {
    const time = expiresAt ? Date.parse(expiresAt) : NaN;
    if (Number.isNaN(time)) return null;
    return Math.max(1, Math.ceil((time - Date.now()) / 60_000));
  }

  // QR บนหน้าจอที่ลูกค้ายังจ่ายได้
  function getActivePendingCharge(): PendingGatewayCharge | null {
    if (!omiseCharge?.chargeId || qrExpired) return null;
    if (omiseCharge.status && omiseCharge.status !== "pending") return null;
    return {
      chargeId: omiseCharge.chargeId,
      amount: omiseCharge.amount,
      expiresAt: omiseCharge.expiresAt ?? null,
      method: omiseCharge.method,
      channel: omiseCharge.channel,
    };
  }

  // เปลี่ยนเป็นเงินสดระหว่างที่ QR ยังใช้ได้ ให้เตือนทันที
  function handleSelectCashMode() {
    const pending = getActivePendingCharge();
    if (mode === "qr" && pending) {
      setPendingChargeDialog({ ...pending, next: "switch_to_cash" });
      return;
    }
    setMode("cash");
  }

  // เลือกบัตรระหว่างที่ QR ยังใช้ได้ ให้เตือนก่อนรูดบัตร
  function handleSelectCardMode() {
    const pending = getActivePendingCharge();
    if (pending && !confirmPendingChargeRef.current) {
      setPendingChargeDialog({ ...pending, next: "switch_to_card" });
      return;
    }
    setMode("card");
  }

  function handleConfirmCashWithPendingCharge() {
    const dialog = pendingChargeDialog;
    if (!dialog) return;
    setPendingChargeDialog(null);
    confirmPendingChargeRef.current = true;

    if (dialog.next === "switch_to_cash") {
      setMode("cash");
      return;
    }
    if (dialog.next === "switch_to_card") {
      setMode("card");
      return;
    }
    if (dialog.next === "resubmit_card") {
      void handleConfirmCardPayment();
      return;
    }
    void handleConfirmPayment();
  }

  // กดยกเลิก กลับไปที่ QR ที่รอจ่าย (อาจสร้างจากที่อื่น)
  function handleCancelCashWithPendingCharge() {
    const dialog = pendingChargeDialog;
    setPendingChargeDialog(null);
    confirmPendingChargeRef.current = false;
    if (!dialog) return;

    if (omiseCharge?.chargeId !== dialog.chargeId && detail) {
      setQrError("");
      setOmiseCharge({
        chargeId: dialog.chargeId,
        status: "pending",
        amount: dialog.amount,
        method: dialog.method,
        channel: ADMIN_CHANNEL_CODE,
        expiresAt: dialog.expiresAt,
      });
    }
    setMode("qr");
  }

  // สแกนจ่ายแล้วต้องคืนเงิน คง dialog ไว้ให้แอดมินเห็น และโหลดรายการใหม่
  function handleScanRefundRequired(event: PaymentUpdatedEvent) {
    const refundBaht = formatCurrency(satangToBaht(event.refundAmount));
    const reasonLabel = event.refundReason
      ? REFUND_REASON_LABELS[event.refundReason] ?? event.refundReason
      : "";

    setScanAlert(
      event.applied === false
        ? {
          tone: "danger",
          message: `ลูกค้าจ่าย QR ซ้ำ ${refundBaht} บาท กรุณาคืนเงินลูกค้า${reasonLabel ? ` (${reasonLabel})` : ""}`,
        }
        : {
          tone: "warning",
          message: `ได้รับเงินเกิน ${refundBaht} บาท กรุณาคืนเงินลูกค้า`,
        }
    );
    suppressAutoQrRef.current = true;
    void Promise.resolve(onSuccess());
    setReloadKey((value) => value + 1);
  }

  // ปกติผลมาทาง WebSocket จาก webhook ของ Omise ถ้าหมดอายุแล้วยังไม่มีผล ให้ backend ตรวจอีกครั้ง
  async function verifyExpiredCharge(chargeId: string) {
    try {
      // ได้ pending ให้หยุด (ไม่วนซ้ำ) ผลจริงจะมาทาง payment_updated
      const { action } = await verifyCharge(chargeId);
      if (action === "already_processed") {
        // บันทึกไปก่อนแล้ว จะไม่มี event ใหม่ ให้โหลดใหม่
        suppressAutoQrRef.current = true;
        void Promise.resolve(onSuccess());
        setReloadKey((value) => value + 1);
      }
    } catch {
      // ไม่ต้องทำอะไรต่อ แสดง QR ที่หมดอายุและให้สร้างใหม่ได้
    }
  }

  // สแกนจ่ายสำเร็จแต่ค่าจอดเพิ่มระหว่างนั้น แสดงยอดคงเหลือให้เก็บต่อด้วย QR ใหม่หรือเงินสด
  function handleScanPartiallyPaid(remainingAmount: number) {
    setNotice(
      `รับชำระผ่าน QR แล้ว แต่ยังมียอดคงเหลือ ${formatCurrency(remainingAmount)} บาท (ค่าบริการเพิ่มระหว่างสแกน) กรุณารับส่วนที่เหลือโดยสร้าง QR ใหม่หรือรับเงินสด`
    );
    suppressAutoQrRef.current = true;
    void Promise.resolve(onSuccess());
    setReloadKey((value) => value + 1);
  }

  function closePaymentSocket() {
    paymentSocketRef.current?.close();
    paymentSocketRef.current = null;
  }

  function handleCreatePromptPayQr() {
    closePaymentSocket();
    paymentFinalizedRef.current = false;
    setQrError("");
    setPaymentVerifyError("");
    setOmiseCharge(null);
    setQrImageObjectUrl("");
    setQrRequested(true);
    setQrRequestKey((value) => value + 1);
  }

  function handleSelectQrMode() {
    setMode("qr");

    if (!omiseCharge && !qrLoading) {
      handleCreatePromptPayQr();
    }
  }

  useEffect(() => {
    if (!open || !transactionId) return;

    let ignore = false;
    const activeTransactionId = transactionId;
    // GET /transactions/:plateNo ค้นด้วยทะเบียน ไม่ใช่ id
    const plateNo = transaction?.plateNo?.trim();

    async function fetchDetail() {
      try {
        setLoading(true);
        setError("");
        setQrError("");
        setPaymentVerifyError("");
        setOmiseCharge(null);
        setQrImageObjectUrl("");
        paymentFinalizedRef.current = false;
        setQrRequested(!suppressAutoQrRef.current);
        suppressAutoQrRef.current = false;
        setQrRequestKey((value) => value + 1);
        setDetail(null);
        setCashReceived("0");
        setPartialPayment(false);
        setPayAmountInput("");
        setPayAmountError("");
        closePaymentSocket();

        let settingsError = "";
        const settingsPromise = loadPaymentSettings().catch((err: unknown) => {
          settingsError = getErrorMessage(err, "โหลดการตั้งค่าวิธีชำระเงินไม่สำเร็จ");
          setPaymentOptions(NO_ADMIN_PAYMENT_OPTIONS);
          setAvailableMethods([]);
          return [] as PaymentMode[];
        });

        if (!plateNo) {
          throw new Error("ไม่พบเลขทะเบียนของรายการนี้");
        }

        const json = await getTransactionByPlate(plateNo);
        const normalized = normalizeDetail(json, activeTransactionId);
        const allowed = await settingsPromise;

        if (!ignore) {
          setDetail(normalized);
          setCardAmountInput(String(normalized.remainingAmount));
          if (settingsError) setError(settingsError);
          // โหลดรายการเดิมซ้ำให้คงวิธีชำระเดิม ข้อความสำเร็จหรือ void จะยังแสดงอยู่
          const isReload = loadedTransactionIdRef.current === activeTransactionId;
          loadedTransactionIdRef.current = activeTransactionId;
          const preferredMode: PaymentMode =
            isReload
              ? modeRef.current
              : normalized.payment.method === "cash"
                ? "cash"
                : normalized.payment.method === CARD_METHOD_ID
                  ? "card"
                  : "qr";
          setMode(allowed.includes(preferredMode) ? preferredMode : allowed[0] ?? "qr");
          setCashReceived("0");
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchDetail();

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the modal opens/reloads
  }, [open, reloadKey, transaction?.plateNo, transactionId]);

  useEffect(() => {
    if (open) return;
    setNotice("");
    setScanAlert(null);
    setPendingChargeDialog(null);
    confirmPendingChargeRef.current = false;
    loadedTransactionIdRef.current = null;
    setCardReference("");
    setCardFieldError("");
    setCardAlert("");
    setCardSuccess("");
    setCardNeedsVerify(false);
  }, [open]);

  useEffect(() => {
    if (!open || mode !== "qr" || !detail || detail.remainingAmount <= 0) return;
    if (!qrRequested || qrRequestKey === 0) return;
    if (!availableMethods.includes("qr")) return;
    if (omiseCharge || qrLoading) return;

    let cancelled = false;
    const activeDetail = detail;

    async function createOmiseCharge() {
      try {
        setQrLoading(true);
        setQrError("");

        // backend สร้าง source และคำนวณยอดเอง ส่งแค่ transaction และ method promptpay
        const { charge } = await createCharge({
          transactionId: activeDetail.id,
          method: SCAN_METHOD_ID,
        });

        if (!cancelled) {
          setOmiseCharge(charge);
          // QR เป็นยอดค้าง ณ ตอนสร้าง (บาท)
          const balance = charge.transaction?.remainingAmount;
          if (typeof balance === "number" && balance !== activeDetail.remainingAmount) {
            setDetail((prev) => (prev ? { ...prev, remainingAmount: balance } : prev));
          }
        }
      } catch (err) {
        if (cancelled) return;

        // backend ตรวจการตั้งค่าก่อนสร้าง charge จึงยังไม่มี QR
        if (isApiErrorCode(err, "PAYMENT_SELECTION_INVALID")) {
          setQrError(err.message);
          void handlePaymentSelectionInvalid(err.message);
          return;
        }

        // ไม่มียอดค้างหรือรายการปิดไปแล้ว ให้โหลดใหม่
        if (isApiErrorCode(err, "NO_REMAINING_AMOUNT", "TRANSACTION_NOT_PAYABLE")) {
          setNotice(err.message);
          suppressAutoQrRef.current = true;
          void Promise.resolve(onSuccess());
          setReloadKey((value) => value + 1);
          return;
        }

        // ยอดเปลี่ยนหลังโหลดรายละเอียด ให้โหลดใหม่แล้วสร้าง QR ยอดปัจจุบัน
        if (isApiErrorCode(err, "AMOUNT_MISMATCH")) {
          setNotice("ยอดชำระเปลี่ยนแล้ว ระบบโหลดยอดล่าสุดให้แล้ว กรุณาสร้าง QR ใหม่");
          suppressAutoQrRef.current = true;
          setReloadKey((value) => value + 1);
          return;
        }

        {
          setQrError(getErrorMessage(err, "สร้าง QR PromptPay ไม่สำเร็จ"));
        }
      } finally {
        if (!cancelled) {
          setQrLoading(false);
        }
      }
    }

    void createOmiseCharge();

    return () => {
      cancelled = true;
    };
  }, [availableMethods, detail, mode, omiseCharge, open, qrRequestKey, qrRequested]);

  useEffect(() => {
    if (!open || mode !== "qr" || !omiseCharge?.chargeId) {
      setQrImageObjectUrl("");
      return;
    }

    let cancelled = false;
    let objectUrl = "";

    async function loadQrImage() {
      try {
        if (!omiseCharge?.chargeId) return;

        const blob = await getChargeQrImage(omiseCharge.chargeId);
        objectUrl = URL.createObjectURL(blob);

        if (!cancelled) {
          setQrImageObjectUrl(objectUrl);
        }
      } catch (err) {
        if (!cancelled) {
          setQrError(getErrorMessage(err, "โหลดรูป QR ไม่สำเร็จ"));
        }
      }
    }

    setQrImageObjectUrl("");
    void loadQrImage();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [mode, omiseCharge, open]);

  useEffect(() => {
    // ไม่ผูกกับ mode เพราะลูกค้าอาจจ่าย QR ระหว่างแอดมินอยู่หน้าเงินสด
    if (!open || !omiseCharge?.chargeId) return;

    let cancelled = false;
    let reconnectAttempt = 0;
    let reconnectTimer: number | undefined;
    // refresh ได้ครั้งเดียวต่อการถูกปฏิเสธ ถูกปฏิเสธติดกัน 2 ครั้งจึงจบ session
    let tokenRefreshed = false;
    const activeCharge = omiseCharge;

    async function connectPaymentSocket() {
      try {
        const paymentWebSocketUrl = getPaymentWebSocketUrl();

        if (!paymentWebSocketUrl) {
          throw new Error("ไม่พบการตั้งค่าการเชื่อมต่อสถานะการชำระเงิน");
        }

        closePaymentSocket();
        const socket = new WebSocket(buildPaymentWebSocketUrl(paymentWebSocketUrl, activeCharge.chargeId));
        paymentSocketRef.current = socket;

        socket.onmessage = (message) => {
          const data = parseSocketMessage(message.data);

          if (data?.type === "error") {
            setPaymentVerifyError(data.message || "การเชื่อมต่อสถานะการชำระเงินผิดพลาด");
            return;
          }
          if (data?.type !== "payment_updated") return;
          if (data.chargeId !== activeCharge.chargeId) return;

          if (data.paymentStatus === "successful") {
            if (paymentFinalizedRef.current) return;

            paymentFinalizedRef.current = true;
            closePaymentSocket();

            if (data.refundRequired || data.applied === false) {
              handleScanRefundRequired(data);
              return;
            }

            if (data.transactionStatus === "partially_paid" && (data.remainingAmount ?? 0) > 0) {
              handleScanPartiallyPaid(data.remainingAmount ?? 0);
              return;
            }

            void Promise.resolve(onSuccess()).finally(onClose);
            return;
          }

          if (data.paymentStatus === "expired") {
            closePaymentSocket();
            setQrError("QR หมดอายุ");
            return;
          }

          if (data.paymentStatus === "failed" || data.paymentStatus === "reversed") {
            closePaymentSocket();
            setQrError("การชำระผ่าน QR ไม่สำเร็จ");
          }
        };

        socket.onopen = () => {
          reconnectAttempt = 0;
          tokenRefreshed = false;
          setPaymentVerifyError("");
        };

        socket.onerror = () => {
          setPaymentVerifyError(
            "กำลังรอตรวจสอบสถานะการชำระเงิน หากชำระแล้วระบบจะปิดรายการให้อัตโนมัติ"
          );
        };

        // หลุดแล้วต่อใหม่ backend ส่งสถานะล่าสุดตอนต่อ จึงไม่พลาดผลระหว่างหลุด (ปิดเองไม่เข้ามาที่นี่)
        socket.onclose = (event) => {
          if (cancelled || paymentSocketRef.current !== socket || paymentFinalizedRef.current) return;
          paymentSocketRef.current = null;

          // ไม่ต่อใหม่ เพราะต่อใหม่ก็ไม่หาย
          if (event.code === WS_CLOSE_FORBIDDEN) {
            if (event.reason === "origin_not_allowed") {
              // ปัญหาการตั้งค่า ADMIN_ORIGINS ของ API ไม่ใช่สิทธิ์ของผู้ใช้
              setPaymentVerifyError("ระบบไม่อนุญาตให้เว็บไซต์นี้รับสถานะการชำระเงิน กรุณาติดต่อผู้ดูแลระบบ");
              return;
            }
            setPaymentVerifyError("บัญชีนี้ไม่มีสิทธิ์รับชำระเงิน");
            window.dispatchEvent(new CustomEvent(FORBIDDEN_EVENT));
            return;
          }

          if (event.code === WS_CLOSE_UNAUTHORIZED) {
            // access cookie หมดอายุหรือผิด ให้ refresh แล้วต่อใหม่ 1 ครั้ง
            if (event.reason === "invalid_token" && !tokenRefreshed) {
              tokenRefreshed = true;
              refreshSession().then(
                () => void connectPaymentSocket(),
                () => undefined // refresh ถูกปฏิเสธ session.ts จบ session แล้ว
              );
              return;
            }
            // session จบแล้ว ไปหน้า login
            handleSessionRevoked(event.reason === "invalid_token" ? "session_expired" : event.reason);
            return;
          }

          // ไม่ใช่การถูกปฏิเสธเรื่อง auth (API restart, เน็ต) เริ่มนับใหม่
          tokenRefreshed = false;
          setPaymentVerifyError("การเชื่อมต่อหลุด กำลังเชื่อมต่อใหม่เพื่อรอผลการชำระเงิน...");
          scheduleReconnect();
        };
      } catch (err) {
        if (cancelled) return;
        // ไม่ได้ตั้ง NEXT_PUBLIC_API_BASE_URL หรือ URL ผิด ต่อใหม่ก็ไม่หาย
        setPaymentVerifyError(getErrorMessage(err, "กำลังรอตรวจสอบสถานะการชำระเงิน"));
      }
    }

    // รอ 1, 2, 5, 10 วินาที แล้วทุก 30 วินาทีตลอดที่ QR ยังเปิดอยู่
    function scheduleReconnect() {
      if (cancelled || paymentFinalizedRef.current) return;
      const delay =
        PAYMENT_WS_RECONNECT_DELAYS_MS[
          Math.min(reconnectAttempt, PAYMENT_WS_RECONNECT_DELAYS_MS.length - 1)
        ];
      reconnectAttempt += 1;
      window.clearTimeout(reconnectTimer);
      reconnectTimer = window.setTimeout(() => void connectPaymentSocket(), delay);
    }

    void connectPaymentSocket();

    return () => {
      cancelled = true;
      window.clearTimeout(reconnectTimer);
      closePaymentSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one socket per charge
  }, [omiseCharge?.chargeId, onClose, onSuccess, open]);

  useEffect(() => {
    if (!open) {
      closePaymentSocket();
    }

    return () => {
      closePaymentSocket();
    };
  }, [open]);

  const receivedAmount = Number(cashReceived || 0);

  // ยอดที่จ่ายครั้งนี้ ยอดที่กรอกเมื่อจ่ายบางส่วน หรือยอดค้างทั้งหมด
  const payAmount = useMemo(() => {
    if (!detail) return 0;
    if (!partialPayment) return detail.remainingAmount;
    const parsed = parseMoneyInput(payAmountInput);
    return Number.isNaN(parsed) ? 0 : parsed;
  }, [detail, partialPayment, payAmountInput]);

  const changeAmount = useMemo(() => {
    return receivedAmount > payAmount ? receivedAmount - payAmount : 0;
  }, [receivedAmount, payAmount]);

  function validatePayAmount() {
    if (!partialPayment) return "";
    const parsed = parseMoneyInput(payAmountInput);
    // ตรวจแค่รูปแบบตัวเลข กติกายอดเงิน backend ตรวจ
    if (Number.isNaN(parsed)) return "กรุณากรอกจำนวนเงินให้ถูกต้อง (ทศนิยมไม่เกิน 2 ตำแหน่ง)";
    return "";
  }

  function handleTogglePartialPayment() {
    setPartialPayment((prev) => !prev);
    setPayAmountInput(detail ? String(detail.remainingAmount) : "");
    setPayAmountError("");
  }

  async function submitAdminPayment(
    paymentMethod: "cash" | "promptpay" | "qr",
    confirmPendingCharge: boolean
  ) {
    if (!detail) {
      throw new Error("Missing transaction detail");
    }

    // POST /transactions/:plateNo/payment ต้องใช้ทะเบียนเต็ม
    if (!detail.plateNo) {
      throw new Error("ไม่พบเลขทะเบียนของรายการนี้");
    }

    // ไม่ส่ง amount = จ่ายยอดค้างที่ backend คำนวณตอนจ่าย (อาจเพิ่มขึ้นหลังโหลดรายละเอียด)
    const payload: AdminPaymentRequest = {
      method: paymentMethod,
      channel: ADMIN_CHANNEL_CODE,
      ...(partialPayment ? { amount: parseMoneyInput(payAmountInput) } : {}),
      // ส่งเฉพาะหลังแอดมินกด "รับเงินสด" ใน dialog QR ที่รอจ่าย
      ...(confirmPendingCharge ? { confirmPendingCharge: true } : {}),
    };

    return payTransaction(detail.plateNo, payload);
  }

  function finishCardSuccess(reference: string, result: AdminPaymentResponse | null) {
    const recordedReference = result?.data?.payment?.reference ?? reference;
    const remaining = result?.data?.amount?.remainingAmount;
    setCardNeedsVerify(false);
    setCardAlert("");
    setCardReference("");
    setCardSuccess(
      result?.data?.transaction?.status === "partially_paid" && typeof remaining === "number"
        ? `บันทึกรับชำระด้วยบัตรแล้ว เลขอ้างอิง ${recordedReference} คงเหลือ ${formatCurrency(remaining)} บาท`
        : `รับชำระด้วยบัตรสำเร็จ เลขอ้างอิง ${recordedReference}`
    );
    suppressAutoQrRef.current = true;
    void Promise.resolve(onSuccess());
    setReloadKey((value) => value + 1);
  }

  // หลังเน็ตมีปัญหาหรือ 5xx ไม่รู้ว่าบันทึกแล้วหรือยัง ให้โหลดรายการแล้วหา reference นี้ก่อน ห้ามส่งซ้ำ
  async function verifyCardPayment(reference: string) {
    if (!detail) return;
    try {
      setSubmitting(true);
      const json = await getTransactionByPlate(detail.plateNo);

      const recorded = json.payments.some(
        (payment) =>
          payment.reference === reference &&
          (!payment.edcDeviceId || payment.edcDeviceId === edcDeviceId)
      );
      if (recorded) {
        finishCardSuccess(reference, null);
        return;
      }

      setCardNeedsVerify(false);
      setCardAlert("");
      setError(`ยังไม่พบการบันทึกบัตรเลขอ้างอิง ${reference} ในระบบ กดยืนยันอีกครั้งเพื่อบันทึกได้`);
    } catch {
      setError("ตรวจสอบรายการไม่ได้ กรุณาตรวจสอบเครือข่ายแล้วกด \"ตรวจสอบการบันทึก\" อีกครั้ง (ห้ามรูดบัตรซ้ำ)");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmCardPayment() {
    if (!detail || submittingRef.current) return;

    const reference = cardReference.trim();
    if (cardNeedsVerify) {
      await verifyCardPayment(reference);
      return;
    }

    // ต้องเท่ากับยอดที่รูด ตรวจแค่รูปแบบตัวเลข ที่เหลือ backend ตรวจ
    const amount = parseMoneyInput(cardAmountInput);
    if (Number.isNaN(amount)) {
      setCardFieldError("กรุณากรอกยอดที่รูดบัตรให้ถูกต้อง (ทศนิยมไม่เกิน 2 ตำแหน่ง)");
      return;
    }

    const confirmPendingCharge = confirmPendingChargeRef.current;
    confirmPendingChargeRef.current = false;
    submittingRef.current = true;
    setSubmitting(true);
    setError("");
    setCardFieldError("");
    setCardAlert("");
    setCardSuccess("");

    try {
      const payload: AdminPaymentRequest = {
        method: CARD_METHOD_ID,
        channel: ADMIN_CHANNEL_CODE,
        amount,
        reference,
        // backend เติม TID จากเครื่องที่ลงทะเบียนนี้
        edcDeviceId,
        ...(confirmPendingCharge ? { confirmPendingCharge: true } : {}),
      };

      let result: AdminPaymentResponse;
      try {
        result = await payTransaction(detail.plateNo, payload);
      } catch (err) {
        // ไม่มีคำตอบหรือ 5xx ไม่รู้ว่าบันทึกแล้วหรือยัง ให้ตรวจก่อน
        if (!(err instanceof ApiError) || err.status >= 500) {
          setCardNeedsVerify(true);
          if (!(err instanceof ApiError)) {
            setError("ไม่ได้รับผลตอบกลับจากระบบ ห้ามกดบันทึกซ้ำทันที กำลังตรวจสอบรายการ...");
          }
          submittingRef.current = false;
          await verifyCardPayment(reference);
          return;
        }
        throw err;
      }

      finishCardSuccess(reference, result);
    } catch (err) {
      // 409 มี QR รอจ่ายอยู่ ให้ถามก่อนแล้วส่งใหม่พร้อม confirmPendingCharge
      if (isApiErrorCode(err, "PENDING_GATEWAY_CHARGE")) {
        setPendingChargeDialog({ ...readPendingGatewayCharge(err), next: "resubmit_card" });
        return;
      }

      // เลขอ้างอิงบน slip ผิดหรือซ้ำ แก้แล้วส่งใหม่ได้ (รูดใหม่จะได้เลขใหม่)
      if (
        err instanceof ApiError &&
        (err.code === "PAYMENT_REFERENCE_USED" ||
          err.code === "PAYMENT_REFERENCE_REQUIRED" ||
          err.code === "VALIDATION_ERROR")
      ) {
        const fields = getFieldErrors(err);
        setCardFieldError(fields.reference ?? fields.edcDeviceId ?? err.message);
        return;
      }

      // เครื่อง EDC ที่เลือกใช้ไม่ได้ ให้โหลดรายการใหม่และเลือกเครื่องที่รูดจริง
      if (err instanceof ApiError && err.code && EDC_SELECTION_ERRORS.has(err.code)) {
        setCardFieldError(
          `${err.message} ถ้ารูดบัตรไปแล้ว ให้เลือกเครื่องที่ใช้รูดจริงแล้วยืนยันอีกครั้ง หากเครื่องนั้นถูกปิดใช้งาน กรุณายกเลิกรายการ (void) ที่เครื่อง EDC`
        );
        void loadEdcTerminals();
        return;
      }

      // ถูกปฏิเสธหลังเครื่อง EDC อนุมัติแล้ว เงินไม่ผ่าน Omise จึงคืนอัตโนมัติไม่ได้ ต้อง void
      const reason = getErrorMessage(err, "บันทึกการรับชำระด้วยบัตรไม่สำเร็จ");
      setCardAlert(
        `ระบบไม่ได้บันทึกยอดนี้ (${reason}) กรุณายกเลิกรายการ (void) ที่เครื่อง EDC เลขอ้างอิง ${reference}`
      );
      suppressAutoQrRef.current = true;
      void Promise.resolve(onSuccess());
      setReloadKey((value) => value + 1);
      if (err instanceof ApiError && err.code === "PAYMENT_SELECTION_INVALID") {
        void handlePaymentSelectionInvalid(err.message);
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function handleConfirmPayment() {
    if (!detail) return;
    // กันกดซ้ำเร็ว ๆ แล้วส่ง 2 ครั้ง
    if (submittingRef.current) return;
    submittingRef.current = true;

    try {
      setSubmitting(true);
      setError("");

      if (!availableMethods.includes(mode)) {
        throw new Error("ช่องทางชำระเงินนี้ไม่ได้เปิดใช้งาน");
      }

      if (mode === "qr") {
        throw new Error(qrError || "รอตรวจสอบการชำระเงินจาก Omise");
      }

      const amountError = validatePayAmount();
      setPayAmountError(amountError);
      if (amountError) return;

      if (mode === "cash" && receivedAmount < payAmount) {
        throw new Error("จำนวนเงินรับน้อยกว่ายอดชำระ");
      }

      // การยืนยันหนึ่งครั้งใช้กับการส่งครั้งเดียว
      const confirmPendingCharge = confirmPendingChargeRef.current;
      confirmPendingChargeRef.current = false;

      const result = await submitAdminPayment(CASH_METHOD_ID, confirmPendingCharge);
      const nextStatus = result?.data?.transaction?.status;

      await onSuccess();

      if (nextStatus === "partially_paid") {
        // ยังมียอดค้าง อยู่หน้าเดิมและโหลดยอดใหม่
        setNotice(
          `บันทึกการชำระ ${formatCurrency(result?.data?.payment?.paidAmount ?? payAmount)} บาทแล้ว คงเหลือ ${formatCurrency(result?.data?.amount?.remainingAmount ?? 0)} บาท`
        );
        setReloadKey((value) => value + 1);
        return;
      }

      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === "AMOUNT_EXCEEDS_REMAINING") {
        const remaining = Number(err.detail("remainingAmount"));
        if (Number.isFinite(remaining)) {
          setDetail((prev) => (prev ? { ...prev, remainingAmount: remaining } : prev));
          setPartialPayment(true);
          setPayAmountInput(String(remaining));
          setPayAmountError(
            `${err.message} (ยอดคงเหลือ ${formatCurrency(remaining)} บาท เติมยอดให้แล้ว)`
          );
          return;
        }
      }

      if (err instanceof ApiError && err.code === "PAYMENT_SELECTION_INVALID") {
        await handlePaymentSelectionInvalid(err.message);
        return;
      }

      // 409 ยังมี QR รอจ่าย ให้ถามแอดมิน ห้ามยืนยันเอง
      if (isApiErrorCode(err, "PENDING_GATEWAY_CHARGE")) {
        setPendingChargeDialog({ ...readPendingGatewayCharge(err), next: "resubmit_cash" });
        return;
      }

      if (err instanceof ApiError && err.code === "NO_REMAINING_AMOUNT") {
        setNotice("รายการนี้ชำระครบแล้ว");
        suppressAutoQrRef.current = true;
        void Promise.resolve(onSuccess());
        setReloadKey((value) => value + 1);
        return;
      }

      if (err instanceof ApiError && err.code === "INVALID_AMOUNT") {
        setPayAmountError(err.message);
        return;
      }

      setError(getErrorMessage(err, "ไม่สามารถยืนยันการชำระเงินได้"));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-[#2E3445]/90 px-3 py-3 backdrop-blur-[2px] sm:px-5 sm:py-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[calc(100dvh-24px)] w-full max-w-[944px] overflow-y-auto rounded-[30px] bg-white p-3 shadow-2xl sm:rounded-[40px] sm:p-4 lg:overflow-hidden lg:p-5"
        onClick={(event) => event.stopPropagation()}
      >
        {loading ? (
          <div className="py-20 text-center text-[#64748B]">
            กำลังโหลดข้อมูล...
          </div>
        ) : error && !detail ? (
          <div className="py-20 text-center text-red-600">{error}</div>
        ) : detail ? (
          <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="flex min-h-[460px] flex-col bg-[#F5F6F7] px-6 py-7 sm:px-8 lg:h-[560px] lg:min-h-0 lg:overflow-y-auto lg:px-8 lg:py-8">
              <h2 className="text-[22px] font-extrabold leading-tight text-[#101C2B]">
                ทำรายการชำระเงิน
              </h2>

              <p className="mt-1 text-[13px] text-[#7A8795]">
                ตรวจสอบความถูกต้องก่อนชำระ
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-center justify-between border-b border-[#E3E7EB] pb-3">
                  <span className="text-[14px] text-[#8A95A3]">เลขทะเบียน</span>
                  <span className="text-[17px] font-bold text-[#1F2933]">
                    {detail.plateNo}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 border-b border-[#E3E7EB] pb-3">
                  <span className="text-[14px] text-[#8A95A3]">เวลาที่จอด</span>
                  <span className="text-right text-[17px] font-bold text-[#1F2933]">
                    {detail.durationDisplay}
                  </span>
                </div>

                {detail.feeBreakdown ? (
                  <FeeBreakdownList
                    breakdown={detail.feeBreakdown}
                    billableHours={detail.billableHours}
                  />
                ) : null}

                <div className="space-y-2 border-b border-[#E3E7EB] pb-4 text-[14px]">
                  <div className="flex items-center justify-between text-[#66707D]">
                    <span>ยอดรวม</span>
                    <span className="font-semibold text-[#1F2933]">
                      {formatCurrency(detail.netAmount)} ฿
                    </span>
                  </div>

                  {detail.discountAmount > 0 ? (
                    <div className="flex items-center justify-between text-[#34B44C]">
                      <span>ส่วนลด</span>
                      <span className="font-semibold">
                        -{formatCurrency(detail.discountAmount)} ฿
                      </span>
                    </div>
                  ) : null}

                  {detail.paidAmount > 0 ? (
                    <div className="flex items-center justify-between text-[#66707D]">
                      <span>ชำระแล้ว</span>
                      <span className="font-semibold text-[#1F2933]">
                        {formatCurrency(detail.paidAmount)} ฿
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="pt-3">
                  <div className="text-[14px] text-[#8A95A3]">ยอดที่ต้องชำระ</div>
                  <div className="mt-2 flex items-end gap-2">
                    <span className="text-[38px] font-extrabold leading-none text-[#101C2B] sm:text-[42px]">
                      {formatCurrency(detail.remainingAmount)}
                    </span>
                    <span className="pb-2 text-[22px] font-bold text-[#101C2B]">
                      ฿
                    </span>
                  </div>
                </div>
              </div>

              <label className="mt-auto inline-flex cursor-pointer items-center gap-3 pt-6 text-[14px] font-semibold text-[#1F2933]">
                <input
                  type="checkbox"
                  checked={printReceipt}
                  onChange={() => setPrintReceipt((prev) => !prev)}
                  className="h-4 w-4 rounded border-[#CBD5E1]"
                />
                พิมพ์ใบเสร็จ (PrintReceipt)
              </label>
            </div>

            <div className="lg:h-[560px] lg:pr-6">
              {scanAlert ? (
                <div
                  role="alert"
                  className={`mb-4 rounded-2xl border px-5 py-4 text-[14px] font-semibold ${scanAlert.tone === "danger"
                    ? "border-red-300 bg-red-50 text-red-700"
                    : "border-amber-300 bg-amber-50 text-amber-800"
                    }`}
                >
                  <p>{scanAlert.message}</p>
                  <p className="mt-1 text-[12px] font-medium">
                    PromptPay คืนเงินผ่านระบบไม่ได้ กรุณาคืนเงินสดหรือโอนคืน แล้วบันทึกที่{" "}
                    <Link href={REFUNDS_PATH} onClick={onClose} className="underline">
                      รายการรอคืนเงิน
                    </Link>
                  </p>
                </div>
              ) : null}

              <div className={`grid gap-4 ${availableMethods.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
                {availableMethods.includes("qr") ? (
                <button
                  type="button"
                  onClick={handleSelectQrMode}
                  className={`flex min-h-[86px] cursor-pointer flex-col items-center justify-center rounded-2xl border px-4 py-3 transition disabled:cursor-not-allowed ${mode === "qr"
                      ? "border-[#8CC2FF] bg-[#EEF5FD]"
                      : "border-transparent bg-[#EFF1F3]"
                    }`}
                >
                  <div className="mb-2 flex h-12 w-28 items-center justify-center rounded-lg bg-white text-[#1D2A36]">
                    <LuQrCode size={22} />
                  </div>
                  <span className="text-[14px] font-bold text-[#1F2933]">
                    {paymentOptions.scan.label ?? "สแกนจ่าย"}
                  </span>
                </button>
                ) : null}

                {availableMethods.includes("cash") ? (
                <button
                  type="button"
                  onClick={handleSelectCashMode}
                  className={`flex min-h-[86px] cursor-pointer flex-col items-center justify-center rounded-2xl border px-4 py-3 transition disabled:cursor-not-allowed ${mode === "cash"
                      ? "border-[#8CC2FF] bg-[#EEF5FD]"
                      : "border-transparent bg-[#EFF1F3]"
                    }`}
                >
                  <div className="mb-2 flex h-12 w-28 items-center justify-center rounded-lg bg-white text-[#1D2A36]">
                    <LuBanknote size={22} />
                  </div>
                  <span className="text-[14px] font-bold text-[#1F2933]">
                    {paymentOptions.cash.label ?? "เงินสด"}
                  </span>
                </button>
                ) : null}

                {availableMethods.includes("card") ? (
                <button
                  type="button"
                  onClick={handleSelectCardMode}
                  className={`flex min-h-[86px] cursor-pointer flex-col items-center justify-center rounded-2xl border px-4 py-3 transition disabled:cursor-not-allowed ${mode === "card"
                      ? "border-[#8CC2FF] bg-[#EEF5FD]"
                      : "border-transparent bg-[#EFF1F3]"
                    }`}
                >
                  <div className="mb-2 flex h-12 w-28 items-center justify-center rounded-lg bg-white text-[#1D2A36]">
                    <LuCreditCard size={22} />
                  </div>
                  <span className="text-[14px] font-bold text-[#1F2933]">
                    บัตร (เครื่อง EDC)
                  </span>
                </button>
                ) : null}
              </div>

              {availableMethods.length === 0 ? (
                <div className="mt-4 rounded-2xl bg-[#F3F5F7] px-6 py-10 text-center text-[14px] text-[#66707D]">
                  ยังไม่มีวิธีชำระเงินที่เปิดใช้งานสำหรับแคชเชียร์
                  <br />
                  กรุณาตรวจสอบที่หน้าตั้งค่าช่องทางชำระเงิน
                </div>
              ) : mode === "card" ? (
                <div className="mt-4 space-y-4">
                  <ol className="list-decimal space-y-1 rounded-2xl bg-[#F3F5F7] px-8 py-4 text-[13px] leading-6 text-[#374151]">
                    <li>ใส่ยอดที่เครื่อง EDC ให้ตรงกับ &quot;ยอดที่รูดบัตร&quot;</li>
                    <li>ให้ลูกค้าแตะหรือเสียบบัตรที่เครื่อง แล้ว<strong>รอเครื่องอนุมัติ</strong></li>
                    <li>กรอกเลขอ้างอิงจากสลิป EDC แล้วกดยืนยัน</li>
                  </ol>

                  <div>
                    <label htmlFor="edc-device" className="mb-2 block text-[14px] font-semibold text-[#66707D]">
                      เครื่อง EDC ที่ใช้รูด <span className="text-red-600">*</span>
                    </label>
                    <select
                      id="edc-device"
                      value={edcDeviceId}
                      disabled={submitting || cardNeedsVerify}
                      onChange={(event) => {
                        setEdcDeviceId(event.target.value);
                        storeEdcDeviceId(event.target.value);
                        setCardFieldError("");
                      }}
                      className="h-12 w-full rounded-xl bg-[#F3F5F7] px-4 text-[15px] font-bold text-[#1F2933] outline-none disabled:opacity-60"
                    >
                      <option value="">เลือกเครื่อง EDC</option>
                      {edcTerminals.map((terminal) => (
                        <option key={terminal.deviceId} value={terminal.deviceId}>
                          {terminal.deviceName} ({terminal.terminalId})
                          {terminal.location ? ` - ${terminal.location}` : ""}
                        </option>
                      ))}
                    </select>
                    {edcTerminalsError ? (
                      <p className="mt-1 text-[12px] text-red-600">{edcTerminalsError}</p>
                    ) : (
                      <p className="mt-1 text-[12px] text-[#8A95A3]">ระบบจะจำเครื่องที่เลือกไว้ในเครื่องคอมพิวเตอร์นี้</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="edc-amount" className="mb-2 block text-[14px] font-semibold text-[#66707D]">
                      ยอดที่รูดบัตร (ไม่เกิน {formatCurrency(detail.remainingAmount)} ฿)
                    </label>
                    <div className="flex min-h-[56px] items-center rounded-2xl bg-[#F3F5F7] px-6">
                      <input
                        id="edc-amount"
                        type="number"
                        inputMode="decimal"
                        min={0.01}
                        max={detail.remainingAmount}
                        step="0.01"
                        value={cardAmountInput}
                        disabled={submitting || cardNeedsVerify}
                        onChange={(event) => {
                          setCardAmountInput(event.target.value);
                          setCardFieldError("");
                        }}
                        className="w-full bg-transparent text-right text-[24px] font-extrabold text-[#1F2933] outline-none disabled:opacity-60"
                      />
                      <span className="ml-3 text-[18px] font-bold text-[#94A3B8]">฿</span>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="edc-reference" className="mb-2 block text-[14px] font-semibold text-[#66707D]">
                      เลขอ้างอิงจากสลิป EDC <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="edc-reference"
                      value={cardReference}
                      disabled={submitting || cardNeedsVerify}
                      placeholder="approval code หรือเลขที่รายการ"
                      onChange={(event) => {
                        setCardReference(event.target.value);
                        setCardFieldError("");
                      }}
                      aria-invalid={Boolean(cardFieldError)}
                      className="h-14 w-full rounded-2xl bg-[#F3F5F7] px-6 text-[18px] font-bold text-[#1F2933] outline-none disabled:opacity-60"
                    />
                    {cardFieldError ? (
                      <p className="mt-2 text-[13px] font-medium text-red-600">{cardFieldError}</p>
                    ) : null}
                  </div>

                  {cardAlert ? (
                    <div role="alert" className="rounded-2xl border border-red-300 bg-red-50 px-5 py-4 text-[14px] font-semibold text-red-700">
                      {cardAlert}
                    </div>
                  ) : null}

                  {cardSuccess ? (
                    <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-[14px] font-semibold text-green-700">
                      {cardSuccess}
                    </div>
                  ) : null}
                </div>
              ) : mode === "qr" ? (
                <div className="mt-4 text-center">
                  <div className="mx-auto flex h-[270px] w-full items-center justify-center overflow-hidden rounded-2xl border border-[#CFE2FF] bg-[#EEF5FD] px-4 py-5">
                    {qrLoading ? (
                      <div className="text-[#64748B]">
                        กำลังสร้าง QR Code จาก Omise...
                      </div>
                    ) : qrError ? (
                      <div>
                        <div className="text-red-600">{qrError}</div>
                        <button
                          type="button"
                          onClick={handleCreatePromptPayQr}
                          className="mt-4 inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full border border-[#061D36] px-5 text-[14px] font-bold text-[#061D36] transition hover:bg-white"
                        >
                          สร้าง QR ใหม่
                        </button>
                      </div>
                    ) : qrExpired ? (
                      <div>
                        <div className="text-[16px] font-bold text-red-600">QR หมดอายุ</div>
                        <button
                          type="button"
                          onClick={handleCreatePromptPayQr}
                          disabled={detail.remainingAmount <= 0}
                          className="mt-4 inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full bg-[#061D36] px-6 text-[15px] font-bold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          สร้าง QR ใหม่
                        </button>
                      </div>
                    ) : qrImageObjectUrl ? (
                      <div className="flex w-full flex-col items-center">
                        <img
                          src={qrImageObjectUrl}
                          alt="Omise PromptPay QR Code"
                          className="h-auto max-h-[178px] w-full max-w-[260px] object-contain lg:max-w-xs"
                        />
                        <p className="mt-3 text-[15px] text-[#374151]">
                          สแกน QR Code เพื่อชำระเงิน
                          {qrMsLeft !== null ? (
                            <span className="ml-2 font-bold text-[#061D36]">
                              หมดอายุใน {formatCountdown(qrMsLeft)}
                            </span>
                          ) : null}
                        </p>
                        {omiseCharge?.reused ? (
                          <p className="mt-1 text-[12px] text-[#64748B]">
                            แสดง QR เดิมที่ยังรอชำระ
                          </p>
                        ) : null}
                        {paymentVerifyError ? (
                          <p className="mt-2 text-[13px] text-[#D97706]">
                            {paymentVerifyError}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleCreatePromptPayQr}
                        disabled={!availableMethods.includes("qr") || detail.remainingAmount <= 0}
                        className="inline-flex min-h-14 cursor-pointer items-center justify-center rounded-full bg-[#061D36] px-6 text-[16px] font-bold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        สร้าง QR PromptPay
                      </button>
                    )}
                  </div>

                </div>
              ) : (
                <div className="mt-4">
                  <label className="mb-3 inline-flex cursor-pointer items-center gap-2 text-[14px] font-semibold text-[#1F2933]">
                    <input
                      type="checkbox"
                      checked={partialPayment}
                      onChange={handleTogglePartialPayment}
                      className="h-4 w-4 rounded border-[#CBD5E1]"
                    />
                    ชำระบางส่วน
                  </label>

                  {partialPayment ? (
                    <div className="mb-4">
                      <label
                        htmlFor="partial-pay-amount"
                        className="mb-2 block text-[14px] font-semibold text-[#66707D]"
                      >
                        ยอดที่ชำระครั้งนี้ (ไม่เกิน {formatCurrency(detail.remainingAmount)} ฿)
                      </label>
                      <div className="flex min-h-[56px] items-center rounded-2xl bg-[#F3F5F7] px-6">
                        <input
                          id="partial-pay-amount"
                          type="number"
                          inputMode="decimal"
                          min={0.01}
                          max={detail.remainingAmount}
                          step="0.01"
                          value={payAmountInput}
                          onChange={(event) => {
                            setPayAmountInput(event.target.value);
                            setPayAmountError("");
                          }}
                          aria-invalid={Boolean(payAmountError)}
                          className="w-full cursor-text bg-transparent text-right text-[24px] font-extrabold text-[#1F2933] outline-none"
                        />
                        <span className="ml-3 text-[18px] font-bold text-[#94A3B8]">฿</span>
                      </div>
                      {payAmountError ? (
                        <p className="mt-2 text-[13px] font-medium text-red-600">{payAmountError}</p>
                      ) : null}
                    </div>
                  ) : null}

                  <label className="mb-2 block text-[14px] font-semibold text-[#66707D]">
                    จำนวนเงินที่ได้รับ
                  </label>

                  <div className="flex min-h-[72px] items-center rounded-2xl bg-[#F3F5F7] px-6">
                    <input
                      type="number"
                      min={0}
                      value={cashReceived}
                      onChange={(event) => setCashReceived(event.target.value)}
                      className="w-full cursor-text bg-transparent text-right text-[30px] font-extrabold text-[#1F2933] outline-none sm:text-[40px]"
                    />
                    <span className="ml-3 text-[22px] font-bold text-[#94A3B8]">
                      ฿
                    </span>
                  </div>

                  <div className="mt-5 rounded-[22px] bg-[#EEF3F9] px-6 py-8">
                    <div className="text-[14px] font-semibold text-[#66707D]">
                      จำนวนเงินที่ต้องทอน
                    </div>
                    <div className="mt-4 flex items-end justify-end gap-2">
                      <span className="text-[34px] font-extrabold leading-none text-[#101C2B] sm:text-[48px]">
                        {formatCurrency(changeAmount)}
                      </span>
                      <span className="pb-2 text-[22px] font-bold text-[#101C2B]">
                        ฿
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {error ? (
                <p className="mt-4 text-sm font-medium text-red-600">{error}</p>
              ) : null}

              {notice && !error ? (
                <p className="mt-4 text-sm font-medium text-[#16A34A]">{notice}</p>
              ) : null}

              <button
                type="button"
                onClick={() =>
                  void (mode === "card" ? handleConfirmCardPayment() : handleConfirmPayment())
                }
                disabled={
                  submitting ||
                  mode === "qr" ||
                  !availableMethods.includes(mode) ||
                  (mode === "card"
                    ? !cardNeedsVerify &&
                      (detail.remainingAmount <= 0 || !cardReference.trim() || !edcDeviceId)
                    : detail.remainingAmount <= 0)
                }
                className="mt-5 inline-flex min-h-[58px] w-full cursor-pointer items-center justify-center rounded-[18px] bg-[#061D36] px-5 text-[17px] font-bold text-white shadow-[0_12px_30px_rgba(6,29,54,0.18)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 sm:text-[20px]"
              >
                {mode === "qr"
                  ? qrLoading
                    ? "กำลังสร้าง QR Code..."
                    : "รอตรวจสอบการชำระเงิน"
                  : submitting
                    ? "กำลังบันทึก..."
                    : mode === "card"
                      ? cardNeedsVerify
                        ? "ตรวจสอบการบันทึก"
                        : "ยืนยันรับชำระด้วยบัตร"
                      : "ยืนยันการชำระเงิน"}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="mt-4 w-full cursor-pointer text-center text-[15px] font-semibold text-[#A3AFBC]"
              >
                ยกเลิกรายการ
              </button>
            </div>
          </div>
        ) : null}

        {pendingChargeDialog ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#2E3445]/70 p-4">
            <div
              role="alertdialog"
              aria-modal="true"
              className="w-full max-w-[460px] rounded-[24px] bg-white p-6 shadow-2xl"
            >
              <h3 className="text-[20px] font-extrabold text-[#101C2B]">มี QR รอชำระอยู่</h3>
              <p className="mt-3 text-[14px] leading-6 text-[#374151]">
                รายการนี้มี QR รอชำระอยู่
                {(() => {
                  const minutes = getMinutesLeft(pendingChargeDialog.expiresAt);
                  return minutes ? ` (หมดอายุใน ${minutes} นาที)` : "";
                })()}
                {pendingChargeDialog.amount > 0
                  ? ` ยอด ${formatCurrency(satangToBaht(pendingChargeDialog.amount))} บาท`
                  : ""}
              </p>
              <p className="mt-2 text-[14px] leading-6 text-[#B45309]">
                {pendingChargeDialog.next.endsWith("_card")
                  ? "ถ้ารับชำระด้วยบัตรตอนนี้ และลูกค้าสแกน QR จ่ายซ้ำ เงินส่วนนั้นต้องคืนลูกค้าเอง"
                  : "ถ้ารับเงินสดตอนนี้ และลูกค้าสแกน QR จ่ายซ้ำ เงินส่วนนั้นต้องคืนลูกค้าเอง"}
              </p>
              <p className="mt-2 text-[14px] font-semibold text-[#101C2B]">
                กรุณาแจ้งลูกค้าว่าไม่ต้องสแกน QR แล้ว
              </p>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleCancelCashWithPendingCharge}
                  className="h-11 min-w-[110px] rounded-full bg-[#9CA3AF] px-6 text-[14px] font-bold text-white"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCashWithPendingCharge}
                  className="h-11 min-w-[110px] rounded-full bg-[#061D36] px-6 text-[14px] font-bold text-white"
                >
                  {pendingChargeDialog.next.endsWith("_card") ? "รับชำระด้วยบัตร" : "รับเงินสด"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export { PaymentModal };
