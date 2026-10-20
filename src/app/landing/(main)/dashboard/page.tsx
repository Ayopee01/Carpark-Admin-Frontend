// Import Library
import type { JSX } from "react";
// Import Components
import { DashboardView } from "./DashboardView";
// Import Server
import { renderPage } from "@/src/app/lib/server/render-page";

// Function หน้าสรุป dashboard ของวันนี้ ตรวจสิทธิ์ฝั่ง server ส่วนข้อมูลมาจาก snapshot ของ SSE ทันทีที่ต่อ stream
async function DashboardPage(): Promise<JSX.Element> {
  return renderPage("/landing/dashboard", () => <DashboardView />);
}

export default DashboardPage;
