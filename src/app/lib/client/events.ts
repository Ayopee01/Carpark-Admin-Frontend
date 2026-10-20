// Import Client
import { subscribeStream } from "./realtime";
// Import Types
import type { DashboardRefundsOnly, DashboardStreamEvent, DashboardSummary, DeviceIpAlertEvent, PaymentSettingsUpdatedEvent } from "@/src/app/type/api/dashboard";
import type { DeviceEvent, DeviceListResponse, DevicesConfigUpdatedEvent, DevicesStreamEvent } from "@/src/app/type/api/devices";
import type { OverviewStreamEvent, OverviewStreamQuery, OverviewSummary } from "@/src/app/type/api/overview";
import type { PaymentStreamQuery, PaymentUpdatedEvent, RefundRequiredEvent, RefundResolvedEvent } from "@/src/app/type/api/payments";
import type { StreamErrorEvent, StreamOptions, StreamUpdatedEvent } from "@/src/app/type/api/realtime";
import type { TransactionListQuery, TransactionListResponse, TransactionsStreamEvent } from "@/src/app/type/api/transactions";

// ไฟล์นี้รวม realtime ทั้งหมดของ browser ผ่าน Socket.IO /admin (lib/client/realtime)
// แปลงชื่อ event ของ Socket.IO เป็น type ของ event ให้หน้าแยกด้วย switch (ack ตอน subscribe = *_snapshot)

// Function subscribe stream กลางของ Admin layout: dashboard, รายการรอคืนเงิน, แจ้งเตือนคืนเงิน, payment settings และ IP อุปกรณ์
function subscribeDashboardEvents(options: StreamOptions<DashboardStreamEvent>): () => void {
  return subscribeStream<DashboardSummary | DashboardRefundsOnly, DashboardStreamEvent>(
    {
      stream: "dashboard",
      toSnapshot: (data) => ({ type: "dashboard_snapshot", data }),
      events: {
        "dashboard:updated": (event: StreamUpdatedEvent<DashboardSummary | DashboardRefundsOnly>) => ({ type: "dashboard_updated", ...event }),
        "dashboard:error": (event: StreamErrorEvent) => ({ type: "dashboard_error", ...event }),
        "refunds:event": (event: RefundRequiredEvent | RefundResolvedEvent) => event,
        "payment_settings:updated": (event: PaymentSettingsUpdatedEvent) => event,
        "device_alerts:event": (event: DeviceIpAlertEvent) => event,
      },
    },
    options
  );
}

// Function subscribe ภาพรวมตามช่วงวันที่ (เปลี่ยนช่วง = subscribe ใหม่แทนชุดเดิม)
function subscribeOverviewEvents(query: OverviewStreamQuery, options: StreamOptions<OverviewStreamEvent>): () => void {
  return subscribeStream<OverviewSummary, OverviewStreamEvent>(
    {
      stream: "overview",
      payload: query,
      toSnapshot: (data) => ({ type: "overview_snapshot", data }),
      events: {
        "overview:updated": (event: StreamUpdatedEvent<OverviewSummary>) => ({ type: "overview_updated", ...event }),
        "overview:error": (event: StreamErrorEvent) => ({ type: "overview_error", ...event }),
      },
    },
    options
  );
}

// Function subscribe รายการรถตาม query เดียวกับ list
function subscribeTransactionEvents(query: TransactionListQuery, options: StreamOptions<TransactionsStreamEvent>): () => void {
  return subscribeStream<TransactionListResponse, TransactionsStreamEvent>(
    {
      stream: "transactions",
      payload: query,
      toSnapshot: (data) => ({ type: "transactions_snapshot", data }),
      events: {
        "transactions:updated": (event: StreamUpdatedEvent<TransactionListResponse>) => ({ type: "transactions_updated", ...event }),
        "transactions:error": (event: StreamErrorEvent) => ({ type: "transactions_error", ...event }),
      },
    },
    options
  );
}

// Function subscribe สถานะอุปกรณ์ (snapshot = GET /devices แบบไม่กรอง)
function subscribeDeviceEvents(options: StreamOptions<DevicesStreamEvent>): () => void {
  return subscribeStream<DeviceListResponse, DevicesStreamEvent>(
    {
      stream: "devices",
      toSnapshot: (data) => ({ type: "devices_snapshot", data }),
      events: {
        "devices:event": (event: DeviceEvent) => event,
        "devices:config_updated": (event: Omit<DevicesConfigUpdatedEvent, "type">) => ({ type: "devices_config_updated", ...event }),
      },
    },
    options
  );
}

// Function subscribe ผลการชำระของ charge (ack = สถานะล่าสุดเมื่อ charge จบแล้ว ไม่งั้นไม่มี snapshot)
function subscribePaymentEvents(query: PaymentStreamQuery, options: StreamOptions<PaymentUpdatedEvent>): () => void {
  return subscribeStream<PaymentUpdatedEvent | null, PaymentUpdatedEvent>(
    {
      stream: "payments",
      payload: query,
      toSnapshot: (data) => data,
      events: {
        "payments:updated": (event: PaymentUpdatedEvent) => event,
      },
    },
    options
  );
}

export { subscribeDashboardEvents, subscribeOverviewEvents, subscribeTransactionEvents, subscribeDeviceEvents, subscribePaymentEvents };
