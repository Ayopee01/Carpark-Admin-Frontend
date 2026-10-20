"use server";
// Import Data
import * as paymentSettingsData from "@/src/app/lib/data/payment-settings";
// Import Server
import { runAction } from "@/src/app/lib/server/action";
// Import Types
import type { ActionResult } from "@/src/app/type/api/common";
import type { PaymentChannelUpdateRequest, PaymentMethodUpdateRequest, PaymentSettingsMutationResponse } from "@/src/app/type/api/payment-settings";

// Server Action แก้ไขวิธีชำระเงิน (ได้แค่ success/message ต้องโหลดใหม่)
async function updatePaymentMethodSetting(id: string, body: PaymentMethodUpdateRequest): Promise<ActionResult<PaymentSettingsMutationResponse>> {
  return runAction(() => paymentSettingsData.updatePaymentMethodSetting(id, body));
}

// Server Action แก้ไขช่องทางบริการ (ได้แค่ success/message ต้องโหลดใหม่)
async function updatePaymentChannelSetting(id: string, body: PaymentChannelUpdateRequest): Promise<ActionResult<PaymentSettingsMutationResponse>> {
  return runAction(() => paymentSettingsData.updatePaymentChannelSetting(id, body));
}

export { updatePaymentMethodSetting, updatePaymentChannelSetting };
