// Import Types
import type { MemberRole } from "./members";

/* -------------------------------------- Auth Types -------------------------------------- */

// Type สิทธิ์ของผู้ใช้ ใช้ซ่อนเมนู กัน route และกันปุ่ม action
export type Permission = "dashboard" | "overview" | "transactions" | "pricing" | "devices" | "theme" | "settings";

// Type ผู้ใช้ที่ login อยู่ (role ไม่ใช่ตัวกันสิทธิ์ ให้ใช้ permissions)
export interface AuthUser {
  id: string;
  username: string;
  name: string;
  email: string | null;
  role: MemberRole;
  permissions: Permission[];
  status: "active"; // login/refresh ได้เฉพาะผู้ใช้ที่ active
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

// Type body ของ POST /auth/login (rememberMe ไม่ส่ง = cookie หายเมื่อปิด browser)
export interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

// Type response ของ GET /auth/me
export interface MeResponse {
  user: AuthUser;
}

// Type response ของ login/refresh แบบ Bearer (server ของหน้าเว็บเรียกโดยไม่มี Origin จึงได้ token ใน body)
export interface BearerSessionResponse {
  token: string;
  refreshToken: string; // ใช้ได้ครั้งเดียว ส่งซ้ำหลังพ้นช่วงผ่อนผัน 30 วินาที backend จะ revoke ทั้ง session
  user: AuthUser;
  expiresIn: number; // วินาทีจนกว่า access token หมดอายุ
  refreshExpiresIn: number; // วินาทีจนกว่า session idle หมดอายุ
  sessionExpiresAt: string; // 12 ชม. หลัง login ต่ออายุไม่ได้
}
