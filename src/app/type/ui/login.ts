/* -------------------------------------- Login Types -------------------------------------- */

// Type เหตุผลที่ session จบ ส่งไปหน้า login เป็น ?reason=
export type SessionEndReason =
  | "logout"
  | "session_expired"
  | "refresh_token_reused"
  | "account_disabled";

// Type เวลาหมดอายุของ session ที่เก็บใน cookie cp_session (ไม่มี token)
export type SessionMeta = {
  version: number; // เปลี่ยนทุกครั้งที่ login/refresh ใช้บอกว่า 401 เกิดกับ cookie ชุดไหน
  accessExpiresAt: number;
  refreshExpiresAt: number | null;
  sessionExpiresAt: number | null;
  remember: boolean; // จดจำฉัน: cookie อยู่ต่อหลังปิด browser จนถึง refreshExpiresAt
};

// Type ข้อความที่ส่งข้ามแท็บผ่าน BroadcastChannel
export type AuthMessage =
  | { type: "session_updated" }
  | { type: "logged_out"; reason: SessionEndReason };
