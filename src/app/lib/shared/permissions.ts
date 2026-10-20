// Import Types
import type { AuthUser, Permission } from "@/src/app/type/api/auth";
import type { RoutePermission } from "@/src/app/type/ui/navigation";

// ไฟล์นี้ใช้ได้ทั้ง Server Component (ตรวจสิทธิ์ของหน้า) และ browser (ซ่อนเมนู/ปุ่ม) backend ตรวจสิทธิ์จริงอีกชั้น

/* -------------------------------------- Config -------------------------------------- */

// Config permission ที่ต้องมีของแต่ละหน้า (มีอย่างน้อยหนึ่งตัว)
const ROUTE_PERMISSIONS: RoutePermission[] = [
  { prefix: "/landing/dashboard", permissions: ["dashboard"] },
  { prefix: "/landing/check-payment", permissions: ["transactions"] },
  { prefix: "/landing/summary", permissions: ["overview"] },
  { prefix: "/landing/member", permissions: ["settings"] },
  { prefix: "/landing/device", permissions: ["devices", "pricing", "theme"] },
  { prefix: "/landing/system", permissions: ["settings"] },
];

/* -------------------------------------- Functions -------------------------------------- */

// Function ตรวจว่าผู้ใช้มี permission นี้ (ไม่ระบุ permission = ผ่าน)
function hasPermission(user: Pick<AuthUser, "permissions"> | null | undefined, permission?: Permission): boolean {
  if (!permission) return true;
  if (!user) return false;
  return Array.isArray(user.permissions) && user.permissions.includes(permission);
}

// Function ตรวจว่าผู้ใช้มี permission อย่างน้อยหนึ่งตัวในรายการ
function hasAnyPermission(user: Pick<AuthUser, "permissions"> | null | undefined, permissions: Permission[]): boolean {
  if (!user || !Array.isArray(user.permissions)) return false;
  return permissions.some((permission) => user.permissions.includes(permission));
}

// Function ดึง permission ที่หน้านี้ต้องมี (ไม่อยู่ในรายการ = ไม่ต้องมีสิทธิ์)
function getRoutePermissions(pathname: string): Permission[] | null {
  return ROUTE_PERMISSIONS.find((item) => pathname.startsWith(item.prefix))?.permissions ?? null;
}

export { ROUTE_PERMISSIONS, hasPermission, hasAnyPermission, getRoutePermissions };
