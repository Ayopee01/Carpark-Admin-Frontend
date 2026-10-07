/* -------------------------------------- Overview Types -------------------------------------- */

// Type query ของ GET /overview (ไม่ส่งวันที่ = ต้นเดือนถึงวันนี้)
export interface OverviewQuery {
  start_date?: string; // YYYY-MM-DD หรือ date-time (ไม่มี timezone = เวลาไทย)
  end_date?: string;
}

// Type จุดข้อมูลของกราฟการใช้งาน รูปแบบขึ้นกับ UsageChartMode
export type UsageChartItem =
  | { label: string; date: string; value: number } // daily (ไม่เกิน 7 วัน)
  | { label: string; startDate: string; endDate: string; value: number } // weekly (ไม่เกิน 31 วัน)
  | { label: string; month: string; value: number } // monthly YYYY-MM (ไม่เกิน 12 เดือน)
  | { label: string; year: number; value: number }; // รายปี

// Type ความละเอียดของกราฟการใช้งาน
export type UsageChartMode = "daily" | "weekly" | "monthly" | "yearly";

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
  usageChartLabel: string;
  usageChart: UsageChartItem[];
  serviceSummary: OverviewServiceSummaryItem[];
  totalSummaryCalculated: number;
}

// Type event ของ GET /overview/events (connected/ping จัดการใน subscribeSse)
export type OverviewStreamEvent =
  | {
      type: "overview_snapshot" | "overview_updated";
      // null ตอน snapshot, reason เช่น payment_processed, transaction_updated, day_changed
      trigger: { reason: string; transactionId: string | null; plateNo: string | null; at: string } | null;
      data: OverviewSummary;
      generatedAt: string;
    }
  | { type: "overview_error"; message: string; generatedAt: string };
