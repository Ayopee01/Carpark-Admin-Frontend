// Import Library
import type { SetStateAction, Dispatch, ReactNode } from "react";
// Import Types
import type { FieldErrors } from "@/src/app/type/api/common";
import type { Permission } from "@/src/app/type/api/auth";
import type { MemberListMeta, MemberRole, MemberStatus } from "@/src/app/type/api/members";

/* -------------------------------------- Member Types -------------------------------------- */

// Type ตัวเลขการ์ดสถิติ จาก meta ของ GET /members
export type MemberStats = Pick<MemberListMeta, "totalMembers" | "activeMembers" | "totalAdmins">;

// Type ค่าในฟอร์มเพิ่มสมาชิก
export type CreateMemberPayload = {
  username?: string;
  password: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: MemberRole;
  status?: MemberStatus;
  permissions: Permission[];
};

// Type checkbox สิทธิ์หนึ่งช่องใน dialog สิทธิ์
export type PermissionItem = {
  key: string;
  label: string;
  icon: ReactNode;
};

/* -------------------------------------- Component Types -------------------------------------- */

// Type props ของ dialog เพิ่มสมาชิก
export type AddMemberModalProps = {
    open: boolean;
    form: CreateMemberPayload;
    // เฉพาะ super_admin สร้างบัญชี super_admin ได้
    error?: string;
    fieldErrors?: FieldErrors;
    submitting: boolean;
    onClose: () => void;
    onChange: Dispatch<SetStateAction<CreateMemberPayload>>;
    onSubmit: () => void;
};

// Type props ของ dialog แก้สิทธิ์
export type PermissionModalProps = {
    open: boolean;
    permissions: PermissionItem[];
    selectedPermissions: string[];
    // permission ที่ผู้ใช้ปัจจุบันให้ได้ (backend ตอบ PERMISSION_NOT_GRANTABLE)
    isGrantable?: (key: string) => boolean;
    submitting: boolean;
    onClose: () => void;
    onToggle: (key: string) => void;
    onSubmit: () => void;
};
