// Import Data
import { getPaymentChannelSettings } from "@/src/app/lib/data/payment-settings";
// Import Server
import { jsonRoute } from "@/src/app/lib/server/route-handler";

// Route GET /api/payment-settings/channels การตั้งค่าช่องทางบริการ
async function GET(): Promise<Response> {
  return jsonRoute(() => getPaymentChannelSettings());
}

export { GET };
