// Import Library
import type { NextRequest } from "next/server";
// Import Data
import { getRefunds } from "@/src/app/lib/data/payments";
// Import Server
import { jsonRoute } from "@/src/app/lib/server/route-handler";
// Import Types
import type { RefundStatusFilter } from "@/src/app/type/api/payments";

// Route GET /api/payments/refunds รายการรอคืนเงินตามสถานะ
async function GET(request: NextRequest): Promise<Response> {
  return jsonRoute(() => getRefunds((request.nextUrl.searchParams.get("status") ?? "pending") as RefundStatusFilter));
}

export { GET };
