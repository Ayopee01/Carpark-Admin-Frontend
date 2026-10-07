// Import Types
import type { FeeBreakdown, TransactionStatus } from "@/src/app/type/api/transactions";
import type { OmiseChargeResponse } from "@/src/app/type/api/payments";

/* -------------------------------------- Transactions Table Types -------------------------------------- */

// Type แถวในตารางรายการรถ แปลงจาก TransactionListItem
export type TransactionItem = {
  id: string;
  billNo: string;
  plateNo: string;
  vehicleType: string;
  entryAt: string | null;
  exitAt: string | null;
  netAmount: number;
  status: TransactionStatus;
  payment: {
    method: string | null;
    paidAt: string | null;
    reference: string | null;
  };
};

// Type ค่าที่กำลังแก้ในแถวแก้ทะเบียน
export type TransactionEditDraft = { plateNo: string };

// Type ตัวกรองสถานะเหนือตาราง
export type TransactionStatusFilter = "all" | TransactionStatus;

/* -------------------------------------- Payment Dialog Types -------------------------------------- */

// Type ปุ่มวิธีชำระหนึ่งปุ่มบน dialog
export type AdminPaymentOption = {
  enabled: boolean;
  label: string | null;
};

// Type ปุ่มวิธีชำระทั้งหมดบน dialog
export type AdminPaymentOptions = {
  cash: AdminPaymentOption;
  scan: AdminPaymentOption;
  card: AdminPaymentOption;
};

// Type วิธีชำระที่เลือกอยู่ (card = ลูกค้ารูดบัตรที่เครื่อง EDC แล้วแอดมินบันทึก)
export type PaymentMode = "qr" | "cash" | "card";

// Type ข้อมูลที่ dialog แสดง แปลงจาก Transaction
export type PaymentDetail = {
  id: string;
  billNo: string;
  plateNo: string;
  durationDisplay: string;
  baseAmount: number;
  netAmount: number;
  paidAmount: number;
  remainingAmount: number;
  discountAmount: number;
  status: TransactionStatus;
  paymentReferences: string[]; // ใช้ตรวจว่าการชำระด้วยบัตรถูกบันทึกจริง
  billableHours: number;
  feeBreakdown: FeeBreakdown | null;
  payment: {
    method: string | null;
    qrCodeText: string | null;
    qrCodeImageUrl: string | null;
  };
  receiptPreview?: {
    printableText: string | null;
    canPrint: boolean;
  };
};

// Type QR ที่แสดงอยู่ จาก POST /payments/charges หรือ 409 PENDING_GATEWAY_CHARGE (amount เป็นสตางค์)
export type ActiveCharge = Pick<OmiseChargeResponse, "chargeId" | "status" | "amount" | "method" | "channel" | "expiresAt"> & {
  reused?: boolean; // true = ได้ QR เดิมที่ยังไม่หมดอายุ
};

// Type QR ที่ยังรอจ่ายอยู่ (amount เป็นสตางค์)
export type PendingGatewayCharge = {
  chargeId: string;
  amount: number;
  expiresAt: string | null;
  method: string;
  channel: string;
};

// Type dialog ยืนยันรับเงินสด/บัตรระหว่างที่ยังมี QR รอจ่าย
export type PendingChargeDialog = PendingGatewayCharge & {
  next: "switch_to_cash" | "resubmit_cash" | "switch_to_card" | "resubmit_card";
};

// Type แถบแจ้งเตือนบนส่วน QR
export type ScanAlert = {
  tone: "warning" | "danger";
  message: string;
};

/* -------------------------------------- Refund Alert Types -------------------------------------- */

// Type แจ้งเตือนรายการรอคืนเงินที่แสดงทุกหน้า
export type RefundAlert = {
  chargeId: string;
  tone: "danger" | "warning";
  message: string;
  dismissed: boolean; // ซ่อนหลังเปิดหน้าคืนเงิน แต่เก็บไว้กันแจ้งซ้ำ
};

// Type ค่าที่ RefundAlertsProvider แชร์ให้ทุกหน้า
export type RefundAlertsContextValue = {
  enabled: boolean;
  pendingCount: number | null; // null จนกว่าจะได้ snapshot แรก
  pendingAmount: number | null; // สตางค์
  alerts: RefundAlert[];
  version: number; // เพิ่มเมื่อมี refund_required/refund_resolved ให้หน้ารายการโหลดใหม่
  paymentSettingsVersion: number; // เพิ่มเมื่อมี payment_settings_updated ให้หน้าชำระเงินโหลดวิธีชำระใหม่
};

/* -------------------------------------- Component Types -------------------------------------- */

// Type props ของรายละเอียดค่าจอด
export type FeeBreakdownListProps = {
  breakdown: FeeBreakdown;
  billableHours?: number;
};

// Type props ของ dialog ชำระเงิน
export type PaymentModalProps = {
  open: boolean;
  transactionId: string | null;
  transaction?: TransactionItem | null;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
};

// Type props ของปุ่มในแถว
export type TransactionActionsProps = {
  item: TransactionItem;
  isEditing: boolean;
  isSaving: boolean;
  onPay: (id: string) => void;
  onStartEdit: (item: TransactionItem) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string) => void;
};

// Type props ของแถวในตาราง
export type TransactionRowProps = TransactionActionsProps & {
  draft: TransactionEditDraft | null;
  onChangeDraft: (field: keyof TransactionEditDraft, value: string) => void;
};

// Type props ของตารางรายการรถ
export type TransactionsTableProps = {
  items: TransactionItem[];
  editingId: string | null;
  savingEditId: string | null;
  draft: TransactionEditDraft | null;
  onChangeDraft: (field: keyof TransactionEditDraft, value: string) => void;
  onPay: (id: string) => void;
  onStartEdit: (item: TransactionItem) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string) => void;
};
