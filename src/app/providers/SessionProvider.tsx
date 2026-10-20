"use client";
// Import Library
import { createContext, useContext, useEffect, type ReactNode, type JSX } from "react";
// Import Client
import { startSessionKeeper } from "@/src/app/lib/client/session";
// Import Types
import type { AuthUser } from "@/src/app/type/api/auth";

/* -------------------------------------- Config -------------------------------------- */

// Config context ของผู้ใช้ที่ login อยู่ (layout โหลดจาก /auth/me ฝั่ง server)
const SessionContext = createContext<AuthUser | null>(null);

/* -------------------------------------- Functions -------------------------------------- */

// Function hook ดึงผู้ใช้ที่ login อยู่ (เปลี่ยนเมื่อ layout render ใหม่ด้วย router.refresh())
function useCurrentUser(): AuthUser | null {
  return useContext(SessionContext);
}

// Function ส่งผู้ใช้จาก server ให้ component ลูก และเริ่ม keepalive ของ session ในแท็บนี้
function SessionProvider({ user, children }: { user: AuthUser; children: ReactNode }): JSX.Element {
  useEffect(() => {
    startSessionKeeper();
  }, []);

  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>;
}

export { SessionProvider, useCurrentUser };
