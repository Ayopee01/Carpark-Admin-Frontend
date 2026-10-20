// Import Library
import type { NextRequest } from "next/server";
// Import Server
import { eventStreamRoute } from "@/src/app/lib/server/route-handler";

// Route GET /api/overview/events ส่งต่อ SSE ของภาพรวมตาม filter เดียวกัน
async function GET(request: NextRequest): Promise<Response> {
  return eventStreamRoute(request, "/overview/events");
}

export { GET };
