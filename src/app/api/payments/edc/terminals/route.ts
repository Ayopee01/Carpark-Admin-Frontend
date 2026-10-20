// Import Data
import { getEdcTerminals } from "@/src/app/lib/data/payments";
// Import Server
import { jsonRoute } from "@/src/app/lib/server/route-handler";

// Route GET /api/payments/edc/terminals รายการเครื่อง EDC
async function GET(): Promise<Response> {
  return jsonRoute(() => getEdcTerminals());
}

export { GET };
