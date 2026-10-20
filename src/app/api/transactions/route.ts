// Import Library
import type { NextRequest } from "next/server";
// Import Data
import { getTransactions } from "@/src/app/lib/data/transactions";
// Import Server
import { jsonRoute, readQuery } from "@/src/app/lib/server/route-handler";
// Import Types
import type { TransactionListQuery } from "@/src/app/type/api/transactions";

// Route GET /api/transactions รายการรถเข้าออกพร้อม pagination
async function GET(request: NextRequest): Promise<Response> {
  return jsonRoute(() => getTransactions(readQuery(request) as TransactionListQuery));
}

export { GET };
