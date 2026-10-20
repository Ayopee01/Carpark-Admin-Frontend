// Import Actions
import { logout as logoutAction } from "@/src/app/lib/actions/auth";
// Import Types
import type { AuthMessage, SessionEndReason, SessionMeta } from "@/src/app/type/ui/login";

// ไฟล์นี้ดูแล session ฝั่ง browser: browser ไม่เห็น token (อยู่ใน httpOnly cookie) อ่านได้แค่เวลาหมดอายุจาก cookie cp_session
// แท็บที่เปิดค้างส่ง keepalive ก่อน access token หมดอายุ ให้ proxy.ts refresh ให้ (session จึงอยู่ได้ถึงเพดาน 12 ชม. แม้ไม่มีการกด)

/* -------------------------------------- Config -------------------------------------- */

// Config ชื่อ cookie เวลาหมดอายุที่ server เขียนไว้ (ต้องตรงกับ SESSION_COOKIES.meta)
const SESSION_COOKIE = "cp_session";

// Config path ของหน้า login
const LOGIN_PATH = "/landing/login";

// Config path ของ keepalive (ผ่าน proxy.ts ซึ่ง refresh token ให้)
const KEEPALIVE_PATH = "/api/auth/session";

// Config ชื่อ BroadcastChannel ที่ใช้แจ้งแท็บอื่นเมื่อออกจากระบบ
const CHANNEL_NAME = "auth";

// Config ส่ง keepalive ก่อน access token หมดอายุ (ต้องน้อยกว่า REFRESH_LEAD_MS ฝั่ง server ที่ 5 นาที)
const KEEPALIVE_LEAD_MS = 4 * 60_000;

// Config ลอง keepalive ใหม่เมื่อเน็ตหรือ server มีปัญหาชั่วคราว
const TRANSIENT_RETRY_MS = 15_000;

// Config ระยะ heartbeat ใช้จับว่าเครื่องเพิ่งตื่นจาก sleep
const HEARTBEAT_MS = 15_000;

// Config แสดงแถบเตือนก่อน session หมดอายุ
const SESSION_WARNING_MS = 5 * 60_000;

// Config แปลง reason ของ session_revoked จาก backend เป็นเหตุผลที่หน้า login แสดง
const REVOKE_REASON_MAP: Record<string, SessionEndReason> = {
  logout: "logout",
  refresh_token_reused: "refresh_token_reused",
  session_expired: "session_expired",
  session_idle_expired: "session_expired",
  session_revoked: "session_expired",
  session_not_found: "session_expired",
  password_changed: "session_expired",
  user_disabled: "account_disabled",
  user_deleted: "account_disabled",
};

// Config ข้อความที่หน้า login แสดงตามเหตุผลที่ session จบ
const SESSION_END_MESSAGES: Record<SessionEndReason, string> = {
  logout: "",
  session_expired: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่",
  refresh_token_reused: "พบการใช้งานผิดปกติ กรุณาเข้าสู่ระบบใหม่",
  account_disabled: "บัญชีของคุณถูกระงับ กรุณาติดต่อผู้ดูแลระบบ",
};

/* -------------------------------------- State -------------------------------------- */

// timer ของ keepalive ครั้งถัดไป
let keepaliveTimer: number | undefined;
// timer จบ session ที่เพดาน 12 ชม.
let ceilingTimer: number | undefined;
// เวลาของ heartbeat ครั้งล่าสุด
let lastHeartbeat = 0;
// ช่องทางส่งข้อความข้ามแท็บ
let channel: BroadcastChannel | null = null;
// เริ่มดูแล session ของแท็บแล้วหรือยัง
let started = false;
// กำลังจบ session อยู่ กันเรียกซ้อน
let ending = false;
// keepalive ที่กำลังส่งอยู่ ใช้ร่วมกันในแท็บ
let keepalivePromise: Promise<void> | null = null;

/* -------------------------------------- Helpers -------------------------------------- */

