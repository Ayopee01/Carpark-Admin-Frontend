// Import Library
import type { NextRequest } from "next/server";
// Import Server
import { eventStreamRoute } from "@/src/app/lib/server/route-handler";

// Route GET /api/transactions/events ส่งต่อ SSE ของรายการรถตาม query เดียวกับ list
async function GET(request: NextRequest): Promise<Response> {
  return eventStreamRoute(request, "/transactions/events");
}

export { GET };
