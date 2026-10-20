// Import Library
import type { NextRequest } from "next/server";
// Import Server
import { getBackendUrl } from "@/src/app/lib/server/session";

// Route GET /uploads/... ส่งต่อไฟล์ที่อัปโหลดไว้ใน backend (เช่นโลโก้) ให้หน้าเว็บโหลดจากโดเมนเดียวกัน ไม่ต้อง login
async function GET(_request: NextRequest, { params }: { params: Promise<{ path: string[] }> }): Promise<Response> {
  const { path } = await params;
  const response = await fetch(`${getBackendUrl()}/uploads/${path.map(encodeURIComponent).join("/")}`, { cache: "no-store" }).catch(() => null);

  // ไฟล์ที่ไม่มีอยู่ backend ตอบ 4xx (หลุดจาก static ไปถึง auth) ถือว่าไม่พบไฟล์
  if (!response?.ok || !response.body) {
    return new Response(null, { status: response && response.status < 500 ? 404 : 502 });
  }

  return new Response(response.body, {
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/octet-stream",
      // ชื่อไฟล์โลโก้เปลี่ยนทุกครั้งที่อัปโหลด cache ได้
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export { GET };
