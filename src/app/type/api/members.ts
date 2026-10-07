// Import Types
import type { Permission } from "./auth";

/* -------------------------------------- Member Types -------------------------------------- */

// Type สมาชิก (ผู้ใช้ของระบบ Admin)
export interface Member {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  role: string;
  status: string;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
}

// Type body ของ POST/PATCH /members ส่งเฉพาะ field ที่ต้องการ
export interface MemberBody {
  username?: string;
  password?: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string;
  status?: string;
  permissions?: Permission[];
}

// Type query ของ GET /members
export interface MemberListQuery {
  keyword?: string;
  status?: string;
  role?: string;
}

// Type meta ของรายการสมาชิกและตัวเลขการ์ดสถิติ
export interface MemberListMeta {
  total: number; // หลังกรองด้วย keyword/status/role
  totalMembers: number; // สถิติไม่สนใจตัวกรอง
  activeMembers: number;
  totalAdmins: number; // จำนวน super_admin
}

// Type response ของ GET /members
export interface MemberListResponse {
  data: Member[];
  meta: MemberListMeta;
}

// Type response ของ DELETE /members/:id
export interface MemberDeleteResponse {
  message: string;
}
