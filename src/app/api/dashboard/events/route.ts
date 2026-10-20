// Import Library
import type { NextRequest } from "next/server";
// Import Server
import { eventStreamRoute } from "@/src/app/lib/server/route-handler";

// Route GET /api/dashboard/events ส่งต่อ SSE ของ dashboard
async function GET(request: NextRequest): Promise<Response> {
  return eventStreamRoute(request, "/dashboard/events");
}

export { GET };
