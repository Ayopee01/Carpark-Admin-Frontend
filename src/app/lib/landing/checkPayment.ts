// Import Types
import type { AdminPaymentMethodsResponse, RefundReason } from "@/src/app/type/api/payments";
import type { AdminPaymentOption, AdminPaymentOptions } from "@/src/app/type/ui/checkPayment";

/* -------------------------------------- Config -------------------------------------- */

// Config ช่องทางที่แอดมินรับชำระ
const ADMIN_CHANNEL_CODE = "cashier";

// Config id ของวิธีชำระเงินสด (id ถาวร ส่วน label/icon แก้ได้ ห้ามใช้ตัดสินใจ)
const CASH_METHOD_ID = "cash";

// Config id ของ PromptPay ผ่าน Omise (qr เป็นวิธีทดสอบที่ไม่มี gateway ห้ามใช้ที่นี่)
const SCAN_METHOD_ID = "promptpay";

// Config id ของบัตรที่เคาน์เตอร์ ใช้ได้เฉพาะเครื่อง EDC
const CARD_METHOD_ID = "card";

// Config ปุ่มวิธีชำระเมื่อยังไม่ได้โหลดหรือโหลดไม่สำเร็จ (ปิดทุกปุ่ม)
const NO_ADMIN_PAYMENT_OPTIONS: AdminPaymentOptions = {
  cash: { enabled: false, label: null },
  scan: { enabled: false, label: null },
  card: { enabled: false, label: null },
};

// Config path ของหน้ารายการรอคืนเงิน
const REFUNDS_PATH = "/landing/refunds";

// Config ข้อความของเหตุผลที่ต้องคืนเงิน
const REFUND_REASON_LABELS: Record<RefundReason, string> = {
  already_paid: "จ่ายซ้ำ (รายการจ่ายครบแล้ว)",
  transaction_not_payable: "รายการปิดแล้ว",
  transaction_not_found: "ไม่พบรายการ",
  overpaid: "จ่ายเกินยอด",
};

/* -------------------------------------- Functions -------------------------------------- */

// Function แปลงวิธีชำระจาก GET /payments/methods เป็นปุ่ม แสดงเฉพาะ id ที่มีในรายการ ไม่ใช้วิธีอื่นแทน
function resolveAdminPaymentOptions(
  response: AdminPaymentMethodsResponse | null
): AdminPaymentOptions {
  function resolve(methodId: string): AdminPaymentOption {
    const method = response?.methods?.find((item) => item.id === methodId);
    return { enabled: Boolean(method), label: method?.label || null };
  }

  return {
    cash: resolve(CASH_METHOD_ID),
    scan: resolve(SCAN_METHOD_ID),
    card: resolve(CARD_METHOD_ID),
  };
}

export { ADMIN_CHANNEL_CODE, CASH_METHOD_ID, SCAN_METHOD_ID, CARD_METHOD_ID, NO_ADMIN_PAYMENT_OPTIONS, REFUNDS_PATH, REFUND_REASON_LABELS, resolveAdminPaymentOptions };
