// Import Types
import type { EdcUsage } from "./devices";
import type { Transaction, TransactionStatus } from "./transactions";

/* -------------------------------------- Payment Types -------------------------------------- */

// Type จำนวนเงินหน่วยสตางค์ จำนวนเต็ม (4000 = 40.00 บาท)
export type Satang = number;

// Type รหัสช่องทางชำระ
export type PaymentChannelCode = "cashier" | "kiosk" | "gate" | "mobile";

// Type id ของช่องทางชำระ (ชุดตายตัว ลบหรือเพิ่มไม่ได้)
export type PaymentChannelId = "ch_cashier" | "ch_kiosk" | "ch_mobile" | "ch_gate";

// Type รหัสวิธีชำระ (ชุดตายตัว แอดมินเพิ่มไม่ได้)
export type PaymentMethodId =
  | "cash"
  | "qr"
  | "promptpay"
  | "card"
  | "mobile_banking"
  | "bank1"
  | "wallet"
  | "other";

// Type วิธีชำระที่ใช้ได้ในช่องทางหนึ่ง
export interface AvailablePaymentMethod {
  id: PaymentMethodId;
  label: string;
  icon: string | null;
}

/* -------------------------------------- Omise Charge Types -------------------------------------- */

// Type สถานะ charge ของ Omise
export type OmiseChargeStatus = "pending" | "successful" | "failed" | "expired" | "reversed";

// Type charge ของ Omise ที่สร้างให้ QR PromptPay
export interface OmiseChargeResponse {
  provider: "omise";
  reused: boolean; // true = ได้ QR เดิมที่ยังไม่หมดอายุ
  chargeId: string;
  status: OmiseChargeStatus;
  amount: Satang;
  currency: string;
  plateNo: string;
  method: PaymentMethodId;
  channel: PaymentChannelCode;
  authorizeUri: string | null;
  expiresAt: string | null;
  transaction: {
    plateNo: string;
    status: TransactionStatus;
    remainingAmount: number;
    exitTimeLimit: string | null;
  };
  qr: Record<string, unknown> | null;
}

// Type เหตุผลที่ต้องคืนเงิน
export type RefundReason = "already_paid" | "transaction_not_payable" | "transaction_not_found" | "overpaid";

// Type วิธีคืนเงิน
export type RefundMethod = "manual";

// Type charge ที่บันทึกใน backend พร้อมข้อมูลการคืนเงิน
export interface GatewayCharge {
  id: string;
  provider: "omise";
  chargeId: string;
  transactionId: string;
  plateNo: string;
  amount: Satang;
  currency: string;
  method: PaymentMethodId;
  channel: PaymentChannelCode;
  status: string;
  paidAt: string | null;
  processedAt: string | null;
  refundAmount: Satang | null;
  refundReason: RefundReason | null;
  refundResolvedAt: string | null;
  refundNote: string | null;
  refundResolvedBy: string | null;
  refundMethod: RefundMethod | null;
  refundId: string | null;
  createdAt: string;
  updatedAt: string;
}

// Type รายการรอคืนเงินใน SSE
export interface RefundItem {
  chargeId: string;
  transactionId: string;
  plateNo: string;
  method: PaymentMethodId;
  channel: PaymentChannelCode;
  amount: Satang;
  refundAmount: Satang;
  refundReason: RefundReason;
  paidAt: string | null;
  refundMethod: RefundMethod | null;
}

/* -------------------------------------- Payments Route Types -------------------------------------- */

// Type response ของ GET /payments/methods
export interface AdminPaymentMethodsResponse {
  channel: "cashier";
  methods: AvailablePaymentMethod[];
}

// Type เครื่อง EDC ที่เลือกได้ตอนรับชำระด้วยบัตร
export interface EdcTerminal {
  deviceId: string;
  deviceName: string;
  terminalId: string;
  location: string | null;
  provider: string | null;
}

// Type response ของ GET /payments/edc/terminals
export interface EdcTerminalsResponse {
  data: EdcTerminal[];
}

// Type body ของ POST /payments/charges (QR PromptPay ที่เคาน์เตอร์)
export interface CreateChargeRequest {
  transactionId?: string;
  plateNo?: string;
  method?: "promptpay";
  sourceType?: string;
  source?: string;
  amount?: Satang; // ถ้าส่งต้องเท่ากับยอดค้าง
  channel?: "cashier";
  returnUri?: string;
}

// Type response ของ POST /payments/charges
export interface CreateChargeResponse {
  message: "created";
  charge: OmiseChargeResponse;
}

// Type ผลของการตรวจ charge อีกครั้ง
export type VerifyChargeAction = "processed" | "refund_required" | "already_processed" | "pending" | "updated";

