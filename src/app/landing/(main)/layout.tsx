"use client";
// Import Library
import { useEffect, useMemo, useState, type ReactNode, type JSX } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LuMenu } from "react-icons/lu";
// Import Components
import { Sidebar } from "@/src/app/components/layout/Sidebar";
import { ForbiddenState } from "@/src/app/components/layout/ForbiddenState";
import { SessionExpiryBanner } from "@/src/app/components/layout/SessionExpiryBanner";
import { RefundAlertStack } from "@/src/app/components/layout/RefundAlertStack";
// Import Providers
import { RefundAlertsProvider } from "@/src/app/providers/RefundAlertsProvider";
// Import Api
import { getMe } from "@/src/app/lib/api/auth";
// Import Auth
import { hasSession, setCurrentUser } from "@/src/app/lib/auth/session";
import { FORBIDDEN_EVENT } from "@/src/app/lib/auth/fetchInterceptor";
import { hasAnyPermission, useCurrentUser } from "@/src/app/lib/auth/permissions";
// Import Types
import type { RoutePermission } from "@/src/app/type/ui/navigation";
// Import Shared
import { ForbiddenError, getErrorMessage } from "@/src/app/lib/shared/http";

/* -------------------------------------- Config -------------------------------------- */

// Config permission ที่ต้องมีของแต่ละหน้า (มีอย่างน้อยหนึ่งตัว)
const ROUTE_PERMISSIONS: RoutePermission[] = [
    { prefix: "/landing/dashboard", permissions: ["dashboard"] },
    { prefix: "/landing/check-payment", permissions: ["transactions"] },
    { prefix: "/landing/refunds", permissions: ["transactions"] },
    { prefix: "/landing/edc-reconciliation", permissions: ["transactions"] },
    { prefix: "/landing/summary", permissions: ["overview"] },
    { prefix: "/landing/member", permissions: ["settings"] },
    { prefix: "/landing/device", permissions: ["devices", "pricing", "theme"] },
    { prefix: "/landing/system", permissions: ["settings"] },
];

/* -------------------------------------- Component -------------------------------------- */

// Function layout ของหน้าหลังบ้าน โหลดผู้ใช้ ตรวจสิทธิ์ของหน้า และแสดง Sidebar
function MainLayout({ children }: { children: ReactNode }): JSX.Element | null {
    const router = useRouter();
    const pathname = usePathname();
    const [ready, setReady] = useState(false);
    const user = useCurrentUser();
    // /auth/me ล้มเหลว (เน็ต/server) ไม่มีข้อมูลตรวจสิทธิ์
    const [loadError, setLoadError] = useState("");
    const [attempt, setAttempt] = useState(0);
    // backend ตอบ 403 FORBIDDEN ในหน้านี้ ชื่อ permission ใช้จาก ROUTE_PERMISSIONS
    const [forbiddenPath, setForbiddenPath] = useState<string | null>(null);
    const forbidden = forbiddenPath === pathname;
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function initializeAuth() {
            if (!hasSession()) {
                // กลับมาหน้านี้หลัง login
                const params = new URLSearchParams({ redirect: `${window.location.pathname}${window.location.search}` });
                router.replace(`/landing/login?${params}`);
                return;
            }

            try {
                setLoadError("");
                const response = await getMe();
                if (cancelled) return;
                setCurrentUser(response.user);
            } catch (error) {
                if (cancelled) return;
                // 401 ไปหน้า login โดย fetchInterceptor แล้ว
                if (error instanceof ForbiddenError) setForbiddenPath(window.location.pathname);
                else setLoadError(getErrorMessage(error, "โหลดข้อมูลผู้ใช้ไม่สำเร็จ"));
            } finally {
                if (!cancelled) setReady(true);
            }
        }

        void initializeAuth();
        return () => {
            cancelled = true;
        };
    }, [router, attempt]);

    useEffect(() => {
        function handleForbidden() {
            setForbiddenPath(window.location.pathname);
            // แอดมินคนอื่นอาจแก้สิทธิ์ ให้โหลดใหม่ให้เมนูและการตรวจตรงกับ backend
            void getMe()
                .then(({ user: latest }) => setCurrentUser(latest))
                .catch(() => undefined);
        }
        window.addEventListener(FORBIDDEN_EVENT, handleForbidden);
        return () => window.removeEventListener(FORBIDDEN_EVENT, handleForbidden);
    }, []);


    const routePermission = useMemo(
        () => ROUTE_PERMISSIONS.find((item) => pathname.startsWith(item.prefix)),
        [pathname]
    );

    const canAccess = !routePermission || hasAnyPermission(user, routePermission.permissions);

    if (!ready) {
        return null;
    }

    if (loadError && !user) {
        return (
            <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-[#EFEFEF] px-4 text-center">
                <p className="text-sm font-semibold text-slate-700">{loadError}</p>
                <button
                    type="button"
                    onClick={() => {
                        setReady(false);
                        setAttempt((value) => value + 1);
                    }}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white"
                >
                    ลองใหม่
                </button>
            </div>
        );
    }

    if (!canAccess || forbidden) {
        return <ForbiddenState requiredPermissions={routePermission?.permissions} />;
    }

    return (
        // เปิด stream คืนเงินเฉพาะผู้ใช้ที่มีสิทธิ์ transactions
        <RefundAlertsProvider enabled={hasAnyPermission(user, ["transactions"])}>
        <div className="flex h-dvh overflow-hidden bg-[#EFEFEF]">
            <Sidebar
                mobileOpen={mobileSidebarOpen}
                onMobileClose={() => setMobileSidebarOpen(false)}
            />
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
                <div className="min-w-0 flex-1 overflow-y-auto">{children}</div>
            </main>
        </div>
        </RefundAlertsProvider>
    );
}

export default MainLayout;
