// Import Types
import type { VehicleType } from "./transactions";

/* -------------------------------------- Pricing Types -------------------------------------- */

// Type ประเภทค่าบริการ
export type FeeType = "base_hour" | "next_hour" | "overnight_day";

// Type กฎค่าบริการที่บันทึกไว้
export interface PricingRule {
  id: string;
  name: string;
  feeType: FeeType;
  vehicleType: VehicleType;
  price: number;
  status: "active" | (string & {}); // ไม่ใช่ active = ไม่ถูกใช้คิดเงิน
  hourStart?: number | null; // base_hour เป็น 1 เสมอ, next_hour 1-24
  hourEnd?: number | null; // 1-24 (next_hour เป็น null = ถึงชั่วโมงที่ 24)
  baseHours?: number; // base_hour เท่ากับ hourEnd
}

// Type กฎค่าบริการที่ส่งใน PUT /pricing (ไม่ส่ง id = กฎใหม่)
export interface PricingRuleBody {
  id?: string;
  name?: string | null;
  feeType?: FeeType;
  vehicleType?: VehicleType;
  price: number | string; // ต้องมีทุกกฎ
  baseHours?: number | string;
  hourStart?: number | string;
  hourEnd?: number | string | null;
  status?: string;
}

// Type response ของ GET /pricing
export interface PricingConfigResponse {
  pricingRules: PricingRule[];
  configUpdatedAt: string | null;
}

// Type body ของ PUT /pricing แทนที่กฎทั้งชุด (กฎที่ไม่ส่งจะถูกลบ)
export interface PricingUpdateRequest {
  configUpdatedAt?: string | null; // จาก GET หรือ PUT ครั้งก่อน
  pricingRules?: PricingRuleBody[];
  paymentChannels?: unknown[];
  serviceChannelMapping?: unknown[];
  masterData?: Record<string, unknown>;
}

// Type response ของ PUT /pricing
export interface PricingUpdateResponse {
  success: true;
  message: "Pricing config updated";
  configUpdatedAt: string | null;
}
