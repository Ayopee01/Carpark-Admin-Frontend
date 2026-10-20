"use server";
// Import Data
import * as pricingData from "@/src/app/lib/data/pricing";
// Import Server
import { runAction } from "@/src/app/lib/server/action";
// Import Types
import type { ActionResult } from "@/src/app/type/api/common";
import type { PricingUpdateRequest, PricingUpdateResponse } from "@/src/app/type/api/pricing";

// Server Action บันทึกกฎค่าบริการทั้งชุด (ส่ง configUpdatedAt ล่าสุดเพื่อกันทับกัน)
async function updatePricing(body: PricingUpdateRequest): Promise<ActionResult<PricingUpdateResponse>> {
  return runAction(() => pricingData.updatePricing(body));
}

export { updatePricing };
