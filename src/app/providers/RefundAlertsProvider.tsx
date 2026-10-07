"use client";
// Import Library
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type JSX } from "react";
import { usePathname } from "next/navigation";
// Import Api
import { subscribeRefundEvents } from "@/src/app/lib/api/payments";
// Import Landing
import { REFUNDS_PATH } from "@/src/app/lib/landing/checkPayment";
// Import Types
import type { RefundItem } from "@/src/app/type/api/payments";
import type { RefundAlert, RefundAlertsContextValue } from "@/src/app/type/ui/checkPayment";
// Import Shared
import { formatMoney, satangToBaht } from "@/src/app/lib/shared/format";

/* -------------------------------------- Config -------------------------------------- */

// Config context ของแจ้งเตือนคืนเงิน ค่าเริ่มต้นเมื่อไม่ได้อยู่ใต้ provider
const RefundAlertsContext = createContext<RefundAlertsContextValue>({
    enabled: false,
    pendingCount: null,
    pendingAmount: null,
    alerts: [],
    version: 0,
    paymentSettingsVersion: 0,
});

/* -------------------------------------- Functions -------------------------------------- */

// Function hook อ่านจำนวนรอคืนเงินและรายการแจ้งเตือน
function useRefundAlerts(): RefundAlertsContextValue {
    return useContext(RefundAlertsContext);
}

/* -------------------------------------- Helpers -------------------------------------- */

// Function สร้างข้อความแจ้งเตือนจากยอดที่ต้องคืน (refundAmount ไม่ใช่ยอดที่จ่าย)
function buildMessage(item: Pick<RefundItem, "plateNo" | "refundAmount" | "refundReason">): string {
    const baht = formatMoney(satangToBaht(item.refundAmount));
    const plate = item.plateNo ?? "-";

    switch (item.refundReason) {
        case "already_paid":
            return `ทะเบียน ${plate} จ่าย QR ซ้ำ ${baht} บาท กรุณาคืนเงิน`;
        case "overpaid":
            return `ทะเบียน ${plate} จ่ายเกิน ${baht} บาท กรุณาคืนส่วนเกิน`;
        case "transaction_not_payable":
            return `ทะเบียน ${plate} จ่ายหลังปิดรายการ ${baht} บาท กรุณาคืนเงิน`;
        case "transaction_not_found":
            return `พบเงินเข้าโดยไม่มีรายการจอด ${baht} บาท กรุณาตรวจสอบ`;
        default:
            return `ทะเบียน ${plate} มีเงินรอคืน ${baht} บาท กรุณาตรวจสอบ`;
    }
}

// Function เลือกสีแจ้งเตือน overpaid คืนแค่ส่วนเกิน (เหลือง) นอกนั้นคืนทั้งหมด (แดง)
function getTone(item: { refundReason: string; applied?: boolean }): RefundAlert["tone"] {
    if (item.applied === false) return "danger";
    return item.refundReason === "overpaid" ? "warning" : "danger";
}

// Function แปลงเวลา ISO เป็น timestamp (ไม่มีหรือผิด = 0)
function toTime(value?: string | null): number | null {
    const time = value ? Date.parse(value) : NaN;
    return Number.isNaN(time) ? null : time;
}

