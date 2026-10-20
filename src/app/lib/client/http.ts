// Import Client
import { endSession, handleSessionRevoked } from "./session";
// Import Types
import type { ActionResult, ClientRequestOptions, SessionRevokedEvent, SseBaseEvent, SseOptions, SseStatus } from "@/src/app/type/api/common";
// Import Shared
import { ApiError, ForbiddenError, NetworkError, buildQuery, fromActionError, parseRetryAfter, toApiError, RECONNECT_DELAYS_MS } from "@/src/app/lib/shared/http";

// ไฟล์นี้เป็นทางเดียวที่ browser คุยกับ server ของหน้าเว็บ
// - อ่านข้อมูล: GET Route Handler ใน /api (apiRequest, apiRequestBlob, subscribeSse)
// - เปลี่ยนข้อมูล: Server Action ใน lib/actions ห่อด้วย unwrap
// ทั้งสองทางจัดการ 401 (ไปหน้า login) และ 403 FORBIDDEN (แจ้ง layout) ที่เดียวกัน

/* -------------------------------------- Config -------------------------------------- */

// Config prefix ของ Route Handler
const API_BASE_URL = "/api";

// Config ชื่อ window event เมื่อได้ 403 FORBIDDEN ให้ layout แสดงหน้าไม่มีสิทธิ์
const FORBIDDEN_EVENT = "api-forbidden";

// Config ระยะ ping ก่อนได้ event connected (หลังจากนั้นใช้ pingIntervalMs ที่ backend แจ้ง)
const DEFAULT_PING_INTERVAL_MS = 25_000;

// Config รอข้อมูลแรกจาก stream ก่อนเรียก onNoSnapshot ให้หน้าโหลดผ่าน API แทน
const FIRST_SNAPSHOT_TIMEOUT_MS = 8000;

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

// Function เปิด SSE ผ่าน Route Handler /api<path> ต่อใหม่อัตโนมัติ ตรวจ ping และไป login เมื่อได้ session_revoked คืน function ปิด stream
function subscribeSse<TEvent extends { type: string }>(
  path: string,
  options: SseOptions<TEvent>
): () => void {
  const url = `${API_BASE_URL}${path}${buildQuery(options.query)}`;
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
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok || !response.body) {
        const error = toApiError(response.status, await parseJson(response), "Event stream unavailable");
        // 401 = proxy.ts refresh ไม่ได้แล้ว session จบ ห้ามต่อใหม่
        if (response.status === 401) {
          closed = true;
          setStatus("closed");
          handleAuthError(error);
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

export { FORBIDDEN_EVENT, apiRequest, apiRequestBlob, unwrap, subscribeSse };
