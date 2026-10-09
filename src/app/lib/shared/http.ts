// Import Auth
import { handleSessionRevoked } from "@/src/app/lib/auth/session";
// Import Types
import type { ApiErrorCode, ApiErrorResponse, ApiFieldError, ApiRequestOptions, QueryParams, SessionRevokedEvent, SseBaseEvent, SseOptions, SseStatus, FieldErrors } from "@/src/app/type/api/common";

/* -------------------------------------- Backend Address -------------------------------------- */

// Config origin ของ backend จาก NEXT_PUBLIC_API_BASE_URL (ฝังตอน build ต้อง build ใหม่เมื่อเปลี่ยน)
const BACKEND_ORIGIN = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").trim().replace(/\/+$/, "");

// Function แปลง path ของ backend เป็น URL เต็ม เช่น /uploads/logo.png
function backendUrl(path: string): string {
  return `${BACKEND_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
}

// Function สร้าง URL ของ WebSocket ชำระเงิน wss://<host>/api/payments/ws (หน้าเว็บเติม chargeId เอง)
function getPaymentWebSocketUrl(): string | null {
  if (!BACKEND_ORIGIN) return null;
  const url = new URL("/api/payments/ws", BACKEND_ORIGIN);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

/* -------------------------------------- Error Messages -------------------------------------- */

// Config ข้อความภาษาไทยของ error code (PAYMENT_SELECTION_INVALID ไม่มี เพราะแสดงข้อความจาก backend)
const ERROR_MESSAGES_TH: Record<string, string> = {
  VALIDATION_ERROR: "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบช่องที่แจ้งเตือน",
  UNAUTHORIZED: "กรุณาเข้าสู่ระบบใหม่",
  INVALID_TOKEN: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่",
  INVALID_SESSION: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่",
  FORBIDDEN: "คุณไม่มีสิทธิ์ใช้งานส่วนนี้",
  ROUTE_NOT_FOUND: "ไม่พบบริการที่เรียกใช้ กรุณาติดต่อผู้ดูแลระบบ",
  TOO_MANY_REQUESTS: "เรียกใช้งานถี่เกินไป กรุณารอสักครู่แล้วลองใหม่",
  INTERNAL_SERVER_ERROR: "ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง",
  BAD_REQUEST: "ข้อมูลที่ส่งไม่ถูกต้องหรือมีขนาดใหญ่เกินไป",
  CORS_NOT_ALLOWED: "เว็บไซต์นี้ยังไม่ได้รับอนุญาตให้เรียกใช้ระบบ กรุณาติดต่อผู้ดูแลระบบ",
  INVALID_CREDENTIALS: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
  INVALID_REFRESH_TOKEN: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่",
  SESSION_EXPIRED: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่",
  // จากหน้านี้หมายถึง ADMIN_ORIGINS ของ API ไม่ตรงกับที่อยู่ของเว็บ
  CSRF_REJECTED: "ระบบปฏิเสธคำขอจากเว็บไซต์นี้ (ตั้งค่า ADMIN_ORIGINS ไม่ตรง) กรุณาติดต่อผู้ดูแลระบบ",
  UNSUPPORTED_MEDIA_TYPE: "รูปแบบข้อมูลที่ส่งไม่ถูกต้อง",

  // ชำระเงิน (Admin)
  ADMIN_CHANNEL_MUST_BE_CASHIER: "แอดมินรับชำระได้เฉพาะช่องทางแคชเชียร์",
  INVALID_AMOUNT: "จำนวนเงินต้องมากกว่า 0",
  AMOUNT_EXCEEDS_REMAINING: "จำนวนเงินเกินยอดคงเหลือ",
  NO_REMAINING_AMOUNT: "รายการนี้ชำระครบแล้ว",
  PENDING_GATEWAY_CHARGE: "รายการนี้มี QR รอชำระอยู่",
  AMOUNT_MISMATCH: "ยอดชำระเปลี่ยนแล้ว กรุณาสร้าง QR ใหม่",
  INVALID_PAYMENT_AMOUNT: "จำนวนเงินที่ชำระไม่ถูกต้อง",
  SOURCE_OR_TOKEN_REQUIRED: "ข้อมูลสร้างรายการชำระเงินไม่ครบ",
  OMISE_NOT_CONFIGURED: "ระบบชำระเงิน Omise ยังไม่ได้ตั้งค่า กรุณาติดต่อผู้ดูแลระบบ",
  AMOUNT_BELOW_GATEWAY_MINIMUM: "ยอดชำระต่ำกว่าขั้นต่ำของ PromptPay กรุณารับชำระด้วยวิธีอื่น",
  NOT_OMISE_CHARGE: "รายการนี้ไม่ได้ชำระผ่าน Omise",
  CHARGE_VERIFY_TOO_FREQUENT: "กดตรวจสอบถี่เกินไป กรุณารอสักครู่แล้วลองใหม่",
  OMISE_TIMEOUT: "Omise ไม่ตอบกลับ กรุณาลองใหม่อีกครั้ง",
  PAYMENT_REFERENCE_REQUIRED: "กรุณากรอกเลขอ้างอิงจากสลิป EDC",
  PAYMENT_REFERENCE_USED: "เลขอ้างอิงนี้ถูกใช้แล้ว กรุณาตรวจสลิปอีกครั้ง",
  SOURCE_REQUIRED: "ต้องระบุ source สำหรับวิธีชำระนี้",
  ADMIN_CARD_NOT_SUPPORTED: "แอดมินรับบัตรได้ผ่านเครื่อง EDC เท่านั้น",

  // รายการรถ
  TRANSACTION_NOT_FOUND: "ไม่พบรายการจอดรถ",
  INVALID_PLATE_NO: "เลขทะเบียนไม่ถูกต้อง (อย่างน้อย 4 ตัวอักษร)",
  MULTIPLE_PLATE_MATCHES: "พบทะเบียนที่ตรงกันหลายคัน กรุณาระบุทะเบียนเต็ม",
  TRANSACTION_NOT_PAYABLE: "รายการนี้ปิดแล้ว ชำระเงินไม่ได้",
  INVALID_STATUS_TRANSITION: "รายการที่รถออกแล้วหรือยกเลิกแล้วเปลี่ยนสถานะไม่ได้",
  ACTIVE_TRANSACTION_EXISTS: "ทะเบียนนี้มีรายการจอดที่ยังเปิดอยู่แล้ว",
  TRANSACTION_HAS_PAYMENTS: "รายการที่มีการชำระเงินแล้วลบไม่ได้ ให้ใช้การยกเลิกรายการแทน",

  // ชำระด้วย QR PromptPay
  QR_ONLY_FOR_PROMPTPAY: "รายการนี้ไม่มี QR PromptPay",
  OMISE_QR_DOCUMENT_NOT_FOUND: "โหลดรูป QR จาก Omise ไม่สำเร็จ กรุณาลองใหม่",
  OMISE_DOCUMENT_UNAVAILABLE: "โหลดรูป QR จาก Omise ไม่สำเร็จ กรุณาลองใหม่",
  CHARGE_ID_OR_DOCUMENT_PATH_REQUIRED: "ไม่พบรายการ QR ที่ต้องการ",
  DOCUMENT_PATH_REQUIRED: "ไม่พบรายการ QR ที่ต้องการ",
  INVALID_OMISE_DOCUMENT_PATH: "ไม่พบรายการ QR ที่ต้องการ",
  PAYMENT_METHOD_REQUIRED: "กรุณาเลือกวิธีชำระเงิน",
  TRANSACTION_ID_OR_PLATE_NO_REQUIRED: "ไม่พบรายการที่จะชำระ",

  // คืนเงิน
  REFUND_ALREADY_RESOLVED: "รายการนี้มีผู้บันทึกการคืนเงินไปแล้ว",
  REFUND_NOT_REQUIRED: "รายการนี้ไม่ต้องคืนเงิน",
  GATEWAY_CHARGE_NOT_FOUND: "ไม่พบรายการชำระเงินนี้",

  // ช่วงวันที่ (ต่อท้ายข้อความ backend ที่บอกขีดจำกัด)
  INVALID_DATE_RANGE: "ช่วงวันที่ไม่ถูกต้อง",

  // ค่าบริการ (409 = มีคนบันทึกก่อน ให้โหลดใหม่แล้วบันทึกอีกครั้ง)
  INVALID_PRICING_RULES: "เงื่อนไขค่าบริการขัดกัน",
  PRICING_CONFIG_CONFLICT: "มีผู้อื่นบันทึกค่าบริการไปก่อนหน้านี้ กรุณาโหลดข้อมูลล่าสุดแล้วทำรายการอีกครั้ง",

  // สมาชิก
  USERNAME_REQUIRED: "กรุณากรอกชื่อผู้ใช้หรืออีเมล",
  PASSWORD_REQUIRED: "กรุณากรอกรหัสผ่าน",
  NAME_REQUIRED: "กรุณากรอกชื่อ",
  USERNAME_TAKEN: "ชื่อผู้ใช้นี้ถูกใช้แล้ว",
  MEMBER_NOT_FOUND: "ไม่พบสมาชิกนี้",
  PERMISSION_NOT_GRANTABLE: "ให้สิทธิ์ที่บัญชีของคุณไม่มีไม่ได้",
  SUPER_ADMIN_REQUIRED: "เฉพาะผู้ดูแลระบบสูงสุด (super_admin) เท่านั้นที่ทำรายการนี้ได้",
  CANNOT_DELETE_SELF: "ลบบัญชีของตัวเองไม่ได้",
  CANNOT_DISABLE_SELF: "ปิดใช้งานบัญชีของตัวเองไม่ได้",
  LAST_SUPER_ADMIN: "ต้องมีผู้ดูแลระบบสูงสุดอย่างน้อย 1 คน จึงลบ ปิดใช้งาน หรือลดตำแหน่งบัญชีนี้ไม่ได้",

  // เครื่อง EDC
  EDC_TERMINAL_ID_REQUIRED: "กรุณากรอก Terminal ID",
  EDC_TERMINAL_ID_EXISTS: "Terminal ID นี้ลงทะเบียนไว้แล้ว",
  EDC_DEVICE_IN_USE: "เครื่อง EDC นี้ผูกกับ Kiosk/Gate อยู่ ต้องยกเลิกการผูกก่อน",
  EDC_DEVICE_NOT_FOUND: "ไม่พบเครื่อง EDC ที่เลือก",
  EDC_USAGE_INVALID: "เครื่อง EDC ของเคาน์เตอร์ผูกกับ Kiosk/Gate ไม่ได้",
  EDC_OWNER_INVALID: "ผูกเครื่อง EDC ได้เฉพาะ Kiosk หรือ Barrier Gate",
  EDC_DEVICE_REQUIRED: "กรุณาเลือกเครื่อง EDC",
  EDC_DEVICE_NOT_CASHIER: "เครื่อง EDC นี้ไม่ใช่เครื่องของเคาน์เตอร์",
  EDC_DEVICE_UNAVAILABLE: "เครื่อง EDC นี้ถูกปิดหรือส่งซ่อม กรุณาเลือกเครื่องใหม่",

  // ตั้งค่า / อุปกรณ์ / ธีม
  PAYMENT_METHOD_PROTECTED: "วิธีชำระเงินหลักของระบบลบไม่ได้ ให้ปิดใช้งานแทน",
  PAYMENT_CHANNEL_PROTECTED: "ช่องทางหลักของระบบลบไม่ได้ ให้ปิดใช้งานแทน",
  PAYMENT_METHOD_NOT_FOUND: "ไม่พบวิธีชำระเงินนี้",
  PAYMENT_CHANNEL_NOT_FOUND: "ไม่พบช่องทางนี้ หรือมีวิธีชำระเงินที่ไม่มีอยู่จริง",
  DEVICE_TYPE_IMMUTABLE: "เปลี่ยนประเภทอุปกรณ์ไม่ได้",
  DEVICE_NOT_FOUND: "ไม่พบอุปกรณ์นี้",
  DEVICE_UPDATE_FAILED: "บันทึกข้อมูลอุปกรณ์ไม่สำเร็จ กรุณาลองใหม่",
  ACTIVATION_REISSUE_FAILED: "สร้าง Activation Code ใหม่ไม่สำเร็จ กรุณาลองใหม่",
  DEVICE_CODE_EXISTS: "รหัสอุปกรณ์นี้ถูกใช้แล้ว",
  DEVICE_TYPE_NOT_ACTIVATABLE: "สร้าง Activation Code ได้เฉพาะ Kiosk และ Barrier Gate",
  DEVICE_MAINTENANCE: "อุปกรณ์นี้อยู่ระหว่างปิดปรับปรุง",
  DEVICE_INACTIVE: "อุปกรณ์นี้ถูกปิดใช้งาน ต้องตั้งกลับเป็นใช้งานก่อน",
  DEVICE_PENDING_ACTIVATION: "อุปกรณ์นี้ยังรอ activate เปลี่ยนสถานะไม่ได้",
  PAYMENT_NOT_RECORDED: "บันทึกการชำระเงินไม่สำเร็จ กรุณาแจ้งผู้ดูแลระบบ",
  INVALID_DEVICE_MAPPING: "มีกล้องหรือเครื่องพิมพ์ที่เลือกไม่มีอยู่ในระบบ กรุณาเลือกใหม่",
  CAMERA_IN_USE: "กล้องนี้ผูกกับ Barrier Gate อื่นอยู่ ต้องถอดออกจากที่เดิมก่อน",
  DEVICE_MAPPING_NOT_SUPPORTED: "อุปกรณ์นี้ผูกกล้องหรือเครื่องพิมพ์ประเภทนี้ไม่ได้",
  INVALID_LOGO_FILE: "รองรับเฉพาะไฟล์ JPG, PNG หรือ WEBP ขนาดไม่เกิน 2MB",
  LOGO_FILE_REQUIRED: "กรุณาเลือกไฟล์โลโก้",
};

/* -------------------------------------- Requests -------------------------------------- */

// Config base URL ของทุก API call (เรียก backend ตรงพร้อม cookie ที่ CORS อนุญาต)
const API_BASE_URL = `${BACKEND_ORIGIN}/api`;

// Config error code ที่ต่อท้ายข้อความ backend เพราะบอกรายละเอียด (rule ไหน / ขั้นต่ำเท่าไร)
const DETAIL_CODES = new Set<string>(["INVALID_DATE_RANGE", "INVALID_PRICING_RULES", "AMOUNT_BELOW_GATEWAY_MINIMUM"]);

// Function สร้าง URL ของ API จาก path และ query (ตัดค่าว่างออก)
function apiUrl(path: string, query?: QueryParams): string {
  const search = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  });
  const text = search.toString();
  return `${API_BASE_URL}${path}${text ? `?${text}` : ""}`;
}

// Function encode ค่าที่ใส่ใน path เช่นทะเบียนรถภาษาไทย
function seg(value: string): string {
  return encodeURIComponent(value);
}

// Class error ที่ backend ตอบกลับพร้อม status และ code
class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly data: ApiErrorResponse | null = null,
    public readonly retryAfterSeconds: number | null = null // จาก header Retry-After ตอน 429
  ) {
    super(message);
    this.name = "ApiError";
  }

  get code(): ApiErrorCode | undefined {
    return this.data?.code;
  }

  // error ของ VALIDATION_ERROR แยกตาม field ใช้แสดงใต้ช่องกรอก
  get fieldErrors(): FieldErrors {
    const result: FieldErrors = {};
    for (const item of this.data?.errors ?? []) {
      if (item.field && !result[item.field]) result[item.field] = item.message;
    }
    return result;
  }

  // error ของ VALIDATION_ERROR ทั้งหมดรวมที่ไม่มี field
  get validationErrors(): ApiFieldError[] {
    return this.data?.errors ?? [];
  }

  // รายละเอียดเสริมที่อยู่ข้าง message/code เช่น remainingAmount, chargeId
  detail(key: string): unknown {
    return this.data?.[key];
  }
}

// Class error 403 FORBIDDEN เมื่อผู้ใช้ไม่มี permission ของ route (body ไม่บอกชื่อ permission)
class ForbiddenError extends ApiError {
  constructor(data: ApiErrorResponse | null) {
    super(data?.message || "ไม่มีสิทธิ์ใช้งานส่วนนี้", 403, data);
    this.name = "ForbiddenError";
  }
}

// Class error เมื่อ request ไม่ได้รับคำตอบ HTTP (offline, API ล่ม, CORS บล็อก)
class NetworkError extends Error {
  constructor(message = "ไม่สามารถเชื่อมต่อระบบได้ กรุณาตรวจสอบเครือข่าย") {
    super(message);
    this.name = "NetworkError";
  }
}

// Function ตรวจว่าเป็น error body ของ backend
function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return Boolean(value) && typeof value === "object" && typeof (value as { message?: unknown }).message === "string";
}

// Function ตรวจว่าเป็น ApiError ที่มี code ตรงกับรายการ
function isApiErrorCode(error: unknown, ...codes: ApiErrorCode[]): error is ApiError {
  return error instanceof ApiError && Boolean(error.code) && codes.includes(error.code as ApiErrorCode);
}

// Function อ่านวินาทีจาก header Retry-After
function parseRetryAfter(response: Response): number | null {
  const value = Number(response.headers.get("retry-after"));
  return Number.isFinite(value) && value > 0 ? value : null;
}

// Function สร้าง ApiError จาก response ที่ล้มเหลว แปลงข้อความเป็นไทย และเก็บข้อความเดิมใน backendMessage
function toApiError(response: Response, body: unknown, fallbackMessage: string): ApiError {
  const raw = isApiErrorResponse(body) ? body : null;
  let thai = raw?.code ? ERROR_MESSAGES_TH[raw.code] : undefined;
  // ต่อท้ายรายการที่ไม่ผ่าน สำหรับ error ที่ไม่ได้ผูกกับช่องกรอก เช่น pricingRules.0.price
  if (thai && raw?.code === "VALIDATION_ERROR" && raw.errors?.length) {
    const details = raw.errors.map((item) => (item.field ? `${item.field}: ${item.message}` : item.message));
    thai = `${thai} (${details.join(", ")})`;
  }
  if (thai && raw && DETAIL_CODES.has(raw.code) && raw.message) {
    thai = `${thai} (${raw.message})`;
  }
  // บอก id ที่ไม่มีอยู่จริงแล้ว ให้ผู้ใช้เอาออกจาก mapping
  if (thai && raw?.code === "INVALID_DEVICE_MAPPING" && Array.isArray(raw.invalidIds) && raw.invalidIds.length) {
    thai = `${thai} (${raw.invalidIds.join(", ")})`;
  }
  const data: ApiErrorResponse | null = raw && thai ? { ...raw, message: thai, backendMessage: raw.message } : raw;
  if (response.status === 403 && (!data?.code || data.code === "FORBIDDEN")) return new ForbiddenError(data);
  return new ApiError(data?.message || fallbackMessage, response.status, data, parseRetryAfter(response));
}

// Function ดึงข้อความ error ที่แสดงให้ผู้ใช้ หรือข้อความสำรอง
function getErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (isApiErrorResponse(error)) return error.message;
  return fallbackMessage;
}

// Function ดึง error แยกตาม field ของ VALIDATION_ERROR
function getFieldErrors(error: unknown): FieldErrors {
  return error instanceof ApiError ? error.fieldErrors : {};
}

// Function อ่าน JSON ของ response (ไม่มี body หรือ parse ไม่ได้ = null)
async function parseJson(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  return response.json().catch(() => null);
}

// Function ส่ง request ไป backend พร้อม cookie (object ส่งเป็น JSON, FormData ส่งเป็น multipart)
async function send(path: string, options: ApiRequestOptions): Promise<Response> {
  const { query, body, ...rest } = options;
  const init: RequestInit = { ...rest };
  delete (init as ApiRequestOptions).errorMessage;
  const headers = new Headers(init.headers);
  let payload: BodyInit | undefined;

  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined && body !== null) {
    payload = JSON.stringify(body);
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  }

  if (!BACKEND_ORIGIN) throw new NetworkError("ยังไม่ได้ตั้งค่า NEXT_PUBLIC_API_BASE_URL");

  try {
    return await fetch(apiUrl(path, query), {
      ...init,
      headers,
      body: payload,
      credentials: "include",
      cache: init.cache ?? "no-store",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new NetworkError();
  }
}

// Function เรียก API แบบ JSON โยน ApiError / ForbiddenError / NetworkError (401 ให้ fetchInterceptor จัดการ ห้าม refresh ที่นี่)
async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const response = await send(path, options);
  const data = await parseJson(response);

  if (!response.ok) {
    throw toApiError(response, data, options.errorMessage ?? "API request failed");
  }

  return data as T;
}

// Function เรียก API ที่ตอบเป็นไฟล์ เช่นรูป QR PromptPay
async function apiRequestBlob(path: string, options: ApiRequestOptions = {}): Promise<Blob> {
  const response = await send(path, options);

  if (!response.ok) {
    throw toApiError(response, await parseJson(response), options.errorMessage ?? "API request failed");
  }

  return response.blob();
}

/* -------------------------------------- Event Streams -------------------------------------- */

// Config ระยะ ping ก่อนได้ event connected (หลังจากนั้นใช้ pingIntervalMs ที่ backend แจ้ง)
const DEFAULT_PING_INTERVAL_MS = 25_000;

// Config ระยะรอก่อนต่อ stream / WebSocket ใหม่แต่ละครั้ง (ครั้งต่อไปใช้ค่าสุดท้ายซ้ำ)
const RECONNECT_DELAYS_MS = [1_000, 2_000, 5_000, 10_000, 30_000];

// Config รอข้อมูลแรกจาก stream ก่อนเรียก onNoSnapshot ให้หน้าโหลดผ่าน API แทน
const FIRST_SNAPSHOT_TIMEOUT_MS = 8000;

// Function แปลง SSE block เป็น event (backend ส่งแค่บรรทัด data: ที่มี type เสมอ)
function parseEventBlock(block: string): { type: string } | null {
  const dataLines = block
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart());
  if (dataLines.length === 0) return null;
  try {
    return JSON.parse(dataLines.join("\n")) as { type: string };
  } catch {
    return null;
  }
}

// Function เปิด SSE ผ่าน fetch พร้อม cookie ต่อใหม่อัตโนมัติ ตรวจ ping และไป login เมื่อได้ session_revoked คืน function ปิด stream
function subscribeSse<TEvent extends { type: string }>(
  path: string,
  options: SseOptions<TEvent>
): () => void {
  const url = apiUrl(path, options.query);
  let closed = false;
  let attempt = 0;
  let controller: AbortController | null = null;
  let reconnectTimer: number | undefined;
  let watchdogTimer: number | undefined;
  // ระยะ ping ที่ server แจ้งใน connected แม่นที่สุด
  let announcedPingInterval: number | null = null;

  const setStatus = (status: SseStatus) => options.onStatusChange?.(status);
  // เรียก onNoSnapshot ครั้งเดียวถ้าไม่ได้ข้อมูลแรกภายในเวลาที่กำหนด
  let snapshotTimer = options.onNoSnapshot
    ? window.setTimeout(() => {
        snapshotTimer = undefined;
        options.onNoSnapshot?.();
      }, FIRST_SNAPSHOT_TIMEOUT_MS)
    : undefined;

  function stopSnapshotTimer() {
    window.clearTimeout(snapshotTimer);
    snapshotTimer = undefined;
  }

  function armWatchdog() {
    window.clearTimeout(watchdogTimer);
    const interval = announcedPingInterval ?? DEFAULT_PING_INTERVAL_MS;
    watchdogTimer = window.setTimeout(() => {
      // ไม่ได้ ping ตามเวลา ปิด connection นี้แล้ว loop จะต่อใหม่
      controller?.abort();
    }, interval * 2.5);
  }


  function scheduleReconnect() {
    if (closed) return;
    setStatus("reconnecting");
    const delay = RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length - 1)];
    attempt += 1;
    reconnectTimer = window.setTimeout(() => void connect(), delay);
  }

  async function connect() {
    if (closed) return;
    controller = new AbortController();
    setStatus(attempt === 0 ? "connecting" : "reconnecting");

    try {
      const response = await fetch(url, {
        headers: { Accept: "text/event-stream" },
        credentials: "include",
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => null);
        const error = toApiError(response, body, "Event stream unavailable");
        // 401 ที่นี่ = interceptor refresh และลองใหม่แล้ว session จบ ห้ามต่อใหม่
        if (response.status === 401) {
          closed = true;
          setStatus("closed");
          return;
        }
        // 4xx ต่อใหม่ก็ไม่หาย เช่น ช่วงวันที่ผิด ไม่มีสิทธิ์
        const retryable = response.status === 408 || response.status === 429;
        if (response.status >= 400 && response.status < 500 && !retryable) {
          closed = true;
          setStatus("closed");
          stopSnapshotTimer();
          options.onFatalError?.(error);
          return;
        }
        throw error;
      }

      attempt = 0;
      setStatus("open");
      armWatchdog();

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // closed เปลี่ยนจาก function ปิด stream ระหว่างรอ read
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- ดูบรรทัดบน
      while (!closed) {
        const { done, value } = await reader.read();
        if (done) break;

        armWatchdog();
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() ?? "";

        for (const block of blocks) {
          const event = parseEventBlock(block) as TEvent | SseBaseEvent | SessionRevokedEvent | null;
          if (!event || typeof event.type !== "string") continue;
          if (event.type === "session_revoked") {
            // server ปิด stream แล้ว ต่อใหม่จะได้ 401 วนไม่จบ
            closed = true;
            setStatus("closed");
            controller.abort();
            handleSessionRevoked((event as SessionRevokedEvent).reason);
            return;
          }
          if (event.type === "connected") {
            const announced = (event as { pingIntervalMs?: unknown }).pingIntervalMs;
            if (typeof announced === "number" && announced > 0) {
              announcedPingInterval = announced;
              armWatchdog();
            }
          }
          if (event.type !== "ping" && event.type !== "connected") stopSnapshotTimer();
          options.onEvent(event as TEvent | SseBaseEvent);
        }
      }
    } catch {
      // ถูกตัดจาก watchdog, เน็ต หรือ 5xx ให้ต่อใหม่
    } finally {
      window.clearTimeout(watchdogTimer);
    }

    scheduleReconnect();
  }

  void connect();

  return () => {
    closed = true;
    stopSnapshotTimer();
    window.clearTimeout(reconnectTimer);
    window.clearTimeout(watchdogTimer);
    controller?.abort();
    setStatus("closed");
  };
}

export { BACKEND_ORIGIN, backendUrl, getPaymentWebSocketUrl, ERROR_MESSAGES_TH, API_BASE_URL, apiUrl, seg, ApiError, ForbiddenError, NetworkError, isApiErrorResponse, isApiErrorCode, toApiError, getErrorMessage, getFieldErrors, apiRequest, apiRequestBlob, RECONNECT_DELAYS_MS, subscribeSse };
