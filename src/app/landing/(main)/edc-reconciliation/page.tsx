// Import Library
import type { JSX } from "react";
// Import Components
import { EdcReconciliationView } from "./EdcReconciliationView";
// Import Data
import { getEdcReconciliation } from "@/src/app/lib/data/payments";
// Import Server
import { renderPage } from "@/src/app/lib/server/render-page";

// Function หน้ากระทบยอด EDC ตรวจสิทธิ์และโหลดข้อมูลแรกฝั่ง server
async function EdcReconciliationPage(): Promise<JSX.Element> {
  return renderPage("/landing/edc-reconciliation", async () => <EdcReconciliationView initialData={await getEdcReconciliation()} />);
}

export default EdcReconciliationPage;
