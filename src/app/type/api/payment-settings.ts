// Import Types
import type { PaymentChannelCode, PaymentChannelId, PaymentMethodId } from "./payments";

/* -------------------------------------- Payment Settings Types -------------------------------------- */

// Type การตั้งค่าวิธีชำระเงิน
export interface PaymentMethodSetting {
  id: PaymentMethodId; // แก้ไม่ได้
  label: string;
  icon: string | null;
  isActive: boolean;
}

// Type การตั้งค่าช่องทางบริการและวิธีชำระที่อนุญาต
export interface PaymentChannelSetting {
  id: PaymentChannelId;
  code: PaymentChannelCode; // id ที่ตัด ch_ ออก
  name: string;
  icon: string;
  allowedMethods: PaymentMethodId[];
}

// Type response ของ GET /payment-settings/methods
export interface PaymentMethodSettingsResponse {
  data: PaymentMethodSetting[];
  configUpdatedAt: string | null;
}

// Type body ของ PATCH /payment-settings/methods/:id
export interface PaymentMethodUpdateRequest {
  label?: string;
  icon?: string | null;
  isActive?: boolean;
}

// Type response ของ GET /payment-settings/channels
export interface PaymentChannelSettingsResponse {
  data: PaymentChannelSetting[];
  configUpdatedAt: string | null;
}

// Type body ของ PATCH /payment-settings/channels/:id
export interface PaymentChannelUpdateRequest {
  allowedMethods: PaymentMethodId[];
}

// Type response ของ PATCH วิธีชำระ/ช่องทาง ต้องโหลดรายการใหม่
export interface PaymentSettingsMutationResponse {
  success: true;
  message: string;
}
