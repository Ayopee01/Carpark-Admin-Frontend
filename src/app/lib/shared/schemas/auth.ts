// Import Library
import { z } from "zod";

// schema ของฟอร์มเข้าสู่ระบบ ตรวจแค่ว่ากรอกครบ (รหัสผ่านถูกหรือไม่ backend ตรวจ)

// Schema ฟอร์มเข้าสู่ระบบ
const loginSchema = z.object({
  username: z.string().trim().min(1, "กรุณากรอกชื่อผู้ใช้หรืออีเมล"),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
  rememberMe: z.boolean(),
});

export { loginSchema };
