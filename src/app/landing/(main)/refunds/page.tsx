// Import Library
import type { JSX } from "react";
// Import Components
import { RefundsView } from "./RefundsView";
// Import Data
import { getRefunds } from "@/src/app/lib/data/payments";
// Import Server
import { renderPage } from "@/src/app/lib/server/render-page";

// Function หน้ารายการรอคืนเงิน ตรวจสิทธิ์และโหลดข้อมูลแรกฝั่ง server
async function RefundsPage(): Promise<JSX.Element> {
  return renderPage("/landing/refunds", async () => <RefundsView initialData={await getRefunds("pending")} />);
}

export default RefundsPage;
