// Import Data
import { getPaymentMethods } from "@/src/app/lib/data/payments";
// Import Server
import { jsonRoute } from "@/src/app/lib/server/route-handler";

// Route GET /api/payments/methods วิธีชำระที่เปิดใช้ในช่องทาง cashier
async function GET(): Promise<Response> {
  return jsonRoute(() => getPaymentMethods());
}

export { GET };
