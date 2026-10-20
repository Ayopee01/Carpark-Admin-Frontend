import "server-only";
// Import Types
import type { OverviewQuery, OverviewSummary } from "@/src/app/type/api/overview";
// Import Server
import { backendJson } from "@/src/app/lib/server/backend";

// Function ดึงภาพรวมตามช่วงวันที่ ไม่ส่งวันที่ = ต้นเดือนถึงวันนี้ (GET /api/overview)
function getOverview(query: OverviewQuery = {}): Promise<OverviewSummary> {
  return backendJson<OverviewSummary>("/overview", { query: { ...query }, errorMessage: "ไม่สามารถดึงข้อมูลภาพรวมได้" });
}


export { getOverview };
