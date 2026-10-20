import "server-only";
// Import Library
import type { NextRequest } from "next/server";
// Import Server
import { backendFetch } from "./backend";
// Import Types
import type { QueryParams } from "@/src/app/type/api/common";
// Import Shared
import { ApiError, parseRetryAfter } from "@/src/app/lib/shared/http";

// helper ของ Route Handler ใน app/api: ตอบ JSON, ส่งต่อไฟล์ และส่งต่อ SSE ของ backend
// error ตอบ body เดิมของ backend พร้อม status เดิม ให้ browser แปลข้อความเองเหมือนเรียก backend ตรง

/* -------------------------------------- Helpers -------------------------------------- */

// Function แปลง error เป็น response (body เดิมของ backend + Retry-After)
function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    const headers = error.retryAfterSeconds ? { "Retry-After": String(error.retryAfterSeconds) } : undefined;
    return Response.json(error.raw ?? { code: "INTERNAL_SERVER_ERROR", message: error.message }, { status: error.status, headers });
  }
  if (error instanceof DOMException && error.name === "AbortError") return new Response(null, { status: 499 });
  console.error("Route Handler failed:", error);
  return Response.json({ code: "INTERNAL_SERVER_ERROR", message: "Internal server error" }, { status: 500 });
}

/* -------------------------------------- Functions -------------------------------------- */

// Function อ่าน query string ของ request เป็น object ส่งต่อให้ Data Access Layer (backend ตรวจค่าเอง)
function readQuery(request: NextRequest): QueryParams {
  return Object.fromEntries(request.nextUrl.searchParams.entries());
}

// Function ตอบ JSON จากผลของ Data Access Layer
async function jsonRoute<T>(load: () => Promise<T>): Promise<Response> {
  try {
    return Response.json(await load(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

// Function ส่งต่อไฟล์จาก backend แบบ stream (เช่นรูป QR)
async function fileRoute(load: () => Promise<Response>): Promise<Response> {
  try {
    const response = await load();
    return new Response(response.body, {
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "application/octet-stream",
        "Cache-Control": response.headers.get("cache-control") ?? "no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

// Function ส่งต่อ SSE ของ backend /api<path> ไปที่ browser (browser ปิด stream = ยกเลิก request ไป backend ด้วย)
async function eventStreamRoute(request: NextRequest, path: string): Promise<Response> {
  let upstream: Response;
  try {
    upstream = await backendFetch(path, {
      query: readQuery(request),
      headers: { Accept: "text/event-stream" },
      signal: request.signal,
    });
  } catch (error) {
    return errorResponse(error);
  }

  if (!upstream.ok || !upstream.body) {
    const body = await upstream.json().catch(() => null);
    const retryAfter = parseRetryAfter(upstream.headers);
    return Response.json(body ?? { code: "INTERNAL_SERVER_ERROR", message: "Event stream unavailable" }, {
      status: upstream.ok ? 502 : upstream.status,
      headers: retryAfter ? { "Retry-After": String(retryAfter) } : undefined,
    });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      // ปิด buffering ของ Nginx ให้ event ถึง browser ทันที
      "X-Accel-Buffering": "no",
    },
  });
}

export { readQuery, jsonRoute, fileRoute, eventStreamRoute };
