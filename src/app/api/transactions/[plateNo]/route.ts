// Import Library
import type { NextRequest } from "next/server";
// Import Data
import { getTransactionByPlate } from "@/src/app/lib/data/transactions";
// Import Server
import { jsonRoute } from "@/src/app/lib/server/route-handler";

// Route GET /api/transactions/:plateNo transaction ล่าสุดของทะเบียนที่ตรงทุกตัว
async function GET(_request: NextRequest, { params }: { params: Promise<{ plateNo: string }> }): Promise<Response> {
  const { plateNo } = await params;
  return jsonRoute(() => getTransactionByPlate(plateNo));
}

export { GET };
