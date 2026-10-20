// Import Library
import type { ComponentType } from "react";
// Import Types
import type { Permission } from "@/src/app/type/api/auth";

/* -------------------------------------- Navigation Types -------------------------------------- */

// Type เมนูหนึ่งรายการใน Sidebar
export type SidebarMenuItem = {
  label: string;
  href: string;
  icon: ComponentType<{ size?: number }>;
  permissions: Permission[];
  badge?: "pendingRefunds"; // แสดงตัวเลขจากแหล่งนี้
};

// Type สิทธิ์ที่ต้องมีของแต่ละหน้าใน /landing
export type RoutePermission = { prefix: string; permissions: Permission[] };

// Type key ของแท็บในหน้า device
export type SettingMenuKey = "device" | "pricing" | "channels" | "theme";

// Type แท็บหนึ่งแท็บในหน้า device
export type SettingMenuItem = { key: SettingMenuKey; label: string; permission: Permission };

// Type key ของแท็บในหน้า system
export type SystemMenuKey = "device" | "entry_bill" | "paid_bill";

// Type แท็บหนึ่งแท็บในหน้า system
export type SystemMenuItem = { key: SystemMenuKey; label: string };

/* -------------------------------------- Component Types -------------------------------------- */

// Type props ของหน้าไม่มีสิทธิ์ (permission ที่หน้านี้ยอมรับ อย่างน้อยหนึ่งตัว)
export type ForbiddenStateProps = {
  requiredPermissions?: Permission[];
};

// Type props ของ Sidebar
export type SidebarProps = {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};
