// Import Types
import type { CookieSessionResponse, LoginRequest, MeResponse } from "@/src/app/type/api/auth";
// Import Shared
import { apiRequest } from "@/src/app/lib/shared/http";

/* -------------------------------------- Config -------------------------------------- */

// Config path ของ auth (login/refresh/logout ไม่ผ่านการ refresh อัตโนมัติเมื่อได้ 401)
const AUTH_PATHS = {
  login: "/auth/login",
  refresh: "/auth/refresh",
  logout: "/auth/logout",
  me: "/auth/me",
} as const;

/* -------------------------------------- Functions -------------------------------------- */

// Function เข้าสู่ระบบ backend ตั้ง token เป็น httpOnly cookie (POST /api/auth/login)
function login(body: LoginRequest): Promise<CookieSessionResponse> {
  return apiRequest<CookieSessionResponse>(AUTH_PATHS.login, { method: "POST", body, errorMessage: "เข้าสู่ระบบไม่สำเร็จ" });
}

// Function ดึงข้อมูลผู้ใช้และ permission ล่าสุด (GET /api/auth/me)
function getMe(): Promise<MeResponse> {
  return apiRequest<MeResponse>(AUTH_PATHS.me);
}

export { AUTH_PATHS, login, getMe };
