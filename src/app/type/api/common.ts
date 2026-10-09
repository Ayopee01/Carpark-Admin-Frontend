// Import Types
import type { ApiError } from "@/src/app/lib/shared/http";

/* -------------------------------------- Error Types -------------------------------------- */

// Type ช่องที่ไม่ผ่าน validation ใน VALIDATION_ERROR
export type ApiFieldError = { field: string | null; message: string };

// Type error ของ VALIDATION_ERROR แยกตาม field (field ที่ไม่มี error = ไม่มี key)
export type FieldErrors = Partial<Record<string, string>>;

// Type error body ของทุก endpoint (รายละเอียดเสริมอยู่ข้าง message/code)
export interface ApiErrorResponse {
  message: string;
  code: string; // UPPER_SNAKE_CASE ใช้ code ตัดสินใจใน logic
  errors?: ApiFieldError[]; // มีเมื่อ code = VALIDATION_ERROR
  [detail: string]: unknown;
}

// Type error code ที่ backend ส่ง
export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "INVALID_TOKEN"
  | "INVALID_SESSION"
  | "FORBIDDEN"
  | "ROUTE_NOT_FOUND"
  | "TOO_MANY_REQUESTS"
  | "TOO_MANY_LOGIN_ATTEMPTS"
  | "INTERNAL_SERVER_ERROR"
  | "TRANSACTION_NOT_FOUND"
  | "INVALID_PLATE_NO"
  | "MULTIPLE_PLATE_MATCHES"
  | "NO_REMAINING_AMOUNT"
  | "AMOUNT_EXCEEDS_REMAINING"
  | "INVALID_AMOUNT"
  | "AMOUNT_MISMATCH"
  | "PAYMENT_SELECTION_INVALID"
  | "PENDING_GATEWAY_CHARGE"
  | "PAYMENT_REFERENCE_REQUIRED"
  | "PAYMENT_REFERENCE_USED"
  | "EDC_DEVICE_REQUIRED"
  | "EDC_DEVICE_NOT_FOUND"
  | "EDC_DEVICE_NOT_CASHIER"
  | "EDC_DEVICE_UNAVAILABLE"
  | "ADMIN_CHANNEL_MUST_BE_CASHIER"
  | "ADMIN_CARD_NOT_SUPPORTED"
  | "SOURCE_REQUIRED"
  | "PAYMENT_METHOD_REQUIRED"
  | "INVALID_RETURN_URI"
  | "QR_ONLY_FOR_PROMPTPAY"
  | "GATEWAY_CHARGE_NOT_FOUND"
  | "NOT_OMISE_CHARGE"
  | "CHARGE_VERIFY_TOO_FREQUENT"
  | "OMISE_TIMEOUT"
  | "REFUND_NOT_REQUIRED"
  | "REFUND_ALREADY_RESOLVED"
  | "INVALID_STATUS_TRANSITION"
  | "ACTIVE_TRANSACTION_EXISTS"
  | "TRANSACTION_HAS_PAYMENTS"
  | "INVALID_DATE_RANGE"
  | "INVALID_PRICING_RULES"
  | "PRICING_CONFIG_CONFLICT"
  | "PAYMENT_METHOD_NOT_FOUND"
  | "PAYMENT_CHANNEL_NOT_FOUND"
  | "PAYMENT_METHOD_PROTECTED"
  | "PAYMENT_CHANNEL_PROTECTED"
  | "DEVICE_NOT_FOUND"
  | "DEVICE_CODE_EXISTS"
  | "DEVICE_TYPE_NOT_ACTIVATABLE"
  | "DEVICE_MAINTENANCE"
  | "DEVICE_TYPE_IMMUTABLE"
  | "EDC_USAGE_INVALID"
  | "EDC_OWNER_INVALID"
  | "EDC_DEVICE_IN_USE"
  | "EDC_TERMINAL_ID_EXISTS"
  | "EDC_TERMINAL_ID_REQUIRED"
  | "LOGO_FILE_REQUIRED"
  | "INVALID_LOGO_FILE"
  | "USERNAME_REQUIRED"
  | "PASSWORD_REQUIRED"
  | "NAME_REQUIRED"
  | "USERNAME_TAKEN"
  | "MEMBER_NOT_FOUND"
  | "PERMISSION_NOT_GRANTABLE"
  | "SUPER_ADMIN_REQUIRED"
  | "LAST_SUPER_ADMIN"
  | "CANNOT_DELETE_SELF"
  | "CANNOT_DISABLE_SELF"
  | "INVALID_CREDENTIALS"
  | "INVALID_REFRESH_TOKEN"
  | "SESSION_EXPIRED"
  | "BAD_REQUEST" // รวม HTTP 413 เมื่อ JSON body เกิน 1 MB
  | "CORS_NOT_ALLOWED"
  | "CSRF_REJECTED"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "DEVICE_UPDATE_FAILED"
  | "ACTIVATION_REISSUE_FAILED"
  | "CHARGE_ID_OR_DOCUMENT_PATH_REQUIRED"
  | "DOCUMENT_PATH_REQUIRED"
  | "INVALID_OMISE_DOCUMENT_PATH"
  | "INVALID_PAYMENT_AMOUNT"
  | "SOURCE_OR_TOKEN_REQUIRED"
  | "OMISE_NOT_CONFIGURED"
  | "OMISE_DOCUMENT_UNAVAILABLE"
  | "OMISE_QR_DOCUMENT_NOT_FOUND"
  | "AMOUNT_BELOW_GATEWAY_MINIMUM"
  | "INVALID_DEVICE_MAPPING"
  | "CAMERA_IN_USE"
  | "DEVICE_MAPPING_NOT_SUPPORTED"
  | "DEVICE_INACTIVE"
  | "DEVICE_PENDING_ACTIVATION"
  | "PAYMENT_NOT_RECORDED"
  | (string & {});

