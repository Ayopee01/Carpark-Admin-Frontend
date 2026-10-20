import "server-only";
// Import Types
import type { AdminPaymentMethodsResponse, CreateChargeRequest, CreateChargeResponse, EdcTerminalsResponse, ResolveRefundRequest, ResolveRefundResponse, VerifyChargeResponse } from "@/src/app/type/api/payments";
// Import Server
import { backendJson, backendFile } from "@/src/app/lib/server/backend";
// Import Shared
import { seg } from "@/src/app/lib/shared/http";

// Function ดึงวิธีชำระที่เปิดใช้และอนุญาตในช่องทาง cashier (GET /api/payments/methods)
function getPaymentMethods(): Promise<AdminPaymentMethodsResponse> {
  return backendJson<AdminPaymentMethodsResponse>("/payments/methods", { errorMessage: "โหลดวิธีชำระเงินไม่สำเร็จ" });
}

// Function ดึงรายการเครื่อง EDC (GET /api/payments/edc/terminals)
function getEdcTerminals(): Promise<EdcTerminalsResponse> {
  return backendJson<EdcTerminalsResponse>("/payments/edc/terminals", { errorMessage: "โหลดรายการเครื่อง EDC ไม่สำเร็จ" });
}

// Function สร้าง QR PromptPay โดย backend สร้าง source ให้ (POST /api/payments/charges)
function createCharge(body: CreateChargeRequest): Promise<CreateChargeResponse> {
  return backendJson<CreateChargeResponse>("/payments/charges", {
    method: "POST",
    body,
    errorMessage: "สร้าง QR PromptPay ไม่สำเร็จ",
  });
}

// Function ดึงรูป QR ของ charge เป็น Response ให้ Route Handler ส่งต่อ (GET /api/payments/charges/:chargeId/qr)
function getChargeQrImage(chargeId: string): Promise<Response> {
  return backendFile(`/payments/charges/${seg(chargeId)}/qr`, { errorMessage: "โหลดรูป QR ไม่สำเร็จ" });
}

// Function ขอให้ backend ตรวจสถานะ charge กับ Omise อีกครั้ง (POST /api/payments/charges/:chargeId/verify)
function verifyCharge(chargeId: string): Promise<VerifyChargeResponse> {
  return backendJson<VerifyChargeResponse>(`/payments/charges/${seg(chargeId)}/verify`, {
    method: "POST",
    errorMessage: "ตรวจสอบการชำระเงินไม่สำเร็จ",
  });
}

// Function บันทึกว่าคืนเงินให้ลูกค้าแล้ว (POST /api/payments/refunds/:chargeId/resolve)
function resolveRefund(chargeId: string, body: ResolveRefundRequest = {}): Promise<ResolveRefundResponse> {
  return backendJson<ResolveRefundResponse>(`/payments/refunds/${seg(chargeId)}/resolve`, {
    method: "POST",
    body,
    errorMessage: "บันทึกการคืนเงินไม่สำเร็จ",
  });
}

export { getPaymentMethods, getEdcTerminals, createCharge, getChargeQrImage, verifyCharge, resolveRefund };
