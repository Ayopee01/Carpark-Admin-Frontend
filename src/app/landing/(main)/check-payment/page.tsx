// Import Library
import type { JSX } from "react";
// Import Components
import { CheckPaymentView } from "./CheckPaymentView";
// Import Server
import { renderPage } from "@/src/app/lib/server/render-page";

// Function หน้าตรวจสอบรายการรถ ตรวจสิทธิ์ฝั่ง server ส่วนข้อมูลมาจาก stream รายการรถ (Socket.IO) แบบ realtime
async function CheckPaymentPage(): Promise<JSX.Element> {
  return renderPage("/landing/check-payment", () => <CheckPaymentView />);
}

export default CheckPaymentPage;
