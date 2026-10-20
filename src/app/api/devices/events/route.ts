// Import Library
import type { NextRequest } from "next/server";
// Import Server
import { eventStreamRoute } from "@/src/app/lib/server/route-handler";

// Route GET /api/devices/events ส่งต่อ SSE สถานะอุปกรณ์
async function GET(request: NextRequest): Promise<Response> {
  return eventStreamRoute(request, "/devices/events");
}

export { GET };
