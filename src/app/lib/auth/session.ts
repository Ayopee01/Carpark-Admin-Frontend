// Import Api
import { AUTH_PATHS } from "@/src/app/lib/api/auth";
// Import Types
import type { AuthUser, CookieSessionResponse } from "@/src/app/type/api/auth";
import type { AuthMessage, SessionEndReason, SessionMeta } from "@/src/app/type/ui/login";
// Import Shared
import { apiUrl } from "@/src/app/lib/shared/http";

// ไฟล์นี้เป็นเจ้าของ session ฝั่ง browser ที่เดียว ห้ามที่อื่นเรียก /auth/refresh
// refresh token ใช้ได้ครั้งเดียว ส่งซ้ำ backend จะ revoke ทั้ง session จึง refresh ทีละครั้งทั้งในแท็บและข้ามแท็บ

/* -------------------------------------- Config -------------------------------------- */

// Config ชื่อ cookie เก็บเวลาหมดอายุของ session บนโดเมน Admin (API ไม่อ่าน)
const SESSION_COOKIE = "cp_session";


// Config path ของหน้า login
const LOGIN_PATH = "/landing/login";

// Config ชื่อ Web Lock ที่ใช้กัน refresh ซ้อนกันข้ามแท็บ
const REFRESH_LOCK = "auth-refresh";

// Config ชื่อ BroadcastChannel ที่ใช้แจ้งแท็บอื่น
const CHANNEL_NAME = "auth";

// Config refresh ล่วงหน้าก่อน access token หมดอายุ
const REFRESH_LEAD_MS = 60_000;

// Config access token ที่อายุสั้นกว่านี้ให้ refresh ตอนครึ่งอายุแทน (ใกล้เพดาน 12 ชม.)
const SHORT_TOKEN_MS = 120_000;

// Config ลอง refresh ใหม่เมื่อเน็ตหรือ server มีปัญหาชั่วคราว
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

// Class error ของ refresh ที่ล้มเหลวชั่วคราว (เน็ต/5xx) ให้ลองใหม่ภายหลัง
class TransientRefreshError extends Error {}

// refresh ที่กำลังทำอยู่ ใช้ร่วมกันทุก request ในแท็บ
let refreshPromise: Promise<void> | null = null;
// timer refresh ล่วงหน้า
let refreshTimer: number | undefined;
// timer จบ session ที่เพดาน 12 ชม.
let ceilingTimer: number | undefined;
// เวลาของ heartbeat ครั้งล่าสุด
let lastHeartbeat = 0;
// ช่องทางส่งข้อความข้ามแท็บ
let channel: BroadcastChannel | null = null;
// เริ่ม session ของแท็บแล้วหรือยัง
let started = false;
// ผู้ใช้ที่ login อยู่ (memory เท่านั้น)
let currentUser: AuthUser | null = null;
// กำลังจบ session อยู่ กันเรียกซ้อน
let ending = false;
// component ที่รอรับแจ้งเมื่อ session เปลี่ยน
const listeners = new Set<() => void>();

/* -------------------------------------- Helpers -------------------------------------- */

// Function ตรวจว่าทำงานใน browser
const isBrowser = (): boolean => typeof window !== "undefined";

// Function อ่านเวลาหมดอายุของ session จาก cookie
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

// Function เขียน cookie เวลาหมดอายุ (จดจำฉัน = มี Max-Age, ไม่จดจำ = หายเมื่อปิด browser)
function writeMetaCookie(meta: SessionMeta): void {
  const parts = [`${SESSION_COOKIE}=${encodeURIComponent(JSON.stringify(meta))}`, "Path=/", "SameSite=Strict"];
  if (window.location.protocol === "https:") parts.push("Secure");
  if (meta.remember && meta.refreshExpiresAt) {
    parts.push(`Max-Age=${Math.max(0, Math.ceil((meta.refreshExpiresAt - Date.now()) / 1000))}`);
  }
  document.cookie = parts.join("; ");
}

