// Import Library
import type { NextRequest } from "next/server";
// Import Data
import { getEdcReconciliation } from "@/src/app/lib/data/payments";
// Import Server
import { jsonRoute, readQuery } from "@/src/app/lib/server/route-handler";
// Import Types
import type { EdcReconciliationQuery } from "@/src/app/type/api/payments";

// Route GET /api/payments/edc/reconciliation ข้อมูลกระทบยอด EDC
async function GET(request: NextRequest): Promise<Response> {
  return jsonRoute(() => getEdcReconciliation(readQuery(request) as EdcReconciliationQuery));
}

export { GET };
