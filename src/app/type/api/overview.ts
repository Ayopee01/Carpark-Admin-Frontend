// Import Types
import type { EdcReconciliation, RefundListItem } from "./payments";
import type { StreamErrorEvent, StreamUpdatedEvent } from "./realtime";

/* -------------------------------------- Overview Types -------------------------------------- */

// Type query ของ GET /overview (ไม่ส่งวันที่ = ต้นเดือนถึงวันนี้)
export interface OverviewQuery {
  start_date?: string; // YYYY-MM-DD หรือ date-time (ไม่มี timezone = เวลาไทย)
  end_date?: string;
  include?: "edc_payments"; // ส่ง edcReconciliation.terminals[].payments ด้วย (ช่วงไม่เกิน 31 วัน, ใช้กับ GET เท่านั้น)
}

// Type จุดข้อมูลของกราฟการใช้งาน รูปแบบขึ้นกับ UsageChartMode
export type UsageChartItem =
  | { label: string; date: string; value: number } // daily (ไม่เกิน 7 วัน)
  | { label: string; startDate: string; endDate: string; value: number } // weekly (ไม่เกิน 31 วัน)
  | { label: string; month: string; value: number } // monthly YYYY-MM (ไม่เกิน 12 เดือน)
  | { label: string; year: number; value: number }; // รายปี

// Type ความละเอียดของกราฟการใช้งาน
export type UsageChartMode = "daily" | "weekly" | "monthly" | "yearly";

// Type ชื่อที่แสดงของความละเอียดกราฟ (คู่กับ UsageChartMode)
export type UsageChartLabel = "รายวัน" | "รายสัปดาห์" | "รายเดือน" | "รายปี";

// Type ยอดรายได้แยกตามกลุ่ม (พนักงาน / สแกนจ่าย)
export interface OverviewRevenueGroup {
  id: "staff" | "scan";
  label: string;
  amount: number;
  percent: number;
}

// Type ยอดรายได้แยกตามบริการ
export interface OverviewServiceSummaryItem {
  id: "cashier" | "epayment" | "kiosk" | "gate";
  label: string;
  amount: number;
  count: number;
  percent: number;
  icon: string;
}

// Type response ของ GET /overview
export interface OverviewSummary {
  filters: { startDate: string; endDate: string };
  chartFilters: { startDate: string; endDate: string }; // เท่ากับ filters เสมอ
  summaryCards: { totalTickets: number; paidCount: number; pendingCount: number; paidRevenue: number; avgWait: null };
  revenueGroups: OverviewRevenueGroup[];
  usageChartMode: UsageChartMode;
  usageChartLabel: UsageChartLabel;
  usageChart: UsageChartItem[];
  serviceSummary: OverviewServiceSummaryItem[];
  totalSummaryCalculated: number;
  // null เมื่อผู้ใช้ไม่มีสิทธิ์ transactions (undefined = backend เวอร์ชันก่อนมี field นี้ ซ่อนเหมือน null)
  refundHistory?: RefundListItem[] | null; // คืนแล้วที่ refundResolvedAt อยู่ในช่วงวันที่ ใหม่สุดก่อน (เงินเป็นสตางค์)
  edcReconciliation?: EdcReconciliation | null; // ยอดเป็นบาท
}

// Type payload ของ overview:subscribe (query เดียวกับ GET /overview แต่ไม่รับ include)
export type OverviewStreamQuery = Omit<OverviewQuery, "include">;

// Type event ของ stream overview (Socket.IO overview:subscribe) snapshot = ผลจาก ack ตอน subscribe
export type OverviewStreamEvent =
  | { type: "overview_snapshot"; data: OverviewSummary }
  | ({ type: "overview_updated" } & StreamUpdatedEvent<OverviewSummary>)
  | ({ type: "overview_error" } & StreamErrorEvent);
