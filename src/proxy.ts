// Import Library
import { NextResponse, type NextRequest } from "next/server";
// Import Server
import { clearSession, isAccessValid, isSessionOver, needsRefresh, readSession, refreshSession, writeRequestSession, writeSession } from "@/src/app/lib/server/session";
import type { ForwardedClient } from "@/src/app/lib/server/session";

// proxy ทำงานก่อนทุกหน้าใน /landing และทุก Route Handler ใน /api (รวม Server Action ที่ POST มาที่หน้าเหล่านั้น)
// 1. ไม่มี session = ส่งไปหน้า login (หน้า) หรือตอบ 401 (api) ตรวจแบบเร็วจาก cookie เท่านั้น backend ตรวจ token จริง
// 2. access token ใกล้หมดอายุ = refresh ก่อน แล้วส่ง cookie ใหม่ให้ทั้ง browser และ Server Component ใน request นี้

/* -------------------------------------- Config -------------------------------------- */

// Config path ของหน้า login
const LOGIN_PATH = "/landing/login";

// Config header ที่ส่ง path ปัจจุบันให้ Server Component (ใช้ทำ redirect กลับหลัง login)
const CURRENT_PATH_HEADER = "x-current-path";

/* -------------------------------------- Helpers -------------------------------------- */

// Function ตรวจว่าเป็น request ของ Route Handler
function isApiRequest(request: NextRequest): boolean {
  return request.nextUrl.pathname.startsWith("/api/");
}

// Function ตรวจว่าเป็น Server Action (ให้ action ตอบ 401 เอง ห้าม redirect เพราะ client รอผลเป็นข้อมูล)
function isServerAction(request: NextRequest): boolean {
  return request.method === "POST" && request.headers.has("next-action");
}

// Function อ่าน header ของ browser ที่ต้องส่งต่อให้ backend ตอน refresh
function getClient(request: NextRequest): ForwardedClient {
  return { forwardedFor: request.headers.get("x-forwarded-for"), userAgent: request.headers.get("user-agent") };
}

// Function ส่ง request ต่อไปพร้อม path ปัจจุบันใน header
function next(request: NextRequest): NextResponse {
  const headers = new Headers(request.headers);
  headers.set(CURRENT_PATH_HEADER, `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.next({ request: { headers } });
}

// Function ตอบเมื่อไม่มี session ที่ใช้ได้ (หน้า = ไปหน้า login แล้วกลับมาที่เดิม, api/action = 401)
function unauthenticated(request: NextRequest, reason: string | null): NextResponse {
  if (isApiRequest(request) || isServerAction(request)) {
    const response = isServerAction(request)
      ? next(request)
      : NextResponse.json({ code: "UNAUTHORIZED", message: "Unauthorized" }, { status: 401 });
    clearSession(response.cookies);
    return response;
  }

  const url = new URL(LOGIN_PATH, request.url);
  if (reason) url.searchParams.set("reason", reason);
  url.searchParams.set("redirect", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  const response = NextResponse.redirect(url);
  clearSession(response.cookies);
  return response;
}

/* -------------------------------------- Proxy -------------------------------------- */

// Function ตรวจ session และ refresh token ก่อนถึงหน้าและ Route Handler
async function proxy(request: NextRequest): Promise<NextResponse> {
  const session = readSession(request.cookies);
  // หน้า login ไม่ต้องมี session แต่ถ้ามีให้ refresh ด้วย หน้า login จะได้ส่งผู้ใช้ที่ login อยู่ไปต่อ
  const onLogin = request.nextUrl.pathname === LOGIN_PATH;

  if (!session.refreshToken) return onLogin ? next(request) : unauthenticated(request, null);
  if (isSessionOver(session.meta)) return onLogin ? next(request) : unauthenticated(request, "session_expired");
  if (!needsRefresh(session.meta)) return next(request);

  const outcome = await refreshSession(session.refreshToken, getClient(request));

  if (outcome.kind === "ok") {
    // ใส่ cookie ใหม่ใน request ให้ Server Component/Route Handler ใช้ token ใหม่ทันที แล้วส่งให้ browser เก็บ
    const remember = session.meta?.remember ?? false;
    writeRequestSession(request.cookies, outcome.session, remember);
    const response = next(request);
    writeSession(response.cookies, outcome.session, remember);
    return response;
  }

  // refresh ไม่ได้ชั่วคราว หรือ request อื่นเพิ่ง rotate ไปแล้ว (ช่วงผ่อนผัน) ใช้ access token เดิมต่อถ้ายังไม่หมดอายุ
  if (isAccessValid(session.meta) || outcome.kind === "unavailable" || onLogin) return next(request);
  return unauthenticated(request, "session_expired");
}

// Config path ที่ proxy ทำงาน (/uploads ไม่ต้องมี session) ต้อง export ตรงนี้ให้ Next.js อ่านตอน build
export const config = {
  matcher: ["/landing/:path*", "/api/:path*"],
};

export { proxy };
