// Import Types
import type { MemberRole } from "@/src/app/type/api/members";

/* -------------------------------------- Config -------------------------------------- */

// Config role ของสมาชิกและชื่อที่แสดง (backend ใช้แค่ 2 ค่านี้ เรียงจากสิทธิ์มากไปน้อย)
const ROLE_OPTIONS: { value: MemberRole; label: string }[] = [
  { value: "super_admin", label: "ผู้ดูแลระบบ" },
  { value: "staff", label: "แคชเชียร์" },
];

/* -------------------------------------- Functions -------------------------------------- */

// Function ดึงชื่อที่แสดงของ role
function formatRole(role: MemberRole): string {
  return ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}

// Function ดึงลำดับของ role สำหรับเรียงรายการ (super_admin อยู่บน)
function getRoleRank(role: MemberRole): number {
  return ROLE_OPTIONS.length - ROLE_OPTIONS.findIndex((option) => option.value === role);
}

export { ROLE_OPTIONS, formatRole, getRoleRank };
