// Import Library
import type { JSX } from "react";
// Import Components
import { MemberView } from "./MemberView";
// Import Data
import { getMembers } from "@/src/app/lib/data/members";
// Import Server
import { renderPage } from "@/src/app/lib/server/render-page";

// Function หน้าจัดการสมาชิก ตรวจสิทธิ์และโหลดข้อมูลแรกฝั่ง server
async function MemberPage(): Promise<JSX.Element> {
  return renderPage("/landing/member", async () => <MemberView initialData={await getMembers()} />);
}

export default MemberPage;
