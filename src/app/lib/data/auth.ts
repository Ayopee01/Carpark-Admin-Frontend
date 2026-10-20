import "server-only";
// Import Types
import type { BearerSessionResponse, LoginRequest, MeResponse } from "@/src/app/type/api/auth";
// Import Server
import { backendJson } from "@/src/app/lib/server/backend";

// refresh token ไม่อยู่ที่นี่ lib/server/session.ts เป็นเจ้าของการ refresh ที่เดียว

// Function เข้าสู่ระบบแบบ Bearer ได้ access/refresh token ใน body ให้ Server Action เก็บเป็น httpOnly cookie (POST /api/auth/login)
function login(body: LoginRequest): Promise<BearerSessionResponse> {
  return backendJson<BearerSessionResponse>("/auth/login", { method: "POST", body, token: null, errorMessage: "เข้าสู่ระบบไม่สำเร็จ" });
}

// Function ออกจากระบบ backend revoke session จาก access หรือ refresh token (ใช้ได้แม้ access token หมดอายุ) ตอบสำเร็จเสมอ (POST /api/auth/logout)
function logout(tokens: { accessToken: string | null; refreshToken: string | null }): Promise<{ message: string }> {
  return backendJson<{ message: string }>("/auth/logout", {
    method: "POST",
    token: tokens.accessToken,
    body: tokens.refreshToken ? { refreshToken: tokens.refreshToken } : {},
    errorMessage: "ออกจากระบบไม่สำเร็จ",
  });
}

// Function ดึงข้อมูลผู้ใช้และ permission ล่าสุด (GET /api/auth/me)
function getMe(): Promise<MeResponse> {
  return backendJson<MeResponse>("/auth/me", { errorMessage: "โหลดข้อมูลผู้ใช้ไม่สำเร็จ" });
}

export { login, logout, getMe };
