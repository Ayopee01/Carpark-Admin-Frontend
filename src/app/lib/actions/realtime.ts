"use server";
// Import Server
import { getAccessToken } from "@/src/app/lib/server/backend";
import { runAction } from "@/src/app/lib/server/action";
// Import Types
import type { ActionResult } from "@/src/app/type/api/common";
import type { RealtimeConnection } from "@/src/app/type/api/realtime";

// Server Action ส่ง access token และ URL ของ Socket.IO ให้ browser ต่อ /admin ทุกครั้งที่ต่อหรือต่อใหม่
// proxy.ts refresh token ก่อนถึงที่นี่เมื่อใกล้หมดอายุ token จึงสดเสมอ (REALTIME_URL อ่านตอน runtime ไม่ต้อง build ใหม่)
async function getRealtimeConnection(): Promise<ActionResult<RealtimeConnection>> {
  return runAction(async () => ({
    url: process.env.REALTIME_URL?.trim().replace(/\/+$/, "") || null,
    // runAction ตรวจแล้วว่ามี token
    token: (await getAccessToken()) ?? "",
  }));
}

export { getRealtimeConnection };
