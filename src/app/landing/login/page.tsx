// Import Library
import type { JSX } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
// Import Components
import { LoginForm } from "./LoginForm";
// Import Server
import { getCurrentUser } from "@/src/app/lib/server/auth";
import { readSession } from "@/src/app/lib/server/session";
// Import Types
import type { SessionEndReason } from "@/src/app/type/ui/login";

/* -------------------------------------- Config -------------------------------------- */

// Config หน้าที่ไปหลัง login เมื่อไม่มี redirect
const DEFAULT_AFTER_LOGIN = "/landing/dashboard";

// Config เหตุผลที่ session จบที่หน้า login รู้จัก
const SESSION_END_REASONS: SessionEndReason[] = ["logout", "session_expired", "refresh_token_reused", "account_disabled"];

/* -------------------------------------- Helpers -------------------------------------- */

// Function ใช้ redirect เฉพาะ path ภายใน /landing (กัน open redirect)
function getSafeRedirect(value: string | undefined): string {
  if (!value || !value.startsWith("/landing/") || value.startsWith("/landing/login")) return DEFAULT_AFTER_LOGIN;
  return value;
}

// Function แปลง ?reason= เป็นเหตุผลที่รู้จัก (ค่าอื่น = null)
function toSessionEndReason(value: string | undefined): SessionEndReason | null {
  return SESSION_END_REASONS.find((reason) => reason === value) ?? null;
}

// Function ตรวจว่ายัง login อยู่จริง (backend ตอบ /auth/me ได้)
async function isLoggedIn(): Promise<boolean> {
  if (!readSession(await cookies()).accessToken) return false;
  try {
    await getCurrentUser();
    return true;
  } catch {
    return false;
  }
}

/* -------------------------------------- Page -------------------------------------- */

// Function หน้าเข้าสู่ระบบ ผู้ใช้ที่ login อยู่แล้ว (และไม่ได้ถูกส่งมาเพราะ session จบ) ไปหน้าถัดไปเลย
async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<JSX.Element> {
  const params = await searchParams;
  const reason = toSessionEndReason(typeof params.reason === "string" ? params.reason : undefined);
  const redirectTo = getSafeRedirect(typeof params.redirect === "string" ? params.redirect : undefined);

  if (!reason && (await isLoggedIn())) redirect(redirectTo);

  return <LoginForm reason={reason} redirectTo={redirectTo} />;
}

export default LoginPage;
