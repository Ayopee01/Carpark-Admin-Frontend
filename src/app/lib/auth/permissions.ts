// Import Library
import { useSyncExternalStore } from "react";
// Import Auth
import { getCurrentUser, subscribeSession } from "./session";
// Import Types
import type { AuthUser, Permission } from "@/src/app/type/api/auth";

// Function ตรวจว่าผู้ใช้มี permission นี้ (ไม่ระบุ permission = ผ่าน)
function hasPermission(
    user: Pick<AuthUser, "permissions"> | null | undefined,
    permission?: Permission
): boolean {
    if (!permission) return true;
    if (!user) return false;

    return Array.isArray(user.permissions) && user.permissions.includes(permission);
}

// Function ตรวจว่าผู้ใช้มี permission อย่างน้อยหนึ่งตัวในรายการ
function hasAnyPermission(
    user: Pick<AuthUser, "permissions"> | null | undefined,
    permissions: Permission[]
): boolean {
    if (!user) return false;

    if (!Array.isArray(user.permissions)) return false;

    return permissions.some((permission) =>
        user.permissions?.includes(permission)
    );
}

// Function hook ดึงผู้ใช้ที่ login อยู่จาก memory (null จนกว่า /auth/me ตอบ)
function useCurrentUser(): AuthUser | null {
    return useSyncExternalStore(subscribeSession, getCurrentUser, () => null);
}

export { hasPermission, hasAnyPermission, useCurrentUser };
