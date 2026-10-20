// Import Data
import { getDashboard } from "@/src/app/lib/data/dashboard";
// Import Server
import { jsonRoute } from "@/src/app/lib/server/route-handler";

// Route GET /api/dashboard สรุป dashboard ของวันนี้ (สำรองเมื่อ stream ไม่ส่ง snapshot)
async function GET(): Promise<Response> {
  return jsonRoute(() => getDashboard());
}

export { GET };
