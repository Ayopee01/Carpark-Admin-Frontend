// Import Library
import type { NextRequest } from "next/server";
// Import Data
import { getChargeQrImage } from "@/src/app/lib/data/payments";
// Import Server
import { fileRoute } from "@/src/app/lib/server/route-handler";

// Route GET /api/payments/charges/:chargeId/qr ส่งต่อรูป QR ของ charge
async function GET(_request: NextRequest, { params }: { params: Promise<{ chargeId: string }> }): Promise<Response> {
  const { chargeId } = await params;
  return fileRoute(() => getChargeQrImage(chargeId));
}

export { GET };
