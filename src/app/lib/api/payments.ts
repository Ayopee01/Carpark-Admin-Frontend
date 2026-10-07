// Import Types
import type { AdminPaymentMethodsResponse, CreateChargeRequest, CreateChargeResponse, EdcReconciliation, EdcReconciliationQuery, EdcTerminalsResponse, RefundListResponse, RefundStatusFilter, RefundStreamEvent, ResolveRefundRequest, ResolveRefundResponse, VerifyChargeResponse } from "@/src/app/type/api/payments";
import type { SseOptions } from "@/src/app/type/api/common";
// Import Shared
import { apiRequest, apiRequestBlob, seg, subscribeSse } from "@/src/app/lib/shared/http";

// Function ดึงวิธีชำระที่เปิดใช้และอนุญาตในช่องทาง cashier (GET /api/payments/methods)
function getPaymentMethods(): Promise<AdminPaymentMethodsResponse> {
  return apiRequest<AdminPaymentMethodsResponse>("/payments/methods", { errorMessage: "โหลดวิธีชำระเงินไม่สำเร็จ" });
}

// Function ดึงรายการเครื่อง EDC (GET /api/payments/edc/terminals)
function getEdcTerminals(): Promise<EdcTerminalsResponse> {
  return apiRequest<EdcTerminalsResponse>("/payments/edc/terminals", { errorMessage: "โหลดรายการเครื่อง EDC ไม่สำเร็จ" });
}

// Function ดึงข้อมูลกระทบยอด EDC (GET /api/payments/edc/reconciliation)
function getEdcReconciliation(query: EdcReconciliationQuery = {}): Promise<EdcReconciliation> {
  return apiRequest<EdcReconciliation>("/payments/edc/reconciliation", {
    query: { ...query },
    errorMessage: "โหลดข้อมูลกระทบยอดไม่สำเร็จ",
  });
}

// Function สร้าง QR PromptPay โดย backend สร้าง source ให้ (POST /api/payments/charges)
function createCharge(body: CreateChargeRequest): Promise<CreateChargeResponse> {
  return apiRequest<CreateChargeResponse>("/payments/charges", {
    method: "POST",
    body,
    errorMessage: "สร้าง QR PromptPay ไม่สำเร็จ",
  });
}

// Function ดึงรูป QR ของ charge (GET /api/payments/charges/:chargeId/qr)
function getChargeQrImage(chargeId: string): Promise<Blob> {
  return apiRequestBlob(`/payments/charges/${seg(chargeId)}/qr`, { errorMessage: "โหลดรูป QR ไม่สำเร็จ" });
}

// Function ขอให้ backend ตรวจสถานะ charge กับ Omise อีกครั้ง (POST /api/payments/charges/:chargeId/verify)
function verifyCharge(chargeId: string): Promise<VerifyChargeResponse> {
  return apiRequest<VerifyChargeResponse>(`/payments/charges/${seg(chargeId)}/verify`, {
    method: "POST",
    errorMessage: "ตรวจสอบการชำระเงินไม่สำเร็จ",
  });
}

// Function ดึงรายการรอคืนเงินตามสถานะ (GET /api/payments/refunds)
function getRefunds(status: RefundStatusFilter = "pending"): Promise<RefundListResponse> {
  return apiRequest<RefundListResponse>("/payments/refunds", {
    query: { status },
    errorMessage: "โหลดรายการรอคืนเงินไม่สำเร็จ",
  });
}

// Function เปิด SSE รับรายการรอคืนเงินที่เปลี่ยน (GET /api/payments/refunds/events)
function subscribeRefundEvents(options: SseOptions<RefundStreamEvent>): () => void {
  return subscribeSse("/payments/refunds/events", options);
}

// Function บันทึกว่าคืนเงินให้ลูกค้าแล้ว (POST /api/payments/refunds/:chargeId/resolve)
function resolveRefund(chargeId: string, body: ResolveRefundRequest = {}): Promise<ResolveRefundResponse> {
  return apiRequest<ResolveRefundResponse>(`/payments/refunds/${seg(chargeId)}/resolve`, {
    method: "POST",
    body,
    errorMessage: "บันทึกการคืนเงินไม่สำเร็จ",
  });
}

export { getPaymentMethods, getEdcTerminals, getEdcReconciliation, createCharge, getChargeQrImage, verifyCharge, getRefunds, subscribeRefundEvents, resolveRefund };
