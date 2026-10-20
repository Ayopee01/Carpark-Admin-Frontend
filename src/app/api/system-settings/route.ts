// Import Data
import { getSystemSettings } from "@/src/app/lib/data/system-settings";
// Import Server
import { jsonRoute } from "@/src/app/lib/server/route-handler";

// Route GET /api/system-settings การตั้งค่าระบบรวมใบเสร็จและ printer
async function GET(): Promise<Response> {
  return jsonRoute(() => getSystemSettings());
}

export { GET };
