// Import Types
import type { DeviceType } from "./devices";
import type { PaymentChannelCode, PaymentChannelId, PaymentMethodId, RefundListItem, RefundRequiredEvent, RefundResolvedEvent, Satang } from "./payments";
import type { StreamErrorEvent, StreamUpdatedEvent } from "./realtime";

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

// Type data ของ snapshot/dashboard:updated เมื่อผู้ใช้มีแค่สิทธิ์ transactions (ไม่มีสถิติ dashboard)
export interface DashboardRefundsOnly {
  refunds?: DashboardRefunds;
}

// Type แจ้งเตือน IP ของอุปกรณ์ device_alerts:event (changed = IP เปลี่ยน, blocked = token ถูกแต่ IP ไม่อยู่ใน allowedIps)
export interface DeviceIpAlertEvent {
  type: "device_ip_changed" | "device_ip_blocked";
  deviceId: string | null;
  deviceName: string;
  deviceType: DeviceType;
  ip: string;
  previousIp: string | null;
  at: string;
}

// Type event payment_settings:updated ให้โหลดวิธีชำระใหม่
export interface PaymentSettingsUpdatedEvent {
  type: "payment_settings_updated";
  at: string;
}

// Type event ของ stream dashboard (Socket.IO dashboard:subscribe) ที่ lib/client/events แปลงชื่อ event เป็น type
// snapshot = ผลจาก ack ตอน subscribe (ส่งใหม่ทุกครั้งที่ต่อใหม่), event คืนเงิน / payment settings / IP อุปกรณ์ ส่งเฉพาะผู้ใช้ที่มีสิทธิ์ transactions
export type DashboardStreamEvent =
  | { type: "dashboard_snapshot"; data: DashboardSummary | DashboardRefundsOnly } // ตรวจ "summaryCards" in data ก่อนใช้เป็น dashboard
  | ({ type: "dashboard_updated" } & StreamUpdatedEvent<DashboardSummary | DashboardRefundsOnly>)
  | ({ type: "dashboard_error" } & StreamErrorEvent)
  | RefundRequiredEvent
  | RefundResolvedEvent
  | PaymentSettingsUpdatedEvent
  | DeviceIpAlertEvent;
