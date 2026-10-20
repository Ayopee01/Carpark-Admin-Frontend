// Import Types
import type { PaymentChannelCode, PaymentChannelId, PaymentMethodId, RefundListItem, RefundRequiredEvent, RefundResolvedEvent, Satang } from "./payments";

/* -------------------------------------- Dashboard Types -------------------------------------- */

// Type ยอดรายได้แยกตามกลุ่ม (พนักงาน / สแกนจ่าย)
export interface DashboardRevenueGroup {
  id: "staff" | "scan";
  amount: number;
  percent: number;
}

// Type ยอดรายได้และจำนวนรายการแยกตามช่องทางชำระ
export interface DashboardChannelBreakdown {
  id: PaymentChannelId;
  code: PaymentChannelCode;
  icon: string;
  name: string;
  label: string;
  subLabel: string; // "" เสมอ
  allowedMethods: PaymentMethodId[]; // ค่าในโค้ด backend ไม่ใช่ payment settings ห้ามใช้แทน settings
  amount: number;
  count: number;
  percent: number;
}

// Type รายการรอคืนเงินทั้งหมด (ไม่จำกัดวัน) เงินเป็นสตางค์
export interface DashboardRefunds {
  pendingCount: number;
  pendingAmount: Satang;
  pending: RefundListItem[];
}

// Type response ของ GET /dashboard (ต้องมีสิทธิ์ dashboard)
export interface DashboardSummary {
  summaryCards: { totalTickets: number; paidCount: number; pendingCount: number; paidRevenue: number };
  revenueGroups: DashboardRevenueGroup[];
  channelBreakdown: DashboardChannelBreakdown[];
  refunds?: DashboardRefunds | null; // null เมื่อไม่มีสิทธิ์ transactions (undefined = backend เวอร์ชันก่อนมี field นี้)
  isRealtime: true;
}

// Type data ของ dashboard_snapshot/dashboard_updated เมื่อผู้ใช้มีแค่สิทธิ์ transactions (ไม่มีสถิติ dashboard)
export interface DashboardRefundsOnly {
  refunds?: DashboardRefunds;
}

// Type แจ้งเตือน IP ของอุปกรณ์ (changed = IP เปลี่ยน, blocked = token ถูกแต่ IP ไม่อยู่ใน allowedIps)
export interface DeviceIpAlertEvent {
  type: "device_ip_changed" | "device_ip_blocked";
  deviceId: string | null;
  deviceName: string;
  deviceType: string;
  ip: string;
  previousIp: string | null;
  at: string;
}

// Type event ของ GET /dashboard/events stream กลางของ Admin layout (connected/ping/session_revoked จัดการใน subscribeSse)
// event คืนเงิน, payment_settings_updated และ IP อุปกรณ์ ส่งเฉพาะผู้ใช้ที่มีสิทธิ์ transactions
export type DashboardStreamEvent =
  | {
      type: "dashboard_snapshot" | "dashboard_updated";
      // null ตอน snapshot, reason เช่น payment_processed, transaction_updated, day_changed
      trigger: { reason: string; transactionId: string | null; plateNo: string | null; at: string } | null;
      data: DashboardSummary | DashboardRefundsOnly; // ตรวจ "summaryCards" in data ก่อนใช้เป็น dashboard
      generatedAt: string;
    }
  | { type: "dashboard_error"; message: string; generatedAt: string }
  | RefundRequiredEvent
  | RefundResolvedEvent
  | { type: "payment_settings_updated"; at: string }
  | DeviceIpAlertEvent;
