"use server";
// Import Data
import * as membersData from "@/src/app/lib/data/members";
// Import Server
import { runAction } from "@/src/app/lib/server/action";
// Import Types
import type { ActionResult } from "@/src/app/type/api/common";
import type { Permission } from "@/src/app/type/api/auth";
import type { Member, MemberBody, MemberDeleteResponse } from "@/src/app/type/api/members";

// Server Action เพิ่มสมาชิก
async function createMember(body: MemberBody): Promise<ActionResult<Member>> {
  return runAction(() => membersData.createMember(body));
}

// Server Action แก้ไขสมาชิก
async function updateMember(id: string, body: MemberBody): Promise<ActionResult<Member>> {
  return runAction(() => membersData.updateMember(id, body));
}

// Server Action แก้ไขเฉพาะ permission ของสมาชิก
async function updateMemberPermissions(id: string, permissions: Permission[]): Promise<ActionResult<Member>> {
  return runAction(() => membersData.updateMemberPermissions(id, permissions));
}

// Server Action ลบสมาชิก
async function deleteMember(id: string): Promise<ActionResult<MemberDeleteResponse>> {
  return runAction(() => membersData.deleteMember(id));
}

export { createMember, updateMember, updateMemberPermissions, deleteMember };
