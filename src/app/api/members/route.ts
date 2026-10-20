// Import Library
import type { NextRequest } from "next/server";
// Import Data
import { getMembers } from "@/src/app/lib/data/members";
// Import Server
import { jsonRoute, readQuery } from "@/src/app/lib/server/route-handler";
// Import Types
import type { MemberListQuery } from "@/src/app/type/api/members";

// Route GET /api/members รายการสมาชิกพร้อมสถิติ
async function GET(request: NextRequest): Promise<Response> {
  return jsonRoute(() => getMembers(readQuery(request) as MemberListQuery));
}

export { GET };
