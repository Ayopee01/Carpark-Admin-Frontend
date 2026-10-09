// Import Types
import type { VehicleType } from "./transactions";

/* -------------------------------------- Pricing Types -------------------------------------- */

// Type ประเภทค่าบริการ
export type FeeType = "base_hour" | "next_hour" | "overnight_day";

// Type สถานะของกฎค่าบริการ (ไม่ใช่ active = ไม่ถูกใช้คิดเงิน)
export type PricingRuleStatus = "active" | "inactive";

// Type field ที่กฎค่าบริการทุกประเภทมี
interface PricingRuleBase {
  id: string;
  name: string;
  vehicleType: VehicleType;
  price: number;
  status: PricingRuleStatus;
}

// Type กฎค่าบริการที่บันทึกไว้ แยกด้วย feeType
export type PricingRule =
  | (PricingRuleBase & { feeType: "base_hour"; hourStart: 1; hourEnd: number })
  | (PricingRuleBase & { feeType: "next_hour"; hourStart: number | null; hourEnd: number | null }) // hourEnd null = ถึงชั่วโมงที่ 24
  | (PricingRuleBase & { feeType: "overnight_day" });

// Type กฎค่าบริการที่ส่งใน PUT /pricing (ไม่ส่ง id = กฎใหม่)
export interface PricingRuleBody {
  id?: string;
  name?: string | null;
  feeType?: FeeType;
  vehicleType?: VehicleType;
  price: number | string; // ต้องมีทุกกฎ
  hourStart?: number | string;
  hourEnd?: number | string | null;
  status?: PricingRuleStatus;
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
