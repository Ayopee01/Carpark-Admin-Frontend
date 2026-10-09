// Import Types
import type { Permission } from "@/src/app/type/api/auth";
import type { Member, MemberBody, MemberDeleteResponse, MemberListQuery, MemberListResponse } from "@/src/app/type/api/members";
// Import Shared
import { apiRequest, seg } from "@/src/app/lib/shared/http";

// Function ดึงรายการสมาชิกพร้อม meta ของการ์ดสถิติ (GET /api/members)
function getMembers(query: MemberListQuery = {}): Promise<MemberListResponse> {
  return apiRequest<MemberListResponse>("/members", { query: { ...query }, errorMessage: "โหลดรายการสมาชิกไม่สำเร็จ" });
}

// Function เพิ่มสมาชิก (POST /api/members)
function createMember(body: MemberBody): Promise<Member> {
  return apiRequest<Member>("/members", { method: "POST", body, errorMessage: "เพิ่มสมาชิกไม่สำเร็จ" });
}

// Function แก้ไขสมาชิก (PATCH /api/members/:id)
function updateMember(id: string, body: MemberBody): Promise<Member> {
  return apiRequest<Member>(`/members/${seg(id)}`, { method: "PATCH", body, errorMessage: "แก้ไขสมาชิกไม่สำเร็จ" });
}

// Function แก้ไขเฉพาะ permission ของสมาชิก (PATCH /api/members/:id)
function updateMemberPermissions(id: string, permissions: Permission[]): Promise<Member> {
  return updateMember(id, { permissions });
}

// Function ลบสมาชิก (DELETE /api/members/:id)
function deleteMember(id: string): Promise<MemberDeleteResponse> {
  return apiRequest<MemberDeleteResponse>(`/members/${seg(id)}`, { method: "DELETE", errorMessage: "ลบสมาชิกไม่สำเร็จ" });
}

export { getMembers, createMember, updateMember, updateMemberPermissions, deleteMember };
