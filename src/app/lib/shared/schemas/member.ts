// Import Library
import { z } from "zod";

// schema ของฟอร์มสมาชิก ตรวจขั้นพื้นฐานก่อนส่ง กฎจริงอยู่ที่ backend (error ของ backend ใส่เข้าช่องด้วย applyServerErrors)

// Config role ของสมาชิก
const MEMBER_ROLES = ["super_admin", "staff"] as const;

// Schema ฟอร์มเพิ่มสมาชิก (backend ใช้ email แทน username จึงต้องกรอก, ชื่อหรือนามสกุลอย่างน้อยหนึ่งช่อง)
const createMemberSchema = z
  .object({
    firstName: z.string().trim(),
    lastName: z.string().trim(),
    email: z.string().trim().min(1, "กรุณากรอกอีเมล").pipe(z.email("รูปแบบอีเมลไม่ถูกต้อง")),
    password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
    phone: z.string().trim(),
    role: z.enum(MEMBER_ROLES, "กรุณาเลือกตำแหน่ง"),
  })
  .refine((values) => values.firstName || values.lastName, { message: "กรุณากรอกชื่อหรือนามสกุล", path: ["firstName"] });

// Schema แถวแก้ไขสมาชิกในตาราง
const editMemberSchema = z
  .object({
    firstName: z.string().trim(),
    lastName: z.string().trim(),
    email: z.string().trim().pipe(z.union([z.literal(""), z.email("รูปแบบอีเมลไม่ถูกต้อง")])),
    phone: z.string().trim(),
    role: z.enum(MEMBER_ROLES, "กรุณาเลือกตำแหน่ง"),
  })
  .refine((values) => values.firstName || values.lastName, { message: "กรุณากรอกชื่อหรือนามสกุล", path: ["firstName"] });

// Schema ฟอร์มตั้งค่าสิทธิ์ (สิทธิ์ที่ให้ไม่ได้ backend ตอบ PERMISSION_NOT_GRANTABLE)
const permissionFormSchema = z.object({
  permissions: z.array(z.string()),
});

export { createMemberSchema, editMemberSchema, permissionFormSchema };
