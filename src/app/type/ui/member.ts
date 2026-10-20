// Import Library
import type { ReactNode } from "react";
import type { z } from "zod";
// Import Types
import type { MemberListMeta } from "@/src/app/type/api/members";
import type { createMemberSchema, editMemberSchema } from "@/src/app/lib/shared/schemas/member";

/* -------------------------------------- Member Types -------------------------------------- */

// Type ตัวเลขการ์ดสถิติ จาก meta ของ GET /members
export type MemberStats = Pick<MemberListMeta, "totalMembers" | "activeMembers" | "totalAdmins">;

// Type ค่าในฟอร์มเพิ่มสมาชิก (จาก schema)
export type CreateMemberForm = z.infer<typeof createMemberSchema>;

// Type ค่าในแถวแก้ไขสมาชิก (จาก schema)
export type EditMemberForm = z.infer<typeof editMemberSchema>;

// Type checkbox สิทธิ์หนึ่งช่องใน dialog สิทธิ์
export type PermissionItem = {
  key: string;
  label: string;
  icon: ReactNode;
};

/* -------------------------------------- Component Types -------------------------------------- */

// Type props ของ dialog เพิ่มสมาชิก (onSubmit throw เมื่อบันทึกไม่สำเร็จ dialog แสดง error เอง)
export type AddMemberModalProps = {
    open: boolean;
    onClose: () => void;
    onSubmit: (values: CreateMemberForm) => Promise<void>;
};

// Type props ของ dialog แก้สิทธิ์
export type PermissionModalProps = {
    open: boolean;
    permissions: PermissionItem[];
    defaultPermissions: string[]; // สิทธิ์ที่สมาชิกมีอยู่ตอนเปิด
    // permission ที่ผู้ใช้ปัจจุบันให้ได้ (backend ตอบ PERMISSION_NOT_GRANTABLE)
    isGrantable?: (key: string) => boolean;
    onClose: () => void;
    onSubmit: (permissions: string[]) => Promise<void>; // throw = ไม่ปิด dialog
};

// Type ค่าในฟอร์มตั้งค่าสิทธิ์
export type PermissionForm = {
    permissions: string[];
};
