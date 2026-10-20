import "server-only";
// Import Library
import type { NextRequest } from "next/server";
// Import Types
import type { QueryParams } from "@/src/app/type/api/common";
// Import Shared
import { ApiError } from "@/src/app/lib/shared/http";

// helper ของ Route Handler ใน app/api: ตอบ JSON และส่งต่อไฟล์
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

export { readQuery, jsonRoute, fileRoute };