// Function ลบ cookie เวลาหมดอายุ
function deleteMetaCookie(): void {
  document.cookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Strict`;
}

// Function แปลงวันที่ ISO เป็น timestamp (ค่าผิด = null)
function toTimestamp(value?: string | null): number | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

// Function บันทึกเวลาหมดอายุของ session ใหม่และผู้ใช้ปัจจุบัน
function writeSession(info: CookieSessionResponse, remember: boolean): void {
  const now = Date.now();
  const meta: SessionMeta = {
    version: now,
    accessExpiresAt: now + info.expiresIn * 1000,
    refreshExpiresAt: info.refreshExpiresIn ? now + info.refreshExpiresIn * 1000 : null,
    sessionExpiresAt: toTimestamp(info.sessionExpiresAt),
    remember,
  };

  writeMetaCookie(meta);
  currentUser = info.user;
}

// Function ล้าง session ฝั่ง browser
function clearSession(): void {
  if (!isBrowser()) return;
  deleteMetaCookie();
  currentUser = null;
}

// Function ส่งข้อความไปแท็บอื่น
function broadcast(message: AuthMessage): void {
  channel?.postMessage(message);
}

// Function รับข้อความจากแท็บอื่น (session ใหม่ = ตั้งเวลาใหม่, logout = จบ session ตาม)
function handleMessage(message: AuthMessage): void {
  if (message.type === "session_updated") {
    scheduleTimers();
    notify();
  } else {
    void endSession(message.reason, { broadcast: false });
  }
}

// Function แจ้ง component ที่ subscribe ว่า session เปลี่ยน
function notify(): void {
  listeners.forEach((listener) => listener());
}

// Function คำนวณเวลาที่เหลือก่อนต้อง refresh
function msUntilRefresh(meta: SessionMeta): number {
  const lifetime = meta.accessExpiresAt - Date.now();
  return lifetime < SHORT_TOKEN_MS ? lifetime / 2 : lifetime - REFRESH_LEAD_MS;
}

// Function ตรวจว่า access token ยังไม่ถึงเวลา refresh
function isAccessFresh(meta: SessionMeta | null): boolean {
  return Boolean(meta) && msUntilRefresh(meta as SessionMeta) > 0;
}

// Function เรียก POST /auth/refresh (refresh token เป็น cookie ของ API) แล้วบันทึกเวลาหมดอายุใหม่
async function callRefreshEndpoint(): Promise<void> {
  const before = getSessionVersion();
  let response: Response;
  try {
    response = await fetch(apiUrl(AUTH_PATHS.refresh), { method: "POST", credentials: "include", cache: "no-store" });
  } catch {
    throw new TransientRefreshError("Network error while refreshing");
  }

  const data = (await response.json().catch(() => null)) as CookieSessionResponse | null;

  if (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429) {
    // แท็บอื่น rotate cookie ไปก่อนแล้ว (browser ที่ไม่มี Web Locks) backend ยังให้ session อยู่ จึงใช้ของแท็บนั้น
    const now = getSessionVersion();
    if (now !== null && now !== before) {
      scheduleTimers();
      return;
    }

    await endSession("session_expired");
    throw new Error("Refresh rejected");
  }

  if (!response.ok || !data?.user) {
    throw new TransientRefreshError(`Refresh failed (${response.status})`);
  }

  writeSession(data, readMeta()?.remember ?? false);
  scheduleTimers();
  broadcast({ type: "session_updated" });
  notify();
}

// Function refresh ภายใต้ Web Lock และข้ามถ้าแท็บอื่น refresh ไปแล้วระหว่างรอ lock
async function refreshUnderLock(rejectedVersion: number | null | undefined): Promise<void> {
  const run = async () => {
    // cookie ที่ server ตอบ 401 ไปแล้วห้ามใช้ต่อ แม้เวลาจะยังไม่หมด
    const meta = readMeta();
    const replaced = rejectedVersion !== undefined && meta !== null && meta.version !== rejectedVersion;
    if (replaced || (rejectedVersion === undefined && isAccessFresh(meta))) return;
    await callRefreshEndpoint();
  };

  await navigator.locks.request(REFRESH_LOCK, run);
}

// Function ตั้งเวลา refresh ล่วงหน้า และเวลาจบ session ที่เพดาน 12 ชม.
function scheduleTimers(): void {
  window.clearTimeout(refreshTimer);
  window.clearTimeout(ceilingTimer);

  const meta = readMeta();
  if (!meta) return;

  const delay = Math.max(0, msUntilRefresh(meta));
  refreshTimer = window.setTimeout(() => void refreshFromTimer(), delay);

  if (meta.sessionExpiresAt) {
    const untilCeiling = meta.sessionExpiresAt - Date.now();
    // setTimeout รับได้ไม่เกิน ~24.8 วัน
    ceilingTimer = window.setTimeout(
      () => void endSession("session_expired"),
      Math.min(Math.max(0, untilCeiling), 2 ** 31 - 1)
    );
  }
}

// Function refresh ตามเวลาที่ตั้งไว้ ล้มเหลวชั่วคราวให้ลองใหม่ภายหลัง
async function refreshFromTimer(): Promise<void> {
  try {
    await refreshSession();
  } catch (error) {
    if (error instanceof TransientRefreshError) {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => void refreshFromTimer(), TRANSIENT_RETRY_MS);
    }
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
  if (!isAccessFresh(meta)) {
    void refreshFromTimer();
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

// Function ตรวจว่ายังมี session อยู่จากเวลาหมดอายุ (อ่าน token cookie ไม่ได้)
function hasSession(): boolean {
  const meta = readMeta();
  if (!meta) return false;
  const now = Date.now();
  if (meta.sessionExpiresAt && now >= meta.sessionExpiresAt) return false;
  if (meta.refreshExpiresAt && now >= meta.refreshExpiresAt) return false;
  return true;
}

// Function ดึง version ของ cookie ชุดปัจจุบัน ส่งให้ refreshSession หลังได้ 401
function getSessionVersion(): number | null {
  return readMeta()?.version ?? null;
}

// Function ดึงเวลาที่ session จบแน่นอน (12 ชม. หลัง login)
function getSessionExpiresAt(): number | null {
  return readMeta()?.sessionExpiresAt ?? null;
}

// Function ดึงผู้ใช้ที่ login อยู่ (null จนกว่าจะโหลด)
function getCurrentUser(): AuthUser | null {
  return currentUser;
}

// Function บันทึกผู้ใช้จาก /auth/me ให้เมนูและการตรวจสิทธิ์ตรงกับ backend
function setCurrentUser(user: AuthUser): void {
  currentUser = user;
  notify();
}

// Function ให้ component รับแจ้งเมื่อ session เปลี่ยน คืน function ยกเลิก
function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Function refresh ครั้งเดียวที่ทุกคนในแท็บใช้ร่วมกัน (ส่ง version ที่ได้ 401 เพื่อข้ามถ้าแท็บอื่น refresh แล้ว)
function refreshSession(rejectedVersion?: number | null): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = refreshUnderLock(rejectedVersion).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// Function รอ refresh ที่ค้างอยู่ หรือ refresh ก่อนส่ง request ถ้า access token หมดอายุแล้ว
async function ensureFreshSession(): Promise<void> {
  try {
    if (refreshPromise) {
      await refreshPromise;
      return;
    }
    const meta = readMeta();
    if (meta && meta.accessExpiresAt - Date.now() <= 0) await refreshSession();
  } catch {
    // ถูกปฏิเสธ = จบ session ไปแล้ว ส่วนล้มเหลวชั่วคราวให้ request ตัดสินเอง
  }
}

// Function เริ่ม session หลัง login สำเร็จ (backend ตั้ง cookie แล้ว)
function startSession(info: CookieSessionResponse, rememberMe: boolean): void {
  ending = false;
  writeSession(info, rememberMe);
  scheduleTimers();
  broadcast({ type: "session_updated" });
  notify();
}

// Function ตรวจว่าผู้ใช้ติ๊กจดจำฉันตอน login
function isRemembered(): boolean {
  return readMeta()?.remember === true;
}

// Function จบ session ทุกแท็บแล้วไปหน้า login (ไม่ใช่ logout เอง = ให้ backend ลบ cookie และพากลับหน้าเดิม)
async function endSession(
  reason: SessionEndReason,
  options: { broadcast?: boolean; returnHere?: boolean } = {}
): Promise<void> {
  if (!isBrowser() || ending) return;
  ending = true;

  window.clearTimeout(refreshTimer);
  window.clearTimeout(ceilingTimer);
  clearSession();
  if (options.broadcast !== false) {
    broadcast({ type: "logged_out", reason });
    // backend จบ session ไปแล้ว logout ใช้แค่ลบ cookie (ตอบ 200 เสมอ)
    if (reason !== "logout") {
      await fetch(apiUrl(AUTH_PATHS.logout), {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        keepalive: true,
      }).catch(() => undefined);
    }
  }
  notify();

  if (window.location.pathname === LOGIN_PATH) {
    ending = false;
    return;
  }

  const params = new URLSearchParams();
  if (reason !== "logout") params.set("reason", reason);
  if (reason !== "logout" || options.returnHere) {
    params.set("redirect", `${window.location.pathname}${window.location.search}`);
  }
  const query = params.toString();
  // ออกจากหน้าแล้ว SSE, WebSocket และ Web Lock ปิดเอง
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- ตั้งใจโหลดหน้าใหม่ทั้งหน้า ไม่ใช้ router
  window.location.assign(`${LOGIN_PATH}${query ? `?${query}` : ""}`);
}

// Function ออกจากระบบ backend revoke session และลบ cookie แม้ access token หมดอายุ แล้วจบ session ทุกแท็บ
async function logout(options: { returnHere?: boolean } = {}): Promise<void> {
  try {
    await fetch(apiUrl(AUTH_PATHS.logout), { method: "POST", credentials: "include", cache: "no-store" });
  } catch {
    // ออกจากระบบฝั่ง browser ต่อแม้เรียก backend ไม่ได้
  }
  await endSession("logout", { returnHere: options.returnHere });
}

// Function จบ session เมื่อ backend แจ้งว่า session จบแล้ว (ห้าม refresh)
function handleSessionRevoked(reason?: string): void {
  void endSession(REVOKE_REASON_MAP[reason ?? ""] ?? "session_expired");
}

// Function ติดตั้ง timer และ listener ของ session ครั้งเดียวต่อแท็บ
function startAuthSession(): void {
  if (!isBrowser() || started) return;
  started = true;

  if (typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event: MessageEvent<AuthMessage>) => handleMessage(event.data);
  }
  document.addEventListener("visibilitychange", handleVisibility);
  window.addEventListener("focus", checkNow);
  window.addEventListener("online", checkNow);
  window.addEventListener("pageshow", checkNow);

  lastHeartbeat = Date.now();
  window.setInterval(heartbeat, HEARTBEAT_MS);

  checkNow();
}

export { SESSION_WARNING_MS, SESSION_END_MESSAGES, hasSession, getSessionVersion, getSessionExpiresAt, getCurrentUser, setCurrentUser, subscribeSession, refreshSession, ensureFreshSession, startSession, isRemembered, endSession, logout, handleSessionRevoked, startAuthSession };
