// Import Types
import type { PaymentChannelCode, PaymentMethodId } from "./payments";

/* -------------------------------------- Dashboard Types -------------------------------------- */

// Type ยอดรายได้แยกตามกลุ่ม (พนักงาน / สแกนจ่าย)
export interface DashboardRevenueGroup {
  id: "staff" | "scan";
  amount: number;
  percent: number;
}

// Type ยอดรายได้และจำนวนรายการแยกตามช่องทางชำระ
export interface DashboardChannelBreakdown {
  id: "ch_cashier" | "ch_kiosk" | "ch_mobile" | "ch_gate";
  code: PaymentChannelCode;
  icon: string;
  name: string;
  label: string;
  subLabel: string;
  allowedMethods: PaymentMethodId[];
  amount: number;
  count: number;
  percent: number;
}

// Type response ของ GET /dashboard
export interface DashboardSummary {
  summaryCards: { totalTickets: number; paidCount: number; pendingCount: number; paidRevenue: number };
  revenueGroups: DashboardRevenueGroup[];
  channelBreakdown: DashboardChannelBreakdown[];
  pendingRefunds: { count: number; amount: number }; // บาท
  isRealtime: true;
}

// Type event ของ GET /dashboard/events (connected/ping จัดการใน subscribeSse)
export type DashboardStreamEvent =
  | {
      type: "dashboard_snapshot" | "dashboard_updated";
      // null ตอน snapshot, reason เช่น payment_processed, transaction_updated, day_changed
      trigger: { reason: string; transactionId: string | null; plateNo: string | null; at: string } | null;
      data: DashboardSummary;
      generatedAt: string;
    }
  | { type: "dashboard_error"; message: string; generatedAt: string };
