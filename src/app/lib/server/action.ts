import "server-only";
// Import Server
import { getAccessToken } from "./backend";
// Import Types
import type { ActionResult } from "@/src/app/type/api/common";
// Import Shared
import { ApiError, toActionError, toApiError } from "@/src/app/lib/shared/http";

// Function รัน Server Action ที่ต้อง login แปลงผลเป็น ActionResult (Server Action ห้าม throw เพราะ production ซ่อนข้อความ error)
// ตรวจ session ในทุก action เอง ไม่พึ่ง proxy.ts อย่างเดียว ส่วนสิทธิ์และ input backend ตรวจอีกชั้น
async function runAction<T>(task: () => Promise<T>): Promise<ActionResult<T>> {
  if (!(await getAccessToken())) {
    return { ok: false, error: toActionError(toApiError(401, { code: "UNAUTHORIZED", message: "Unauthorized" }, "กรุณาเข้าสู่ระบบใหม่")) };
  }
  return runPublicAction(task);
}

// Function รัน Server Action ที่ไม่ต้อง login (login) แปลงผลเป็น ActionResult
async function runPublicAction<T>(task: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await task() };
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, error: toActionError(error) };
    console.error("Server Action failed:", error);
    return { ok: false, error: toActionError(toApiError(500, { code: "INTERNAL_SERVER_ERROR", message: "Internal server error" }, "ระบบขัดข้อง")) };
  }
}

export { runAction, runPublicAction };
