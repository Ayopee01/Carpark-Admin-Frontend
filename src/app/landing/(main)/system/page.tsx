// Import Library
import type { JSX } from "react";
// Import Components
import { SystemView } from "./SystemView";
// Import Server
import { renderPage } from "@/src/app/lib/server/render-page";

// Function หน้าตั้งค่าระบบ ตรวจสิทธิ์ฝั่ง server ส่วนข้อมูลของแต่ละแท็บโหลดเมื่อเปิดแท็บ
async function SystemPage(): Promise<JSX.Element> {
  return renderPage("/landing/system", () => <SystemView />);
}

export default SystemPage;
