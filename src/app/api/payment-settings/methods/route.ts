// Import Data
import { getPaymentMethodSettings } from "@/src/app/lib/data/payment-settings";
// Import Server
import { jsonRoute } from "@/src/app/lib/server/route-handler";

// Route GET /api/payment-settings/methods การตั้งค่าวิธีชำระเงิน
async function GET(): Promise<Response> {
  return jsonRoute(() => getPaymentMethodSettings());
}

export { GET };
