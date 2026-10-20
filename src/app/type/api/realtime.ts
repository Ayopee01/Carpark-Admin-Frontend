// Import Types
import type { ApiError } from "@/src/app/lib/shared/http";

/* -------------------------------------- Socket.IO Types -------------------------------------- */

// Type stream ของ namespace /admin (ชื่อเดียวกับ prefix ของ event เช่น dashboard:subscribe)
export type AdminStream = "dashboard" | "overview" | "transactions" | "devices" | "payments";

// Type ผลของ event ที่ส่งไป server ทาง ack (code/message เดียวกับ HTTP)
export type SocketAck<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string | null; message: string; details?: Record<string, unknown> } };

// Type err.data ของ connect_error เมื่อ server ปฏิเสธการเชื่อมต่อ
export interface RealtimeConnectErrorData {
  statusCode: number; // 401 / 403 / 429 / 500 เหมือน HTTP
  code: string | null; // เช่น INVALID_TOKEN, INVALID_SESSION
  reason?: string; // invalid_token หรือ SessionEndReason
  details?: Record<string, unknown>; // 429 มี retryAfter (วินาที)
}

// Type event session:revoked ส่งแล้ว server ตัด connection ทันที
export interface SessionRevokedEvent {
  // logout, refresh_token_reused, password_changed, user_disabled, user_deleted, session_* อื่น ๆ
  reason: string;
  at: string;
}

// Type event stream:forbidden เมื่อสิทธิ์ของ stream ถูกถอดระหว่างเชื่อมต่อ (connection ยังอยู่)
export interface StreamForbiddenEvent {
  stream: AdminStream;
}

// Type event <stream>:updated ของ dashboard / overview / transactions
export interface StreamUpdatedEvent<TData> {
  // reason เช่น payment_processed, transaction_updated, day_changed
  trigger: { reason: string; transactionId: string | null; plateNo: string | null; at: string };
  data: TData;
  generatedAt: string;
}

// Type event <stream>:error โหลดข้อมูลใหม่ไม่สำเร็จ (stream ยังเปิดอยู่)
export interface StreamErrorEvent {
  message: string;
  generatedAt: string;
}

/* -------------------------------------- Client Types -------------------------------------- */

// Type URL และ access token ที่ Server Action ส่งให้ browser ต่อ Socket.IO (url = null ใช้โดเมนนี้ที่ Nginx ส่งต่อ /socket.io)
export interface RealtimeConnection {
  url: string | null;
  token: string;
}

// Type สถานะการเชื่อมต่อ stream ฝั่งหน้าเว็บ
export type StreamStatus = "connecting" | "open" | "reconnecting" | "closed";

// Type ตัวเลือกของการ subscribe stream
export type StreamOptions<TEvent> = {
  onEvent: (event: TEvent) => void;
  onStatusChange?: (status: StreamStatus) => void;
  onFatalError?: (error: ApiError) => void; // server ปฏิเสธ stream (เช่น FORBIDDEN, INVALID_DATE_RANGE) และไม่ subscribe ใหม่
  onNoSnapshot?: () => void; // ไม่ได้ข้อมูลแรกภายในเวลาที่กำหนด ให้หน้าโหลดผ่าน API แทน (เรียกครั้งเดียว)
};
