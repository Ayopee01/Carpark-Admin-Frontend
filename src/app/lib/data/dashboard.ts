import "server-only";
// Import Types
import type { DashboardSummary } from "@/src/app/type/api/dashboard";
// Import Server
import { backendJson } from "@/src/app/lib/server/backend";

// Function ดึงสรุป dashboard ของวันนี้ (GET /api/dashboard)
function getDashboard(): Promise<DashboardSummary> {
  return backendJson<DashboardSummary>("/dashboard", { errorMessage: "ไม่สามารถดึงข้อมูล Dashboard ได้" });
}


export { getDashboard };
