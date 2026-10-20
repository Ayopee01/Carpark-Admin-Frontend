import "server-only";
// Import Library
import type { JSX } from "react";
import { redirect } from "next/navigation";
// Import Components
import { ForbiddenState } from "@/src/app/components/layout/ForbiddenState";
// Import Server
import { LOGIN_PATH, checkPageAccess, getCurrentPath } from "./auth";
// Import Shared
import { ApiError, ForbiddenError } from "@/src/app/lib/shared/http";
import { getRoutePermissions } from "@/src/app/lib/shared/permissions";

// Function render หน้าหลังบ้านฝั่ง server: ตรวจสิทธิ์ของหน้า แล้วโหลดข้อมูลแรกใน render
// 401 = session จบระหว่างโหลด ไปหน้า login, 403 = ไม่มีสิทธิ์ แสดงหน้าไม่มีสิทธิ์, error อื่นให้ error.tsx แสดง
async function renderPage(pathname: string, render: () => Promise<JSX.Element> | JSX.Element): Promise<JSX.Element> {
  const { missing } = await checkPageAccess(pathname);
  if (missing) return <ForbiddenState requiredPermissions={missing} />;

  try {
    return await render();
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return <ForbiddenState requiredPermissions={getRoutePermissions(pathname) ?? undefined} />;
    }
    if (error instanceof ApiError && error.status === 401) {
      const params = new URLSearchParams({ reason: "session_expired", redirect: (await getCurrentPath()) || pathname });
      redirect(`${LOGIN_PATH}?${params}`);
    }
    throw error;
  }
}

export { renderPage };
