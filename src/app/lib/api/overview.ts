// Import Types
import type { OverviewQuery, OverviewStreamEvent, OverviewSummary } from "@/src/app/type/api/overview";
import type { SseOptions } from "@/src/app/type/api/common";
// Import Shared
import { apiRequest, subscribeSse } from "@/src/app/lib/shared/http";

// Function ดึงภาพรวมตามช่วงวันที่ ไม่ส่งวันที่ = ต้นเดือนถึงวันนี้ (GET /api/overview)
function getOverview(query: OverviewQuery = {}): Promise<OverviewSummary> {
  return apiRequest<OverviewSummary>("/overview", { query: { ...query }, errorMessage: "ไม่สามารถดึงข้อมูลภาพรวมได้" });
}

// Function เปิด SSE รับภาพรวมใหม่ตาม filter เดียวกัน (GET /api/overview/events)
function subscribeOverviewEvents(query: OverviewQuery, options: SseOptions<OverviewStreamEvent>): () => void {
  return subscribeSse("/overview/events", { ...options, query: { ...query } });
}

export { getOverview, subscribeOverviewEvents };
