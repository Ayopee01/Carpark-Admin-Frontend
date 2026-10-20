import "server-only";
// Import Library
import { cookies, headers } from "next/headers";
// Import Server
import { forwardHeaders, getBackendUrl, readSession } from "./session";
// Import Types
import type { BackendRequestOptions } from "@/src/app/type/api/common";
// Import Shared
import { ApiError, buildQuery, parseRetryAfter, toApiError } from "@/src/app/lib/shared/http";

// ไฟล์นี้เป็นทางเดียวที่หน้าเว็บคุยกับ backend (Data Access Layer) ใช้จาก Server Component, Server Action และ Route Handler
// แนบ access token จาก httpOnly cookie เป็น Bearer ส่วนการ refresh ทำใน proxy.ts ก่อนถึงที่นี่

/* -------------------------------------- Helpers -------------------------------------- */

// Function สร้าง error เมื่อเชื่อมต่อ backend ไม่ได้ (ส่งต่อให้ browser เป็น 502 BACKEND_UNAVAILABLE)
function unavailableError(): ApiError {
  return toApiError(502, { code: "BACKEND_UNAVAILABLE", message: "Backend unavailable" }, "ไม่สามารถเชื่อมต่อระบบได้");
}

// Function อ่าน access token จาก cookie ของ request ปัจจุบัน
async function getAccessToken(): Promise<string | null> {
  return readSession(await cookies()).accessToken;
}

// Function อ่าน header ของ browser ที่ต้องส่งต่อให้ backend
async function getForwardedClient(): Promise<Record<string, string>> {
  const incoming = await headers();
  return forwardHeaders({ forwardedFor: incoming.get("x-forwarded-for"), userAgent: incoming.get("user-agent") });
}

// Function อ่าน JSON ของ response (ไม่มี body หรือ parse ไม่ได้ = null)
async function parseJson(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  return response.json().catch(() => null);
}

/* -------------------------------------- Functions -------------------------------------- */

// Function ส่ง request ไป backend /api<path> (object ส่งเป็น JSON, FormData ส่งเป็น multipart) คืน Response ดิบ
async function backendFetch(path: string, options: BackendRequestOptions = {}): Promise<Response> {
  const { query, body, token, ...rest } = options;
  const init: RequestInit = { ...rest };
  delete (init as BackendRequestOptions).errorMessage;
  const requestHeaders = new Headers(init.headers);
  let payload: BodyInit | undefined;

  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined && body !== null) {
    payload = JSON.stringify(body);
    if (!requestHeaders.has("Content-Type")) requestHeaders.set("Content-Type", "application/json");
  }

  const accessToken = token === undefined ? await getAccessToken() : token;
  if (accessToken) requestHeaders.set("Authorization", `Bearer ${accessToken}`);
  Object.entries(await getForwardedClient()).forEach(([key, value]) => requestHeaders.set(key, value));

  try {
    return await fetch(`${getBackendUrl()}/api${path}${buildQuery(query)}`, {
      ...init,
      headers: requestHeaders,
      body: payload,
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw unavailableError();
  }
}

// Function เรียก backend แบบ JSON โยน ApiError / ForbiddenError (ข้อความเป็นภาษาไทย body เดิมอยู่ใน raw)
async function backendJson<T>(path: string, options: BackendRequestOptions = {}): Promise<T> {
  const response = await backendFetch(path, options);
  const data = await parseJson(response);

  if (!response.ok) {
    throw toApiError(response.status, data, options.errorMessage ?? "API request failed", parseRetryAfter(response.headers));
  }

  return data as T;
}

// Function เรียก backend ที่ตอบเป็นไฟล์ คืน Response ดิบให้ Route Handler ส่งต่อแบบ stream
async function backendFile(path: string, options: BackendRequestOptions = {}): Promise<Response> {
  const response = await backendFetch(path, options);

  if (!response.ok) {
    throw toApiError(response.status, await parseJson(response), options.errorMessage ?? "API request failed", parseRetryAfter(response.headers));
  }

  return response;
}

export { backendFetch, backendJson, backendFile, getAccessToken };
