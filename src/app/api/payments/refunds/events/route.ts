// Import Library
import type { NextRequest } from "next/server";
// Import Server
import { eventStreamRoute } from "@/src/app/lib/server/route-handler";

// Route GET /api/payments/refunds/events ส่งต่อ SSE รายการรอคืนเงิน
async function GET(request: NextRequest): Promise<Response> {
  return eventStreamRoute(request, "/payments/refunds/events");
}

export { GET };
