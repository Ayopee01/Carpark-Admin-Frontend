// Import Client
import { endSession } from "./session";
// Import Types
import type { ActionResult, ClientRequestOptions } from "@/src/app/type/api/common";
// Import Shared
import { ApiError, ForbiddenError, NetworkError, buildQuery, fromActionError, parseRetryAfter, toApiError } from "@/src/app/lib/shared/http";

// ไฟล์นี้เป็นทางเดียวที่ browser คุยกับ server ของหน้าเว็บ
// - อ่านข้อมูล: GET Route Handler ใน /api (apiRequest, apiRequestBlob) ส่วน realtime อยู่ใน realtime.ts
// - เปลี่ยนข้อมูล: Server Action ใน lib/actions ห่อด้วย unwrap
// ทั้งสองทางจัดการ 401 (ไปหน้า login) และ 403 FORBIDDEN (แจ้ง layout) ที่เดียวกัน

/* -------------------------------------- Config -------------------------------------- */

// Config prefix ของ Route Handler
const API_BASE_URL = "/api";

// Config ชื่อ window event เมื่อได้ 403 FORBIDDEN ให้ layout แสดงหน้าไม่มีสิทธิ์
const FORBIDDEN_EVENT = "api-forbidden";

/* -------------------------------------- Helpers -------------------------------------- */

// Function จัดการ error ที่ต้องทำทั้งหน้า: 401 = session จบ, 403 FORBIDDEN = แจ้ง layout (403 อื่นให้หน้าที่เรียกแสดงเอง)
function handleAuthError(error: ApiError): void {
  if (error.status === 401) {
    void endSession("session_expired");
    return;
  }
  if (error instanceof ForbiddenError && error.code === "FORBIDDEN") {
    window.dispatchEvent(new CustomEvent(FORBIDDEN_EVENT));
  }
}

// Function อ่าน JSON ของ response (ไม่มี body หรือ parse ไม่ได้ = null)
async function parseJson(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  return response.json().catch(() => null);
}

// Function ส่ง GET ไป Route Handler โยน NetworkError เมื่อไม่ได้คำตอบ
async function send(path: string, options: ClientRequestOptions): Promise<Response> {
  try {
    return await fetch(`${API_BASE_URL}${path}${buildQuery(options.query)}`, { cache: "no-store", signal: options.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new NetworkError();
  }
}

// Function สร้างและจัดการ ApiError จาก response ที่ล้มเหลว
async function failResponse(response: Response, options: ClientRequestOptions): Promise<never> {
  const error = toApiError(response.status, await parseJson(response), options.errorMessage ?? "API request failed", parseRetryAfter(response.headers));
  handleAuthError(error);
  throw error;
}

/* -------------------------------------- Functions -------------------------------------- */

// Function อ่านข้อมูลแบบ JSON จาก Route Handler /api<path> โยน ApiError / ForbiddenError / NetworkError
async function apiRequest<T>(path: string, options: ClientRequestOptions = {}): Promise<T> {
  const response = await send(path, options);
  if (!response.ok) return failResponse(response, options);
  return (await parseJson(response)) as T;
}

// Function อ่านไฟล์จาก Route Handler เช่นรูป QR PromptPay
async function apiRequestBlob(path: string, options: ClientRequestOptions = {}): Promise<Blob> {
  const response = await send(path, options);
  if (!response.ok) return failResponse(response, options);
  return response.blob();
}

// Function รอผลของ Server Action แปลง ActionResult เป็นข้อมูล หรือโยน ApiError แบบเดียวกับ apiRequest
async function unwrap<T>(pending: Promise<ActionResult<T>>): Promise<T> {
  let result: ActionResult<T>;
  try {
    result = await pending;
  } catch {
    // server ของหน้าเว็บไม่ตอบ (deploy ใหม่, เน็ตหลุด)
    throw new NetworkError();
  }
  if (result.ok) return result.data;

  const error = fromActionError(result.error);
  handleAuthError(error);
  throw error;
}

export { FORBIDDEN_EVENT, apiRequest, apiRequestBlob, unwrap };
