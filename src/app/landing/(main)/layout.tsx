// Import Library
import type { ReactNode, JSX } from "react";
// Import Components
import { MainShell } from "@/src/app/components/layout/MainShell";
// Import Providers
import { QueryProvider } from "@/src/app/providers/QueryProvider";
import { SessionProvider } from "@/src/app/providers/SessionProvider";
// Import Server
import { requireUser } from "@/src/app/lib/server/auth";

// Function layout ของหน้าหลังบ้าน โหลดผู้ใช้จาก /auth/me ฝั่ง server (session ใช้ไม่ได้ = ไปหน้า login) แล้วส่งให้ component ลูก
async function MainLayout({ children }: { children: ReactNode }): Promise<JSX.Element> {
  const user = await requireUser();

  return (
    <SessionProvider user={user}>
      <QueryProvider>
        <MainShell>{children}</MainShell>
      </QueryProvider>
    </SessionProvider>
  );
}

export default MainLayout;
