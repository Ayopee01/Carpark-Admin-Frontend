/* -------------------------------------- Login Types -------------------------------------- */

// Type เหตุผลที่ session จบ ส่งไปหน้า login เป็น ?reason=
export type SessionEndReason =
  | "logout"
  | "session_expired"
  | "refresh_token_reused"
  | "account_disabled";

// Type เวลาหมดอายุของ session ใน cookie cp_session ที่ browser อ่านได้ (token อยู่ใน httpOnly cookie แยก)
export type SessionMeta = {
  accessExpiresAt: number;
  refreshExpiresAt: number | null;
  sessionExpiresAt: number | null;
  remember: boolean; // จดจำฉัน: cookie อยู่ต่อหลังปิด browser จนถึง refreshExpiresAt
};

// Type ข้อความที่ส่งข้ามแท็บผ่าน BroadcastChannel
export type AuthMessage = { type: "logged_out"; reason: SessionEndReason };
