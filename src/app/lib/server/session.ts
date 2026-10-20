// Import Types
import type { BearerSessionResponse } from "@/src/app/type/api/auth";
import type { SessionMeta } from "@/src/app/type/ui/login";

// ไฟล์นี้เป็นเจ้าของ session ฝั่ง server ที่เดียว: อ่าน/เขียน cookie และ refresh token กับ backend
// ใช้ได้ทั้งใน proxy.ts (NextRequest/NextResponse cookies) และ Server Action/Route Handler (cookies() ของ next/headers)
// refresh token ใช้ได้ครั้งเดียว backend ผ่อนผันให้ส่งซ้ำได้ 30 วินาทีหลัง rotate (หลายแท็บ/หลาย request พร้อมกัน) โดยไม่ revoke session

/* -------------------------------------- Config -------------------------------------- */

// Config ชื่อ cookie บนโดเมน Admin (access/refresh เป็น httpOnly, meta ให้ browser อ่านเวลาหมดอายุได้)
const SESSION_COOKIES = {
  access: "cp_access",
  refresh: "cp_refresh",
  meta: "cp_session",
} as const;

// Config refresh ล่วงหน้าก่อน access token หมดอายุ (browser ส่ง keepalive เข้ามาในช่วงนี้)
const REFRESH_LEAD_MS = 5 * 60_000;

// Config เก็บผล refresh ไว้ให้ request ที่ถือ refresh token ชุดเดิมใช้ร่วมกัน (เท่าช่วงผ่อนผันของ backend)
const REFRESH_SHARE_MS = 30_000;

// Config cookie ของ session ส่งเฉพาะ HTTPS เสมอ (browser ยอมให้ http://localhost ตอน dev)
const COOKIE_SECURE = true;

/* -------------------------------------- Types -------------------------------------- */

// Type ตัวอ่าน cookie (RequestCookies ของ proxy หรือ cookies() ของ next/headers)
type CookieReader = { get(name: string): { value: string } | undefined };

// Type ตัวเขียน cookie (ResponseCookies ของ proxy หรือ cookies() ใน Server Action/Route Handler)
type CookieWriter = {
  set(name: string, value: string, options: { httpOnly: boolean; secure: boolean; sameSite: "lax"; path: string; maxAge?: number }): unknown;
};

// Type session ที่อ่านจาก cookie
type StoredSession = {
  accessToken: string | null;
  refreshToken: string | null;
  meta: SessionMeta | null;
};

// Type ผลการ refresh (rejected = backend ปฏิเสธ token, unavailable = เชื่อมต่อไม่ได้หรือ 5xx ให้ลองใหม่ภายหลัง)
type RefreshOutcome =
  | { kind: "ok"; session: BearerSessionResponse }
  | { kind: "rejected"; code: string | null }
  | { kind: "unavailable" };

// Type header ของ browser ที่ส่งต่อให้ backend (IP ใช้ rate limit และบันทึก session)
type ForwardedClient = { forwardedFor: string | null; userAgent: string | null };

/* -------------------------------------- State -------------------------------------- */

// refresh ที่กำลังทำหรือเพิ่งเสร็จ แยกตาม refresh token (ช่วยลดการส่งซ้ำใน process เดียว ความถูกต้องพึ่งช่วงผ่อนผันของ backend)
const refreshes = new Map<string, Promise<RefreshOutcome>>();

/* -------------------------------------- Helpers -------------------------------------- */

// Function ดึง URL ของ backend ภายใน Docker network จาก API_INTERNAL_URL (อ่านตอน runtime)
function getBackendUrl(): string {
  const value = (process.env.API_INTERNAL_URL ?? "").trim().replace(/\/+$/, "");
  if (!value) throw new Error("API_INTERNAL_URL is required (เช่น http://smart-carpark-api:8080)");
  return value;
}

// Function ดึง IP ของ browser จาก X-Forwarded-For ที่ reverse proxy ต่อท้ายไว้ (ค่าสุดท้ายคือที่ proxy เห็นจริง)
function getClientIp(forwardedFor: string | null): string | null {
  const last = forwardedFor?.split(",").pop()?.trim();
  return last || null;
}

// Function สร้าง header ที่ส่งต่อให้ backend (backend ตั้ง TRUST_PROXY=1 จึงอ่าน IP จาก X-Forwarded-For)
function forwardHeaders(client: ForwardedClient | null): Record<string, string> {
  const headers: Record<string, string> = {};
  const ip = getClientIp(client?.forwardedFor ?? null);
  if (ip) headers["X-Forwarded-For"] = ip;
  if (client?.userAgent) headers["User-Agent"] = client.userAgent;
  return headers;
}

// Function แปลง response ของ login/refresh เป็นเวลาหมดอายุที่ browser อ่านได้
function toMeta(session: BearerSessionResponse, remember: boolean, now: number): SessionMeta {
  const sessionExpiresAt = Date.parse(session.sessionExpiresAt);
  return {
    accessExpiresAt: now + session.expiresIn * 1000,
    refreshExpiresAt: session.refreshExpiresIn ? now + session.refreshExpiresIn * 1000 : null,
    sessionExpiresAt: Number.isNaN(sessionExpiresAt) ? null : sessionExpiresAt,
    remember,
  };
}

// Function แปลง meta cookie เป็น object (ค่าผิด = null)
function parseMeta(value: string | undefined): SessionMeta | null {
  if (!value) return null;
  try {
    const meta = JSON.parse(value) as SessionMeta;
    return typeof meta.accessExpiresAt === "number" ? meta : null;
  } catch {
    return null;
  }
}

