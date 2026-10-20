// Import Library
import type { JSX } from "react";
// Import Components
import { DeviceView } from "./DeviceView";
// Import Server
import { renderPage } from "@/src/app/lib/server/render-page";

// Function หน้าตั้งค่าอุปกรณ์ ตรวจสิทธิ์ฝั่ง server ส่วนข้อมูลของแต่ละแท็บโหลดเมื่อเปิดแท็บ
async function DevicePage(): Promise<JSX.Element> {
  return renderPage("/landing/device", () => <DeviceView />);
}

export default DevicePage;
