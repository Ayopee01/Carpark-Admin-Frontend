"use client";
// Import Library
import type { JSX } from "react";
import React, { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LuCreditCard, LuLayoutDashboard, LuSearch, LuUndo2, LuWalletCards, LuUsers, LuSlidersHorizontal, LuSettings2, LuChevronLeft, LuLogOut, LuX } from "react-icons/lu";
import { FiUser } from "react-icons/fi";
// Import Providers
import { useRefundAlerts } from "@/src/app/providers/RefundAlertsProvider";
// Import Auth
import { logout } from "@/src/app/lib/auth/session";
import { hasAnyPermission, useCurrentUser } from "@/src/app/lib/auth/permissions";
// Import Landing
import { REFUNDS_PATH } from "@/src/app/lib/landing/checkPayment";
// Import Types
import type { SidebarProps, SidebarMenuItem } from "@/src/app/type/ui/navigation";

/* -------------------------------------- Config -------------------------------------- */

// Config เมนูของ Sidebar และ permission ที่ต้องมี
const menuItems: SidebarMenuItem[] = [
  {
    label: "แดชบอร์ด",
    href: "/landing/dashboard",
    icon: LuLayoutDashboard,
    permissions: ["dashboard"],
  },
  {
    label: "ตรวจสอบ",
    href: "/landing/check-payment",
    icon: LuSearch,
    permissions: ["transactions"],
  },
  {
    label: "รายการรอคืนเงิน",
    href: REFUNDS_PATH,
    icon: LuUndo2,
    permissions: ["transactions"],
    badge: "pendingRefunds",
  },
  {
    label: "กระทบยอด EDC",
    href: "/landing/edc-reconciliation",
    icon: LuCreditCard,
    permissions: ["transactions"],
  },
  {
    label: "ยอดรวมทั้งหมด",
    href: "/landing/summary",
    icon: LuWalletCards,
    permissions: ["overview"],
  },
  {
    label: "การตั้งค่าสมาชิก",
    href: "/landing/member",
    icon: LuUsers,
    permissions: ["settings"],
  },
  {
    label: "ตั้งค่าอุปกรณ์",
    href: "/landing/device",
    icon: LuSlidersHorizontal,
    permissions: ["devices", "pricing", "theme"],
  },
  {
    label: "ตั้งค่าระบบ",
    href: "/landing/system",
    icon: LuSettings2,
    permissions: ["settings"],
  },
];

/* -------------------------------------- Component -------------------------------------- */

