/* -------------------------------------- Auth Types -------------------------------------- */

// Type สิทธิ์ของผู้ใช้ ใช้ซ่อนเมนู กัน route และกันปุ่ม action
export type Permission = "dashboard" | "overview" | "transactions" | "pricing" | "devices" | "theme" | "settings";

// Type ผู้ใช้ที่ login อยู่ (role ไม่ใช่ตัวกันสิทธิ์ ให้ใช้ permissions)
export interface AuthUser {
  id: string;
  username: string;
  name: string;
  email: string | null;
  role: string; // เช่น super_admin, staff
  permissions: Permission[];
  status: "active" | (string & {});
  phone?: string | null;
  createdAt?: string;
  updatedAt?: string;
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

// Type response ของ login/refresh แบบ cookie (token อยู่ใน httpOnly cookie ไม่อยู่ใน body)
export interface CookieSessionResponse {
  user: AuthUser;
  expiresIn: number; // วินาทีจนกว่า access token หมดอายุ
  refreshExpiresIn: number; // วินาทีจนกว่า session idle หมดอายุ
  sessionExpiresAt: string; // 12 ชม. หลัง login ต่ออายุไม่ได้
}
