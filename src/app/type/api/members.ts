// Import Types
import type { Permission } from "./auth";

/* -------------------------------------- Member Types -------------------------------------- */

// Type role ของสมาชิก (backend ใช้แค่ 2 ค่านี้)
export type MemberRole = "super_admin" | "staff";

// Type สถานะสมาชิก (ไม่ใช่ active = login ไม่ได้)
export type MemberStatus = "active" | "inactive";

// Type สมาชิก (ผู้ใช้ของระบบ Admin)
export interface Member {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  role: MemberRole;
  status: MemberStatus;
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
  role?: MemberRole; // POST ไม่ส่ง = staff
  status?: MemberStatus;
  permissions?: Permission[];
}

// Type query ของ GET /members
export interface MemberListQuery {
  keyword?: string;
  status?: MemberStatus;
  role?: MemberRole;
}

// Type meta ของรายการสมาชิกและตัวเลขการ์ดสถิติ
export interface MemberListMeta {
  total: number; // หลังกรองด้วย keyword/status/role
  totalMembers: number; // สถิติไม่สนใจตัวกรอง
  activeMembers: number;
  totalAdmins: number; // จำนวน super_admin ทั้ง active/inactive ไม่สนตัวกรอง
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