// Function แสดงเมนูตาม permission ของผู้ใช้ badge รอคืนเงิน และปุ่มออกจากระบบ
function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps): JSX.Element {
  const [collapsed, setCollapsed] = useState(false);
  // layout โหลดจาก /auth/me แล้ว
  const user = useCurrentUser();
  const [openLogoutPopup, setOpenLogoutPopup] = useState(false);

  const pathname = usePathname();

  const visibleMenuItems = useMemo(() => {
    return menuItems.filter((item) => hasAnyPermission(user, item.permissions));
  }, [user]);

  const { pendingCount: pendingRefundCount } = useRefundAlerts();

  const closeLogoutConfirm = () => {
    setOpenLogoutPopup(false);
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-40 bg-black/45 lg:hidden"
          onClick={onMobileClose}
        />
      ) : null}

      <nav className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-72 max-w-[86vw] flex-col bg-slate-900 text-white transition-[transform,width] duration-300 ease-in-out lg:relative lg:z-auto lg:h-screen lg:max-w-none lg:translate-x-0
      ${mobileOpen ? "translate-x-0" : "-translate-x-full"} ${collapsed ? "lg:w-24" : "lg:w-64"}`}
      >
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="absolute -right-6 top-10 z-20 hidden h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white text-slate-900 shadow-md lg:flex"
          aria-label={collapsed ? "ขยาย sidebar" : "ย่อ sidebar"}
        >
          <LuChevronLeft
            className={`h-6 w-6 transition-transform duration-300 ${collapsed ? "rotate-180" : "rotate-0"
              }`}
          />
        </button>

        <div className="flex flex-1 flex-col overflow-hidden p-5">
          <div className="mb-10 flex items-center gap-4">
            <div className="flex items-center justify-center h-10 w-10 shrink-0 rounded-lg bg-blue-300 text-slate-900">
              <p className="text-xl font-bold">P</p>
            </div>

            <div
              className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform] duration-300 ease-in-out ${collapsed
                ? "max-w-full translate-x-0 opacity-100 lg:max-w-0 lg:-translate-x-2 lg:opacity-0"
                : "max-w-full translate-x-0 opacity-100"
                }`}
            >
              <h1 className="text-lg font-extrabold leading-none tracking-normal align-middle">
                Smart Carpark
              </h1>
              <p className="mt-1 text-xs font-bold leading-4 tracking-widest uppercase align-middle">
                SUPPORT
              </p>
            </div>
          </div>

          <ul className="flex flex-col gap-3">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              const badgeCount =
                item.badge === "pendingRefunds" ? pendingRefundCount ?? 0 : 0;
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    onClick={onMobileClose}
                    className={`flex items-center rounded-lg px-4 py-4 text-sm transition-colors duration-200 ${isActive
                      ? "bg-white text-slate-900"
                      : "text-white hover:bg-white/10"
                      } ${collapsed ? "justify-start lg:justify-center" : "justify-start"}`}
                  >
                    <div className="relative text-2xl flex shrink-0 items-center justify-center">
                      <Icon />
                      {badgeCount > 0 ? (
                        <span
                          className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold leading-none text-white"
                          aria-label={`รอคืนเงิน ${badgeCount} รายการ`}
                        >
                          {badgeCount > 99 ? "99+" : badgeCount}
                        </span>
                      ) : null}
                    </div>

                    <span
                      className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin,transform] duration-300 ease-in-out ${collapsed
                        ? "ml-3 max-w-full translate-x-0 opacity-100 lg:ml-0 lg:max-w-0 lg:-translate-x-2 lg:opacity-0"
                        : "ml-3 max-w-full translate-x-0 opacity-100"
                        }`}
                    >
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-auto">
            <div
              className={`p-4 flex items-center ${collapsed ? "justify-start lg:justify-center" : "justify-start"
                }`}
            >
              <div className="text-2xl">
                <FiUser />
              </div>

              <div className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin,transform] duration-300 ease-in-out ${collapsed
                ? "ml-3 max-w-full translate-x-0 opacity-100 lg:ml-0 lg:max-w-0 lg:-translate-x-2 lg:opacity-0"
                : "ml-3 max-w-full translate-x-0 opacity-100"
                }`}
              >
                <p className="text-xs font-semibold leading-5 text-white">
                  {user?.name ?? "-"}
                </p>
                <p className="text-xs leading-5 text-white/80">
                  {user?.role ?? "-"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpenLogoutPopup(true)}
              className={`cursor-pointer flex w-full items-center rounded-2xl p-4 text-sm text-white transition-colors duration-200 hover:bg-white/10 ${collapsed ? "justify-start lg:justify-center" : "justify-start"
                }`}
            >
              <div className="text-xl flex shrink-0 items-center justify-center">
                <LuLogOut />
              </div>

              <span
                className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin,transform] duration-300 ease-in-out ${collapsed
                  ? "ml-3 max-w-full translate-x-0 opacity-100 lg:ml-0 lg:max-w-0 lg:-translate-x-2 lg:opacity-0"
                  : "ml-3 max-w-full translate-x-0 opacity-100"
                  }`}
              >
                ออกจากระบบ
              </span>
            </button>
            <div className="flex flex-col text-start border-t border-white/10 pt-5">
              <p className="text-xs font-bold leading-4 tracking-normal align-middle text-zinc-400">ระบบลานจอดรถ Smart Carpark</p>
              <p className="text-xs font-bold leading-4 tracking-normal align-middle text-zinc-400">v1.0.0</p>
            </div>
          </div>
        </div>
      </nav>

      {openLogoutPopup ? (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-xs"
          onClick={closeLogoutConfirm}
        >
          <div
            className="max-h-[calc(100dvh-48px)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-800/15 px-6 py-5 bg-slate-900/10">
              <div>
                <h2 className="text-2xl font-bold leading-8 tracking-normal align-middle">
                  ยืนยันการออกจากระบบ
                </h2>
                <p className="mt-1 text-sm font-normal leading-5 tracking-normal align-middle text-slate-900">ยืนยันการออกจากระบบ</p>
              </div>

              <button
                type="button"
                onClick={closeLogoutConfirm}
                className="cursor-pointer text-slate-900 transition hover:opacity-70"
                aria-label="ปิด"
              >
                <LuX className="h-6 w-6" />
              </button>
            </div>

            <div className="px-6 py-6">
              <div className="mx-auto flex h-60 w-full max-w-80 flex-col items-center justify-center rounded-lg bg-slate-100 p-8 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-900 shadow-sm">
                  <LuUsers className="h-7 w-7" />
                </div>

                <p className="text-xl font-bold leading-7 tracking-normal text-center align-middle">
                  {user?.name ?? "-"}
                </p>
                <p className="mt-2 text-sm font-normal leading-5 tracking-normal text-center align-middle">
                  ตำแหน่ง {user?.role ?? "-"}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-800/15 bg-slate-900/10">
              <div className="py-6 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={closeLogoutConfirm}
                  className="cursor-pointer text-sm font-semibold leading-5 tracking-normal text-center align-middle rounded-full bg-slate-900/50 px-6 py-3 text-base font-semibold text-white transition hover:opacity-90"
                >
                  ยกเลิก
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="cursor-pointer text-sm font-semibold leading-5 tracking-normal text-center align-middle rounded-full bg-slate-900 px-6 py-3 text-base font-semibold text-white transition hover:opacity-90"
                >
                  ตกลง
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export { Sidebar };
