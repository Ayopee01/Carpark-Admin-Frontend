"use client";
// Import Library
import { useEffect, type ReactNode, type JSX } from "react";
// Import Auth
import { installFetchInterceptor } from "@/src/app/lib/auth/fetchInterceptor";
import { startAuthSession } from "@/src/app/lib/auth/session";

// ติดตั้งตอนโหลด module ก่อน component ลูกยิง request แรก
installFetchInterceptor();

// Function เริ่มระบบ session ของแท็บ (timer refresh และ sync ข้ามแท็บ)
function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  useEffect(() => {
    startAuthSession();
  }, []);

  return <>{children}</>;
}

export { AuthProvider };
