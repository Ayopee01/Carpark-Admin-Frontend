// Import Library
import type { JSX } from "react";
// Import Components
import { SummaryView } from "./SummaryView";
// Import Server
import { renderPage } from "@/src/app/lib/server/render-page";

// Function หน้าภาพรวมตามช่วงวันที่ ตรวจสิทธิ์ฝั่ง server ส่วนข้อมูลมาจาก snapshot ของ stream overview (Socket.IO) ตามช่วงวันที่ที่เลือก
// ?tab=refunds|edc เปิด tab นั้นก่อน (เช่นลิงก์ประวัติคืนเงินจาก drawer)
async function SummaryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<JSX.Element> {
  const { tab } = await searchParams;
  return renderPage("/landing/summary", () => <SummaryView initialTab={typeof tab === "string" ? tab : undefined} />);
}

export default SummaryPage;
