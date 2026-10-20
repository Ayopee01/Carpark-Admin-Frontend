"use client";
// Import Library
import { useEffect, useState, type ReactNode, type JSX } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LuMenu } from "react-icons/lu";
// Import Components
import { Sidebar } from "@/src/app/components/layout/Sidebar";
import { ForbiddenState } from "@/src/app/components/layout/ForbiddenState";
import { SessionExpiryBanner } from "@/src/app/components/layout/SessionExpiryBanner";
import { RefundAlertStack } from "@/src/app/components/layout/RefundAlertStack";
import { RefundsDrawer } from "@/src/app/components/refunds/RefundsDrawer";
// Import Providers
import { AdminStreamProvider } from "@/src/app/providers/AdminStreamProvider";
import { useCurrentUser } from "@/src/app/providers/SessionProvider";
// Import Client
import { FORBIDDEN_EVENT } from "@/src/app/lib/client/http";
// Import Shared
import { getRoutePermissions, hasAnyPermission } from "@/src/app/lib/shared/permissions";

// Function โครงหน้าหลังบ้าน (Sidebar, แถบเตือน, แจ้งเตือนคืนเงิน, drawer รายการรอคืนเงิน) สิทธิ์ของหน้าตรวจใน Server Component ของแต่ละหน้าแล้ว
// ที่นี่จัดการเฉพาะ 403 FORBIDDEN ที่ได้ภายหลังจาก Route Handler/Server Action (แอดมินคนอื่นถอดสิทธิ์ระหว่างใช้งาน)
function MainShell({ children }: { children: ReactNode }): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const user = useCurrentUser();
  // backend ตอบ 403 FORBIDDEN ในหน้านี้ ชื่อ permission ใช้จาก ROUTE_PERMISSIONS
  const [forbiddenPath, setForbiddenPath] = useState<string | null>(null);
  const forbidden = forbiddenPath === pathname;
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    function handleForbidden() {
      setForbiddenPath(window.location.pathname);
      // โหลดผู้ใช้ใหม่ให้เมนูและการตรวจสิทธิ์ตรงกับ backend
      router.refresh();
    }
    window.addEventListener(FORBIDDEN_EVENT, handleForbidden);
    return () => window.removeEventListener(FORBIDDEN_EVENT, handleForbidden);
  }, [router]);

  return (
    // stream กลาง /dashboard/events เปิดเมื่อมีสิทธิ์ dashboard หรือ transactions (คืนเงินเฉพาะ transactions)
    <AdminStreamProvider
      canViewDashboard={hasAnyPermission(user, ["dashboard"])}
      canViewRefunds={hasAnyPermission(user, ["transactions"])}
    >
      <div className="flex h-dvh overflow-hidden bg-[#EFEFEF]">
        <Sidebar mobileOpen={mobileSidebarOpen} onMobileClose={() => setMobileSidebarOpen(false)} />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-900"
              aria-label="Open navigation"
            >
              <LuMenu className="h-5 w-5" />
            </button>
            <div className="text-sm font-extrabold text-slate-900">Smart Carpark</div>
            <div className="h-10 w-10" aria-hidden="true" />
          </header>
          <SessionExpiryBanner />
          <RefundAlertStack />
          <div className="min-w-0 flex-1 overflow-y-auto">
            {forbidden ? <ForbiddenState requiredPermissions={getRoutePermissions(pathname) ?? undefined} /> : children}
          </div>
        </main>
      </div>
      <RefundsDrawer />
    </AdminStreamProvider>
  );
}

export { MainShell };