// Function ตรวจว่าทำงานใน browser
const isBrowser = (): boolean => typeof window !== "undefined";

// Function อ่านเวลาหมดอายุของ session จาก cookie (ไม่มี = ยังไม่ login หรือ session จบแล้ว)
function readMeta(): SessionMeta | null {
  if (!isBrowser()) return null;
  const entry = document.cookie.split("; ").find((item) => item.startsWith(`${SESSION_COOKIE}=`));
  if (!entry) return null;
  try {
    return JSON.parse(decodeURIComponent(entry.slice(SESSION_COOKIE.length + 1))) as SessionMeta;
  } catch {
    return null;
  }
}

// Function สร้าง URL ของหน้า login พร้อมเหตุผลและหน้าที่จะกลับมา
function buildLoginUrl(reason: SessionEndReason, returnHere: boolean): string {
  const params = new URLSearchParams();
  if (reason !== "logout") params.set("reason", reason);
  if (reason !== "logout" || returnHere) {
    params.set("redirect", `${window.location.pathname}${window.location.search}`);
  }
  const query = params.toString();
  return `${LOGIN_PATH}${query ? `?${query}` : ""}`;
}

// Function ส่ง keepalive ให้ proxy.ts refresh token แล้วตั้งเวลารอบถัดไปจาก cookie ใหม่
async function sendKeepalive(): Promise<void> {
  let response: Response;
  try {
    response = await fetch(KEEPALIVE_PATH, { cache: "no-store" });
  } catch {
    retryLater();
    return;
  }

  if (response.status === 401) {
    await endSession("session_expired");
    return;
  }
  if (!response.ok) {
    retryLater();
    return;
  }
  scheduleTimers();
}

// Function ส่ง keepalive ครั้งเดียวที่ทั้งแท็บใช้ร่วมกัน
function keepalive(): Promise<void> {
  keepalivePromise ??= sendKeepalive().finally(() => {
    keepalivePromise = null;
  });
  return keepalivePromise;
}

// Function ลอง keepalive ใหม่ภายหลัง
function retryLater(): void {
  window.clearTimeout(keepaliveTimer);
  keepaliveTimer = window.setTimeout(() => void keepalive(), TRANSIENT_RETRY_MS);
}

// Function ตั้งเวลา keepalive ก่อน access token หมดอายุ และเวลาจบ session ที่เพดาน 12 ชม.
// แท็บอื่น refresh ไปก่อน cookie จะมีเวลาใหม่ แท็บนี้จึงเลื่อนรอบถัดไปเองโดยไม่ต้องส่ง request
function scheduleTimers(): void {
  window.clearTimeout(keepaliveTimer);
  window.clearTimeout(ceilingTimer);

  const meta = readMeta();
  if (!meta) return;

  const delay = Math.max(0, meta.accessExpiresAt - KEEPALIVE_LEAD_MS - Date.now());
  keepaliveTimer = window.setTimeout(() => {
    const latest = readMeta();
    if (latest && latest.accessExpiresAt - KEEPALIVE_LEAD_MS > Date.now()) scheduleTimers();
    else void keepalive();
  }, delay);

  if (meta.sessionExpiresAt) {
    // setTimeout รับได้ไม่เกิน ~24.8 วัน
    ceilingTimer = window.setTimeout(
      () => void endSession("session_expired"),
      Math.min(Math.max(0, meta.sessionExpiresAt - Date.now()), 2 ** 31 - 1)
    );
  }
}

// Function ตรวจ session ทันที ใช้ตอนเครื่องตื่นหรือกลับมาที่แท็บ (timer ไม่ทำงานระหว่าง sleep)
function checkNow(): void {
  const meta = readMeta();
  if (!meta) return;
  if (meta.sessionExpiresAt && Date.now() >= meta.sessionExpiresAt) {
    void endSession("session_expired");
    return;
  }
  if (meta.accessExpiresAt - KEEPALIVE_LEAD_MS <= Date.now()) {
    void keepalive();
    return;
  }
  scheduleTimers();
}

