// Import Library
import type { NextRequest } from "next/server";
// Import Data
import { getDevices } from "@/src/app/lib/data/devices";
// Import Server
import { jsonRoute, readQuery } from "@/src/app/lib/server/route-handler";
// Import Types
import type { DeviceListQuery } from "@/src/app/type/api/devices";

// Route GET /api/devices รายการอุปกรณ์พร้อมจำนวน online/offline
async function GET(request: NextRequest): Promise<Response> {
  return jsonRoute(() => getDevices(readQuery(request) as DeviceListQuery));
}

export { GET };
