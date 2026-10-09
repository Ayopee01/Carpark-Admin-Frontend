// Import Types
import type { DashboardStreamEvent, DashboardSummary } from "@/src/app/type/api/dashboard";
import type { SseOptions } from "@/src/app/type/api/common";
// Import Shared
import { apiRequest, subscribeSse } from "@/src/app/lib/shared/http";

// Function ดึงสรุป dashboard ของวันนี้ (GET /api/dashboard)
function getDashboard(): Promise<DashboardSummary> {
  return apiRequest<DashboardSummary>("/dashboard", { errorMessage: "ไม่สามารถดึงข้อมูล Dashboard ได้" });
}

// Function เปิด SSE รับ dashboard ใหม่เมื่อข้อมูลเปลี่ยน (GET /api/dashboard/events)
function subscribeDashboardEvents(options: SseOptions<DashboardStreamEvent>): () => void {
  return subscribeSse("/dashboard/events", options);
}

export { getDashboard, subscribeDashboardEvents };