// Function ตรวจว่าเครื่องเพิ่งตื่นจาก sleep จากช่วงห่างของ heartbeat
function heartbeat(): void {
  const now = Date.now();
  if (lastHeartbeat && now - lastHeartbeat > HEARTBEAT_MS * 3) checkNow();
  lastHeartbeat = now;
}

// Function ตรวจ session เมื่อแท็บกลับมาแสดง
function handleVisibility(): void {
  if (document.visibilityState === "visible") checkNow();
}

/* -------------------------------------- Functions -------------------------------------- */

// Function ดึงเวลาที่ session จบแน่นอน (12 ชม. หลัง login)
function getSessionExpiresAt(): number | null {
  return readMeta()?.sessionExpiresAt ?? null;
}

// Function ตรวจว่ามี session บนเครื่องนี้ (cookie ยังไม่หมดอายุ)
function hasSession(): boolean {
  const meta = readMeta();
  if (!meta) return false;
  const now = Date.now();
  if (meta.sessionExpiresAt && now >= meta.sessionExpiresAt) return false;
  return !meta.refreshExpiresAt || now < meta.refreshExpiresAt;
}

// Function จบ session ทุกแท็บแล้วไปหน้า login (ไม่ใช่ logout เอง = พากลับหน้าเดิมหลัง login)
async function endSession(
  reason: SessionEndReason,
  options: { broadcast?: boolean; returnHere?: boolean } = {}
): Promise<void> {
  if (!isBrowser() || ending) return;
  ending = true;

  window.clearTimeout(keepaliveTimer);
  window.clearTimeout(ceilingTimer);

  if (options.broadcast !== false) {
    channel?.postMessage({ type: "logged_out", reason } satisfies AuthMessage);
    // ให้ backend revoke session และลบ cookie (แท็บที่ได้ข้อความไม่ต้องทำซ้ำ)
    await logoutAction().catch(() => undefined);
  }

  if (window.location.pathname === LOGIN_PATH) {
    ending = false;
    return;
  }

  // โหลดหน้าใหม่ทั้งหน้า SSE และ WebSocket ปิดเอง
  window.location.assign(buildLoginUrl(reason, options.returnHere === true));
}

// Function ออกจากระบบ
function logout(options: { returnHere?: boolean } = {}): Promise<void> {
  return endSession("logout", { returnHere: options.returnHere });
}

// Function จบ session เมื่อ backend แจ้งว่า session จบแล้ว (SSE session_revoked / WebSocket 4401)
function handleSessionRevoked(reason?: string): void {
  void endSession(REVOKE_REASON_MAP[reason ?? ""] ?? "session_expired");
}

// Function เริ่มดูแล session ของแท็บครั้งเดียว (keepalive, ตรวจตอนตื่นจาก sleep, ออกจากระบบตามแท็บอื่น)
function startSessionKeeper(): void {
  if (!isBrowser() || started) return;
  started = true;

  if (typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(CHANNEL_NAME);
    // แท็บอื่นออกจากระบบแล้ว (ลบ cookie แล้ว) ตามไปหน้า login โดยไม่ต้องเรียก logout ซ้ำ
    channel.onmessage = (event: MessageEvent<AuthMessage>) => void endSession(event.data.reason, { broadcast: false });
  }
  document.addEventListener("visibilitychange", handleVisibility);
  window.addEventListener("focus", checkNow);
  window.addEventListener("online", checkNow);
  window.addEventListener("pageshow", checkNow);

  lastHeartbeat = Date.now();
  window.setInterval(heartbeat, HEARTBEAT_MS);

  checkNow();
}

export { SESSION_WARNING_MS, SESSION_END_MESSAGES, getSessionExpiresAt, hasSession, endSession, logout, handleSessionRevoked, startSessionKeeper };
