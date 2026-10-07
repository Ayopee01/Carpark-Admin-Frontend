// Import Api
import { AUTH_PATHS } from "@/src/app/lib/api/auth";
// Import Auth
import { endSession, ensureFreshSession, getSessionVersion, hasSession, refreshSession } from "./session";
// Import Shared
import { API_BASE_URL } from "@/src/app/lib/shared/http";

/* -------------------------------------- Config -------------------------------------- */

// Config ชื่อ window event เมื่อได้ 403 FORBIDDEN ให้ layout แสดงหน้าไม่มีสิทธิ์
const FORBIDDEN_EVENT = "api-forbidden";

// Config path ที่ได้ 401 แล้วห้าม refresh
const NO_REFRESH_PATHS = new Set([AUTH_PATHS.login, AUTH_PATHS.refresh, AUTH_PATHS.logout].map((path) => `/api${path}`));

// ติดตั้ง interceptor ครั้งเดียวต่อแท็บ
let installed = false;

/* -------------------------------------- Helpers -------------------------------------- */

// Function ดึง path ของ request ที่ไป backend API หรือ "" ถ้าเป็น request อื่น
function getApiPath(input: RequestInfo | URL): string {
  try {
    const api = new URL(API_BASE_URL, window.location.origin);
    const url =
      typeof input === "string"
        ? new URL(input, window.location.origin)
        : input instanceof URL
          ? input
          : new URL(input.url, window.location.origin);

    if (url.origin !== api.origin) return "";
    return url.pathname.startsWith(`${api.pathname}/`) ? url.pathname : "";
  } catch {
    return "";
  }
}

// Function เติม Content-Type JSON, credentials และ no-store ให้ request
function withDefaults(init: RequestInit | undefined): RequestInit {
  const headers = new Headers(init?.headers);
  const body = init?.body ?? null;
  // backend ตอบ 415 ถ้า body ไม่ใช่ JSON (ยกเว้น multipart)
  if (body && !(body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return { ...init, headers, credentials: "include", cache: init?.cache ?? "no-store" };
}

// Function ส่ง FORBIDDEN_EVENT เฉพาะ 403 code FORBIDDEN (403 อื่นให้หน้าที่เรียกแสดงเอง)
function notifyForbidden(response: Response): void {
  if (response.status !== 403) return;
  void response.clone().json().catch(() => null).then((data) => {
    if (!data || typeof data !== "object" || (data as { code?: unknown }).code !== "FORBIDDEN") return;
    window.dispatchEvent(new CustomEvent(FORBIDDEN_EVENT));
  });
}

/* -------------------------------------- Functions -------------------------------------- */

// Function ครอบ window.fetch ของ request ไป API: ได้ 401 ให้ refresh 1 ครั้งแล้วลองใหม่ ยังได้ 401 ให้ไปหน้า login
function installFetchInterceptor(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = getApiPath(input);
    if (!path) return originalFetch(input, init);
    if (NO_REFRESH_PATHS.has(path)) return originalFetch(input, withDefaults(init));

    await ensureFreshSession();
    const sentWith = getSessionVersion();
    const firstResponse = await originalFetch(input, withDefaults(init));

    if (firstResponse.status !== 401 || !hasSession()) {
      notifyForbidden(firstResponse);
      return firstResponse;
    }

    try {
      await refreshSession(sentWith);
    } catch {
      // refresh ถูกปฏิเสธ session.ts จบ session แล้ว ส่วนเน็ตมีปัญหาให้คืน 401 เดิม
      return firstResponse;
    }

    const retryResponse = await originalFetch(input, withDefaults(init));

    if (retryResponse.status === 401) {
      void endSession("session_expired");
    }

    notifyForbidden(retryResponse);
    return retryResponse;
  };
}

export { FORBIDDEN_EVENT, installFetchInterceptor };
