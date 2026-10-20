import "server-only";
// Import Types
import type { PricingConfigResponse, PricingUpdateRequest, PricingUpdateResponse } from "@/src/app/type/api/pricing";
// Import Server
import { backendJson } from "@/src/app/lib/server/backend";

// Function ดึงกฎค่าบริการทั้งหมด (GET /api/pricing)
function getPricing(): Promise<PricingConfigResponse> {
  return backendJson<PricingConfigResponse>("/pricing", { errorMessage: "โหลดข้อมูลค่าบริการไม่สำเร็จ" });
}

// Function บันทึกกฎค่าบริการทั้งชุด ส่ง configUpdatedAt ล่าสุดเพื่อกันทับกัน (PUT /api/pricing)
function updatePricing(body: PricingUpdateRequest): Promise<PricingUpdateResponse> {
  return backendJson<PricingUpdateResponse>("/pricing", { method: "PUT", body, errorMessage: "บันทึกข้อมูลไม่สำเร็จ" });
}

export { getPricing, updatePricing };
