// Import Data
import { getPricing } from "@/src/app/lib/data/pricing";
// Import Server
import { jsonRoute } from "@/src/app/lib/server/route-handler";

// Route GET /api/pricing กฎค่าบริการทั้งหมด
async function GET(): Promise<Response> {
  return jsonRoute(() => getPricing());
}

export { GET };
