import "server-only";
// Import Library
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
// Import Data
import { getMe } from "@/src/app/lib/data/auth";
// Import Types
import type { AuthUser } from "@/src/app/type/api/auth";
// Import Shared
import { ApiError } from "@/src/app/lib/shared/http";
import { getRoutePermissions, hasAnyPermission } from "@/src/app/lib/shared/permissions";

/* -------------------------------------- Config -------------------------------------- */

// Config path ของหน้า login
const LOGIN_PATH = "/landing/login";

// Config header ที่ proxy.ts ใส่ path ปัจจุบันไว้ (Server Component ไม่รู้ path ของ request เอง)
const CURRENT_PATH_HEADER = "x-current-path";

/* -------------------------------------- Functions -------------------------------------- */

// Function ดึงผู้ใช้ที่ login อยู่จาก /auth/me ครั้งเดียวต่อ request (layout และ page ใช้ร่วมกัน)
const getCurrentUser = cache(async (): Promise<AuthUser> => (await getMe()).user);

// Function ดึง path ของ request ปัจจุบันที่ proxy.ts ส่งมา
async function getCurrentPath(): Promise<string> {
  return (await headers()).get(CURRENT_PATH_HEADER) ?? "";
}

// Function ดึงผู้ใช้ ถ้า session ใช้ไม่ได้แล้ว (401) ไปหน้า login แล้วกลับมาหน้าเดิมหลัง login
async function requireUser(): Promise<AuthUser> {
  try {
    return await getCurrentUser();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      const params = new URLSearchParams({ reason: "session_expired" });
      const path = await getCurrentPath();
      if (path) params.set("redirect", path);
      redirect(`${LOGIN_PATH}?${params}`);
    }
    throw error;
  }
}

// Function ตรวจสิทธิ์ของหน้าตาม ROUTE_PERMISSIONS คืน permission ที่ขาด (null = เข้าได้)
async function checkPageAccess(pathname: string): Promise<{ user: AuthUser; missing: AuthUser["permissions"] | null }> {
  const user = await requireUser();
  const required = getRoutePermissions(pathname);
  return { user, missing: required && !hasAnyPermission(user, required) ? required : null };
}

export { LOGIN_PATH, CURRENT_PATH_HEADER, getCurrentUser, getCurrentPath, requireUser, checkPageAccess };
