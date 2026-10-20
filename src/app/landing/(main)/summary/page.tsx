// Import Library
import type { JSX } from "react";
// Import Components
import { SummaryView } from "./SummaryView";
// Import Server
import { renderPage } from "@/src/app/lib/server/render-page";

// Function หน้าภาพรวมตามช่วงวันที่ ตรวจสิทธิ์ฝั่ง server ส่วนข้อมูลมาจาก snapshot ของ SSE ตามช่วงวันที่ที่เลือก
async function SummaryPage(): Promise<JSX.Element> {
  return renderPage("/landing/summary", () => <SummaryView />);
}

export default SummaryPage;
