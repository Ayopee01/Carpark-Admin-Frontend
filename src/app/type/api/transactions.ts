// Import Types
import type { PaymentChannelCode, PaymentMethodId, Satang } from "./payments";

/* -------------------------------------- Transaction Types -------------------------------------- */

// Type ประเภทรถ
export type VehicleType = "car" | "motorcycle";

// Type สถานะ transaction (paid_waiting_exit = จ่ายครบรอออก, completed = รถออกแล้ว)
export type TransactionStatus = "pending" | "partially_paid" | "paid_waiting_exit" | "completed" | "cancelled";

// Type ข้อมูลหน้าของรายการแบบแบ่งหน้า
export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

// Type ช่วงชั่วโมงที่คิดเงินด้วยกฎเดียวกัน
export interface FeeRange {
  feeType: "base_hour" | "next_hour" | null;
  ruleId: string | null;
  hourStart: number;
  hourEnd: number;
  hours: number;
  pricePerHour: number;
  amount: number;
}

// Type ค่าจอดของวันหนึ่ง
export interface FeeBreakdownDay {
  date: string; // YYYY-MM-DD ตามเวลาไทย
  hours: number;
  amount: number;
  ranges: FeeRange[];
}

// Type ค่าจอดค้างคืน
export interface FeeBreakdownOvernight {
  ruleId: string | null;
  nights: number;
  pricePerNight: number;
  amount: number;
}

// Type รายละเอียดการคิดค่าจอดทั้งหมด
export interface FeeBreakdown {
  days: FeeBreakdownDay[];
  overnight: FeeBreakdownOvernight | null;
}

// Type การชำระเงินหนึ่งครั้งของ transaction
export interface PaymentRecord {
  id: string;
  method: PaymentMethodId;
  channel: PaymentChannelCode;
  source?: "kiosk" | "barrier_gate" | "mobile" | "admin";
  sourceContext?: Record<string, unknown>;
  paidAmount: number;
  paidAt: string;
  expiryAt?: string;
  processedBy?: string;
  reference?: string;
  terminalId?: string;
  edcDeviceId?: string;
  deviceId?: string;
  deviceType?: string;
  deviceName?: string;
  deviceLocation?: string;
}

// Type transaction แบบเต็ม (ค่าจอดคำนวณ ณ เวลาที่ขอ)
export interface Transaction {
  id: string;
  billNo: string;
  plateNo: string;
  vehicleType: VehicleType;
  entryAt: string | null;
  exitAt: string | null;
  calculatedAt: string;
  exitTimeLimit: string | null;
  isOverstay: boolean;
  status: TransactionStatus;
  baseAmount: number;
  netAmount: number;
  totalPaid: number;
  remainingAmount: number; // ใช้ค่านี้เสมอ ห้ามคำนวณเอง
  serviceDisplay: string;
  durationHour: number;
  totalMinutes: number;
  feeBreakdown: FeeBreakdown;
  payments: PaymentRecord[];
  qrData: string;
  createdAt: string;
  updatedAt: string;
}

// Type การชำระล่าสุดที่แสดงในตาราง
export interface TransactionLatestPayment {
  paymentId: string;
  method: PaymentMethodId;
  channel: PaymentChannelCode;
  paidAmount: number;
  paidAt: string;
  reference: string | null;
}

// Type แถวในตารางรายการรถเข้าออก
export interface TransactionListItem {
  id: string;
  billNo: string;
  plateNo: string;
  vehicleType: VehicleType;
  status: TransactionStatus;
  entryAt: string | null;
  exitAt: string | null;
  exitTimeLimit: string | null;
  isOverstay: boolean;
  amount: { net: number; paid: number; remaining: number };
  duration: { display: string; hours: number; totalMinutes: number };
  latestPayment: TransactionLatestPayment | null;
  updatedAt: string;
}

/* -------------------------------------- Transactions Route Types -------------------------------------- */

// Type query ของ GET /transactions
export interface TransactionListQuery {
  keyword?: string;
  plate_no?: string;
  bill_no?: string;
  page?: number; // ค่าเริ่มต้น 1
  per_page?: number; // ค่าเริ่มต้น 10 สูงสุด 100
  all?: "true" | "1" | "false" | "0";
}

// Type meta ของ GET /transactions (all=true ไม่แบ่งหน้า)
export type TransactionListMeta = (PaginationMeta | { all: true; total: number; totalFound: number }) & {
  realtime: true;
};

// Type response ของ GET /transactions
export interface TransactionListResponse {
  data: TransactionListItem[];
  meta: TransactionListMeta;
}

// Type body ของ POST /transactions/:plateNo/payment (เงินสด/บัตร EDC/อื่น ๆ ที่เคาน์เตอร์)
export interface AdminPaymentRequest {
  method?: PaymentMethodId; // ไม่ส่ง = cash
  channel?: "cashier" | null;
  amount?: number | string; // บาท มากกว่า 0 ไม่ส่ง = จ่ายยอดค้างทั้งหมด
  reference?: string | null; // ต้องมีเมื่อ method = card
  edcDeviceId?: string | null; // ต้องมีเมื่อ method = card
  confirmPendingCharge?: boolean;
  deviceId?: string | null;
  deviceName?: string | null;
  deviceLocation?: string | null;
}

// Type response ของ POST /transactions/:plateNo/payment
export interface AdminPaymentResponse {
  message: string;
  data: {
    transaction: {
      transactionId: string;
      billNo: string;
      plateNo: string;
      vehicleType: VehicleType;
      status: TransactionStatus;
    };
    payment: {
      paymentId: string;
      method: PaymentMethodId;
      channel: "cashier";
      paidAmount: number;
      paidAt: string;
      processedBy: string;
      reference: string | null;
      terminalId: string | null;
      edcDeviceId: string | null;
    };
    amount: { netAmount: number; paidAmount: number; remainingAmount: number };
    duplicate: boolean; // true = reference นี้บันทึกไว้แล้ว (retry) payment คือรายการเดิม
    parking: {
      entryAt: string | null;
      exitTimeLimit: string | null;
      isOverstay: boolean;
      durationDisplay: string;
      totalMinutes: number;
    };
  };
}

// Type รายละเอียดใน error 409 PENDING_GATEWAY_CHARGE (มี QR ที่ยังไม่หมดอายุ)
export interface PendingGatewayChargeDetails {
  chargeId: string;
  method: PaymentMethodId;
  channel: PaymentChannelCode;
  amount: Satang;
  expiresAt: string;
}

// Type body ของ PATCH /transactions/:plateNo (field ที่ไม่รู้จัก backend ตัดทิ้ง)
export interface TransactionUpdateRequest {
  plateNo?: string;
  vehicleType?: VehicleType;
  serviceType?: string;
  status?: TransactionStatus;
  totalPaid?: number | string;
  payments?: ({ paidAmount: number | string; paidAt: string } & Record<string, unknown>)[];
  exitTimeLimit?: string | null;
  exitAt?: string | null;
}

// Type response ของ PATCH /transactions/:plateNo
export interface TransactionUpdateResponse {
  message: string;
  transaction: Transaction;
}

// Type event ของ GET /transactions/events ใช้ query เดียวกับ list (connected/ping จัดการใน subscribeSse)
export type TransactionsStreamEvent =
  | {
      type: "transactions_snapshot" | "transactions_updated";
      // null ตอน snapshot, reason เช่น payment_processed, transaction_updated, day_changed
      trigger: { reason: string; transactionId: string | null; plateNo: string | null; at: string } | null;
      data: TransactionListResponse;
      generatedAt: string;
    }
  | { type: "transactions_error"; message: string; generatedAt: string };
