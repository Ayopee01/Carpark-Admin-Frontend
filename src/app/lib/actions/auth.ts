"use server";
// Import Library
import { cookies } from "next/headers";
// Import Data
import * as authData from "@/src/app/lib/data/auth";
// Import Server
import { runPublicAction } from "@/src/app/lib/server/action";
import { clearSession, readSession, writeSession } from "@/src/app/lib/server/session";
// Import Types
import type { ActionResult } from "@/src/app/type/api/common";
import type { AuthUser, LoginRequest } from "@/src/app/type/api/auth";

// Server Action เข้าสู่ระบบ: เก็บ access/refresh token เป็น httpOnly cookie ของโดเมน Admin browser ไม่เห็น token
async function login(body: LoginRequest): Promise<ActionResult<{ user: AuthUser }>> {
  return runPublicAction(async () => {
    const session = await authData.login(body);
    writeSession(await cookies(), session, body.rememberMe === true);
    return { user: session.user };
  });
}

// Server Action ออกจากระบบ: ให้ backend revoke session (ไม่สนผล) แล้วลบ cookie เสมอ
async function logout(): Promise<ActionResult<null>> {
  return runPublicAction(async () => {
    const store = await cookies();
    const { accessToken, refreshToken } = readSession(store);
    if (accessToken || refreshToken) {
      await authData.logout({ accessToken, refreshToken }).catch(() => undefined);
    }
    clearSession(store);
    return null;
  });
}

export { login, logout };