// Function เปิด SSE รายการรอคืนเงินเส้นเดียวต่อแท็บ แชร์ให้ badge แจ้งเตือน และหน้าคืนเงิน
function RefundAlertsProvider({ enabled, children }: { enabled: boolean; children: ReactNode }): JSX.Element {
    const pathname = usePathname();
    const onRefundsPage = pathname.startsWith(REFUNDS_PATH);
    const onRefundsPageRef = useRef(onRefundsPage);

    const [streamEnabled, setStreamEnabled] = useState(enabled);
    const [pendingCount, setPendingCount] = useState<number | null>(null);
    const [pendingAmount, setPendingAmount] = useState<number | null>(null);
    const [alertMap, setAlertMap] = useState<Map<string, RefundAlert>>(() => new Map());
    const alertMapRef = useRef(alertMap);
    useEffect(() => {
        alertMapRef.current = alertMap;
    }, [alertMap]);
    const [version, setVersion] = useState(0);
    const [paymentSettingsVersion, setPaymentSettingsVersion] = useState(0);
    const lastStampRef = useRef<number | null>(null);

    // ใช้จำนวนจาก event ที่ใหม่ที่สุด (at / generatedAt) กัน event เก่ามาทับ
    const applyCounts = useCallback((count: number, amount: number, stamp: string | undefined) => {
        const time = toTime(stamp);
        if (time !== null && lastStampRef.current !== null && time < lastStampRef.current) return;
        if (time !== null) lastStampRef.current = time;
        setPendingCount(count);
        setPendingAmount(amount);
    }, []);

    useEffect(() => {
        onRefundsPageRef.current = onRefundsPage;
        // เปิดหน้าคืนเงิน = เห็นแจ้งเตือนแล้ว
        if (onRefundsPage) {
            setAlertMap((prev) => {
                if ([...prev.values()].every((alert) => alert.dismissed)) return prev;
                const next = new Map(prev);
                next.forEach((alert, key) => next.set(key, { ...alert, dismissed: true }));
                return next;
            });
        }
    }, [onRefundsPage]);

    useEffect(() => {
        setStreamEnabled(enabled);
    }, [enabled]);

    useEffect(() => {
        if (!streamEnabled) return;

        const newAlert = (item: RefundItem & { applied?: boolean }): RefundAlert => ({
            chargeId: item.chargeId,
            tone: getTone(item),
            message: buildMessage(item),
            dismissed: onRefundsPageRef.current,
        });

        return subscribeRefundEvents({
            // 403 ไม่มีสิทธิ์ transactions หยุด stream และซ่อนแจ้งเตือน
            onFatalError: () => setStreamEnabled(false),
            onEvent: (event) => {
                if (event.type === "payment_settings_updated") {
                    setPaymentSettingsVersion((value) => value + 1);
                    return;
                }

                if (event.type === "refunds_snapshot") {
                    applyCounts(event.pendingCount, event.pendingAmount, event.generatedAt);
                    const prev = alertMapRef.current;
                    // หลังต่อใหม่ แจ้งรายการที่พลาดระหว่างหลุด และเอารายการที่ถูกคืนไปแล้วออก
                    const next = new Map<string, RefundAlert>();
                    event.data.forEach((item) => {
                        next.set(item.chargeId, prev.get(item.chargeId) ?? newAlert(item));
                    });
                    setAlertMap(next);
                    // ต่อใหม่โดยไม่พลาดอะไร ไม่ต้องให้หน้ารายการโหลดใหม่
                    const changed =
                        next.size !== prev.size || [...next.keys()].some((key) => !prev.has(key));
                    if (changed) setVersion((value) => value + 1);
                    return;
                }

                if (event.type === "refund_required") {
                    applyCounts(event.pendingCount, event.pendingAmount, event.at);
                    setAlertMap((prev) => {
                        if (prev.has(event.chargeId)) return prev; // แจ้งเตือนอยู่แล้ว
                        const next = new Map(prev);
                        next.set(event.chargeId, newAlert(event));
                        return next;
                    });
                    setVersion((value) => value + 1);
                    return;
                }

                if (event.type === "refund_resolved") {
                    applyCounts(event.pendingCount, event.pendingAmount, event.at);
                    setAlertMap((prev) => {
                        if (!prev.has(event.chargeId)) return prev;
                        const next = new Map(prev);
                        next.delete(event.chargeId);
                        return next;
                    });
                    setVersion((value) => value + 1);
                }
            },
        });
    }, [applyCounts, streamEnabled]);

    const value = useMemo<RefundAlertsContextValue>(
        () => ({
            enabled: streamEnabled,
            pendingCount: streamEnabled ? pendingCount : null,
            pendingAmount: streamEnabled ? pendingAmount : null,
            alerts: streamEnabled ? [...alertMap.values()] : [],
            version,
            paymentSettingsVersion,
        }),
        [alertMap, paymentSettingsVersion, pendingAmount, pendingCount, streamEnabled, version]
    );

    return <RefundAlertsContext.Provider value={value}>{children}</RefundAlertsContext.Provider>;
}

export { useRefundAlerts, RefundAlertsProvider };