// Type response ของ POST /payments/charges/:chargeId/verify
export interface VerifyChargeResponse {
  message: "Charge verified";
  action: VerifyChargeAction;
  chargeId: string;
  status: "successful" | "pending" | "failed" | "expired" | "reversed";
  refundAmount?: Satang;
  refundReason?: RefundReason;
  transaction?: Transaction;
}

// Type ตัวกรองสถานะของรายการคืนเงิน
export type RefundStatusFilter = "pending" | "resolved";

// Type รายการใน GET /payments/refunds (มีเฉพาะ charge ที่ต้องคืนเงิน)
export type RefundListItem = Omit<GatewayCharge, "refundAmount" | "refundReason"> & {
  refundAmount: Satang;
  refundReason: RefundReason;
};

// Type response ของ GET /payments/refunds
export interface RefundListResponse {
  data: RefundListItem[];
  summary: { pendingCount: number; pendingAmount: Satang };
}

// Type body ของ POST /payments/refunds/:chargeId/resolve
export interface ResolveRefundRequest {
  note?: string | null;
}

// Type response ของ POST /payments/refunds/:chargeId/resolve
export interface ResolveRefundResponse {
  message: "Refund resolved";
  charge: GatewayCharge;
}

// Type query ของ GET /payments/edc/reconciliation (วันที่ตามเวลาไทย)
export interface EdcReconciliationQuery {
  date?: string; // วันเดียว YYYY-MM-DD
  start_date?: string; // ช่วงไม่เกิน 31 วัน
  end_date?: string; // วันสิ้นสุด YYYY-MM-DD
}

// Type รายการชำระด้วยบัตรหนึ่งรายการในการกระทบยอด
export interface EdcReconciliationPayment {
  transactionId: string;
  plateNo: string;
  billNo: string;
  paymentId: string;
  reference: string | null;
  terminalId: string | null;
  edcDeviceId: string | null;
  amount: number;
  paidAt: string;
  channel: PaymentChannelCode;
  deviceId: string | null;
  processedBy: string | null;
}

// Type เครื่อง EDC ที่ลงทะเบียนไว้ของ terminal หนึ่ง
export interface EdcReconciliationDevice {
  deviceId: string;
  deviceName: string;
  location: string | null;
  provider: string | null;
  usage: EdcUsage;
}

// Type ยอดรวมของ terminal หนึ่ง
export interface EdcReconciliationTerminal {
  terminalId: string | null;
  edcDevice: EdcReconciliationDevice | null;
  channels: PaymentChannelCode[];
  deviceIds: string[];
  count: number;
  amount: number;
  payments: EdcReconciliationPayment[];
}

// Type response ของ GET /payments/edc/reconciliation
export interface EdcReconciliation {
  range: { startDate: string; endDate: string };
  total: { count: number; amount: number };
  missingReferenceCount: number;
  terminals: EdcReconciliationTerminal[];
}

// Type event ของ GET /payments/refunds/events (connected/ping จัดการใน subscribeSse)
export type RefundStreamEvent =
  | {
      type: "refunds_snapshot";
      pendingCount: number;
      pendingAmount: Satang;
      data: RefundItem[];
      generatedAt: string;
    }
  | (RefundItem & {
      type: "refund_required";
      applied: boolean;
      pendingCount: number;
      pendingAmount: Satang;
      at: string;
    })
  | {
      type: "refund_resolved";
      chargeId: string;
      transactionId: string;
      plateNo: string;
      resolvedBy: string | null;
      refundNote: string | null;
      refundResolvedAt: string;
      refundMethod: "manual";
      refundId: string | null;
      pendingCount: number;
      pendingAmount: Satang;
      at: string;
    }
  | { type: "payment_settings_updated"; at: string };

/* -------------------------------------- Payment WebSocket Types -------------------------------------- */

// Type event ผลการชำระของ charge (failed/expired/reversed มีแค่ chargeId, plateNo, paymentStatus, gatewayCharge)
export interface PaymentUpdatedEvent {
  type: "payment_updated";
  provider: "omise";
  chargeId: string;
  plateNo: string;
  transactionId?: string;
  paymentStatus: OmiseChargeStatus;
  transactionStatus?: TransactionStatus | null;
  remainingAmount?: number | null;
  exitTimeLimit?: string | null;
  applied?: boolean; // false = ได้รับเงินแต่ตัดยอดไม่ได้
  refundRequired?: boolean;
  refundAmount?: Satang | null;
  refundReason?: RefundReason | null;
  gatewayCharge: GatewayCharge;
  replayed?: true; // ส่งซ้ำตอนต่อใหม่ ไม่มี applied
  emittedAt: string;
}

// Type ข้อความทุกแบบจาก WebSocket /payments/ws
export type PaymentSocketMessage =
  | { type: "connected"; message: string; subscribed: { plateNo: string | null; chargeId: string | null } }
  | { type: "subscribed" }
  | { type: "error"; message: string }
  | PaymentUpdatedEvent;
