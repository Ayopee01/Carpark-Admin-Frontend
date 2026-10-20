// Import Library
import type { NextRequest } from "next/server";
// Import Data
import { getOverview } from "@/src/app/lib/data/overview";
// Import Server
import { jsonRoute, readQuery } from "@/src/app/lib/server/route-handler";
// Import Types
import type { OverviewQuery } from "@/src/app/type/api/overview";

// Route GET /api/overview ภาพรวมตามช่วงวันที่
async function GET(request: NextRequest): Promise<Response> {
  return jsonRoute(() => getOverview(readQuery(request) as OverviewQuery));
}

export { GET };
