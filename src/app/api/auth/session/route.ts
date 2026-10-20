// Import Library
import { cookies } from "next/headers";
// Import Server
import { readSession } from "@/src/app/lib/server/session";

// Route GET /api/auth/session keepalive ของแท็บที่เปิดค้าง proxy.ts refresh token ก่อนถึงที่นี่ คืนเวลาหมดอายุล่าสุด
async function GET(): Promise<Response> {
  const { accessToken, meta } = readSession(await cookies());
  if (!accessToken || !meta) {
    return Response.json({ code: "UNAUTHORIZED", message: "Unauthorized" }, { status: 401 });
  }
  return Response.json(meta, { headers: { "Cache-Control": "no-store" } });
}

export { GET };