/* -------------------------------------- SSE Types -------------------------------------- */

// Type event ping ที่ทุก stream ส่งเป็นระยะ
export type PingEvent = { type: "ping"; at: string };

// Type event แรกหลังต่อ stream พร้อมระยะ ping
export type ConnectedEvent = { type: "connected"; message: string; pingIntervalMs: number };

// Type event ที่ส่งเมื่อ session จบ แล้วปิด stream ทันที (subscribeSse จัดการเอง)
export type SessionRevokedEvent = {
  type: "session_revoked";
  // logout, refresh_token_reused, password_changed, user_disabled, user_deleted, session_* อื่น ๆ
  reason: string;
  at: string;
};

// Type event พื้นฐานที่ทุก stream มี
export type SseBaseEvent = ConnectedEvent | PingEvent;

// Type สถานะการเชื่อมต่อ stream ฝั่งหน้าเว็บ
export type SseStatus = "connecting" | "open" | "reconnecting" | "closed";

// Type ตัวเลือกของ subscribeSse
export type SseOptions<TEvent> = {
  query?: QueryParams; // query ของ stream เช่นตัวกรองเดียวกับรายการ
  onEvent: (event: TEvent | SseBaseEvent) => void;
  onStatusChange?: (status: SseStatus) => void;
  onFatalError?: (error: ApiError) => void; // server ปฏิเสธ stream (4xx) และไม่ต่อใหม่
  onNoSnapshot?: () => void; // ไม่ได้ข้อมูลแรกภายในเวลาที่กำหนด ให้หน้าโหลดผ่าน API แทน (เรียกครั้งเดียว)
};

/* -------------------------------------- Request Types -------------------------------------- */

// Type ค่าของ query string หนึ่งตัว (ค่าว่างจะไม่ถูกส่ง)
export type QueryValue = string | number | boolean | null | undefined;

// Type query string ของ request
export type QueryParams = Record<string, QueryValue>;

// Type ตัวเลือกของ apiRequest
export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  query?: QueryParams;
  body?: object | FormData | null; // object ส่งเป็น JSON, FormData ส่งเป็น multipart
  errorMessage?: string; // ใช้เมื่อ error จาก backend ไม่มีข้อความ
};
