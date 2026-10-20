// Import Data
import { getTheme } from "@/src/app/lib/data/theme";
// Import Server
import { jsonRoute } from "@/src/app/lib/server/route-handler";

// Route GET /api/theme สีและโลโก้ล่าสุด
async function GET(): Promise<Response> {
  return jsonRoute(() => getTheme());
}

export { GET };