/* -------------------------------------- Functions -------------------------------------- */

// Function อ่าน session จาก cookie
function readSession(cookies: CookieReader): StoredSession {
  return {
    accessToken: cookies.get(SESSION_COOKIES.access)?.value || null,
    refreshToken: cookies.get(SESSION_COOKIES.refresh)?.value || null,
    meta: parseMeta(cookies.get(SESSION_COOKIES.meta)?.value),
  };
}

// Function สร้างค่า cookie ทั้งชุดของ session ใหม่
function toSessionCookies(session: BearerSessionResponse, meta: SessionMeta): [name: string, value: string][] {
  return [
    [SESSION_COOKIES.access, session.token],
    [SESSION_COOKIES.refresh, session.refreshToken],
    [SESSION_COOKIES.meta, JSON.stringify(meta)],
  ];
}

// Function เขียน cookie ของ session ใหม่ (จดจำฉัน = อยู่จนถึงเวลาหมดอายุของ refresh, ไม่จดจำ = หายเมื่อปิด browser)
function writeSession(cookies: CookieWriter, session: BearerSessionResponse, remember: boolean): SessionMeta {
  const meta = toMeta(session, remember, Date.now());
  const maxAge = remember && meta.refreshExpiresAt ? Math.max(0, Math.floor((meta.refreshExpiresAt - Date.now()) / 1000)) : undefined;
  const base = { secure: COOKIE_SECURE, sameSite: "lax" as const, path: "/", ...(maxAge !== undefined ? { maxAge } : {}) };

  toSessionCookies(session, meta).forEach(([name, value]) => {
    cookies.set(name, value, { ...base, httpOnly: name !== SESSION_COOKIES.meta });
  });
  return meta;
}

// Function ใส่ token ชุดใหม่ใน cookie ของ request ที่กำลังส่งต่อ (proxy ใช้ให้ Server Component เห็น token ใหม่ใน request เดียวกัน)
function writeRequestSession(cookies: { set(name: string, value: string): unknown }, session: BearerSessionResponse, remember: boolean): void {
  toSessionCookies(session, toMeta(session, remember, Date.now())).forEach(([name, value]) => cookies.set(name, value));
}

// Function ลบ cookie ของ session ทั้งหมด
function clearSession(cookies: CookieWriter): void {
  const base = { secure: COOKIE_SECURE, sameSite: "lax" as const, path: "/", maxAge: 0 };
  cookies.set(SESSION_COOKIES.access, "", { ...base, httpOnly: true });
  cookies.set(SESSION_COOKIES.refresh, "", { ...base, httpOnly: true });
  cookies.set(SESSION_COOKIES.meta, "", { ...base, httpOnly: false });
}

// Function ตรวจว่าถึงเวลา refresh แล้ว (ไม่มี meta = ไม่รู้อายุ ให้ refresh)
function needsRefresh(meta: SessionMeta | null, now = Date.now()): boolean {
  return !meta || meta.accessExpiresAt - now <= REFRESH_LEAD_MS;
}

// Function ตรวจว่า access token ยังใช้ได้อีกอย่างน้อย 5 วินาที
function isAccessValid(meta: SessionMeta | null, now = Date.now()): boolean {
  return Boolean(meta) && (meta as SessionMeta).accessExpiresAt - now > 5_000;
}

// Function ตรวจว่า session ถึงเพดาน 12 ชม. แล้ว (refresh ต่อไม่ได้)
function isSessionOver(meta: SessionMeta | null, now = Date.now()): boolean {
  return Boolean(meta?.sessionExpiresAt) && now >= (meta as SessionMeta & { sessionExpiresAt: number }).sessionExpiresAt;
}

// Function เรียก POST /api/auth/refresh แบบ Bearer (ไม่ส่ง Origin) ได้ token ชุดใหม่ใน body
async function callRefresh(refreshToken: string, client: ForwardedClient | null): Promise<RefreshOutcome> {
  let response: Response;
  try {
    response = await fetch(`${getBackendUrl()}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...forwardHeaders(client) },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
  } catch {
    return { kind: "unavailable" };
  }

  const data = (await response.json().catch(() => null)) as (BearerSessionResponse & { code?: string }) | null;
  if (response.ok && data?.token && data.refreshToken) return { kind: "ok", session: data };
  if (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429) {
    return { kind: "rejected", code: typeof data?.code === "string" ? data.code : null };
  }
  return { kind: "unavailable" };
}

// Function refresh token ครั้งเดียวต่อ refresh token ใน process นี้ request อื่นที่ถือ token เดิมใช้ผลเดียวกัน
function refreshSession(refreshToken: string, client: ForwardedClient | null): Promise<RefreshOutcome> {
  const pending = refreshes.get(refreshToken);
  if (pending) return pending;

  const promise = callRefresh(refreshToken, client);
  refreshes.set(refreshToken, promise);
  void promise.then((outcome) => {
    // ล้มเหลวชั่วคราวให้ลองใหม่ได้ทันที ส่วนผลอื่นเก็บไว้ให้ request ที่ตามมาด้วย cookie เดิม
    const keepMs = outcome.kind === "unavailable" ? 0 : REFRESH_SHARE_MS;
    setTimeout(() => refreshes.delete(refreshToken), keepMs);
  });
  return promise;
}

export type { CookieReader, CookieWriter, StoredSession, RefreshOutcome, ForwardedClient };
export { SESSION_COOKIES, getBackendUrl, forwardHeaders, readSession, writeSession, writeRequestSession, clearSession, needsRefresh, isAccessValid, isSessionOver, refreshSession };
