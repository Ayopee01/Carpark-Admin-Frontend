// Import Client
import { subscribeSse } from "./http";
// Import Types
import type { SseOptions } from "@/src/app/type/api/common";
import type { DashboardStreamEvent } from "@/src/app/type/api/dashboard";
import type { DevicesStreamEvent } from "@/src/app/type/api/devices";
import type { OverviewQuery, OverviewStreamEvent } from "@/src/app/type/api/overview";
import type { RefundStreamEvent } from "@/src/app/type/api/payments";
import type { TransactionListQuery, TransactionsStreamEvent } from "@/src/app/type/api/transactions";

// ไฟล์นี้รวม SSE ทั้งหมดของ browser เปิดผ่าน Route Handler ใน app/api ซึ่งส่งต่อ stream ของ backend

// Function เปิด SSE รับ dashboard ใหม่เมื่อข้อมูลเปลี่ยน
function subscribeDashboardEvents(options: SseOptions<DashboardStreamEvent>): () => void {
  return subscribeSse("/dashboard/events", options);
}

// Function เปิด SSE รับภาพรวมใหม่ตาม filter เดียวกัน
function subscribeOverviewEvents(query: OverviewQuery, options: SseOptions<OverviewStreamEvent>): () => void {
  return subscribeSse("/overview/events", { ...options, query: { ...query } });
}

// Function เปิด SSE รับรายการใหม่ตาม query เดียวกับ list
function subscribeTransactionEvents(query: TransactionListQuery, options: SseOptions<TransactionsStreamEvent>): () => void {
  return subscribeSse("/transactions/events", { ...options, query: { ...query } });
}

// Function เปิด SSE รับสถานะอุปกรณ์แบบ realtime
function subscribeDeviceEvents(options: SseOptions<DevicesStreamEvent>): () => void {
  return subscribeSse("/devices/events", options);
}

// Function เปิด SSE รับรายการรอคืนเงินที่เปลี่ยน
function subscribeRefundEvents(options: SseOptions<RefundStreamEvent>): () => void {
  return subscribeSse("/payments/refunds/events", options);
}

export { subscribeDashboardEvents, subscribeOverviewEvents, subscribeTransactionEvents, subscribeDeviceEvents, subscribeRefundEvents };
