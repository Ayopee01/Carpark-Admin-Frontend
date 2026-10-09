// Import Types
import type { PaymentChannelSettingsResponse, PaymentChannelUpdateRequest, PaymentMethodSettingsResponse, PaymentMethodUpdateRequest, PaymentSettingsMutationResponse } from "@/src/app/type/api/payment-settings";
// Import Shared
import { apiRequest, seg } from "@/src/app/lib/shared/http";

// Function ดึงการตั้งค่าวิธีชำระเงิน (GET /api/payment-settings/methods)
function getPaymentMethodSettings(): Promise<PaymentMethodSettingsResponse> {
  return apiRequest<PaymentMethodSettingsResponse>("/payment-settings/methods", { errorMessage: "โหลดวิธีชำระเงินไม่สำเร็จ" });
}

// Function แก้ไขวิธีชำระเงิน ได้แค่ success/message ต้องโหลดใหม่ (PATCH /api/payment-settings/methods/:id)
function updatePaymentMethodSetting(id: string, body: PaymentMethodUpdateRequest): Promise<PaymentSettingsMutationResponse> {
  return apiRequest<PaymentSettingsMutationResponse>(`/payment-settings/methods/${seg(id)}`, {
    method: "PATCH",
    body,
    errorMessage: "อัปเดตวิธีชำระเงินไม่สำเร็จ",
  });
}

// Function ดึงการตั้งค่าช่องทางบริการ (GET /api/payment-settings/channels)
function getPaymentChannelSettings(): Promise<PaymentChannelSettingsResponse> {
  return apiRequest<PaymentChannelSettingsResponse>("/payment-settings/channels", {
    errorMessage: "โหลดช่องทางบริการไม่สำเร็จ",
  });
}

// Function แก้ไขช่องทางบริการ ได้แค่ success/message ต้องโหลดใหม่ (PATCH /api/payment-settings/channels/:id)
function updatePaymentChannelSetting(id: string, body: PaymentChannelUpdateRequest): Promise<PaymentSettingsMutationResponse> {
  return apiRequest<PaymentSettingsMutationResponse>(`/payment-settings/channels/${seg(id)}`, {
    method: "PATCH",
    body,
    errorMessage: "ตั้งค่าช่องทางบริการไม่สำเร็จ",
  });
}

export { getPaymentMethodSettings, updatePaymentMethodSetting, getPaymentChannelSettings, updatePaymentChannelSetting };
