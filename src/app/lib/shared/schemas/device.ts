// Import Library
import { z } from "zod";

// schema ของฟอร์มอุปกรณ์ ตรวจขั้นพื้นฐานก่อนส่ง กฎจริงอยู่ที่ backend (error ของ backend ใส่เข้าช่องด้วย applyServerErrors)

// Schema ฟอร์มลงทะเบียน/แก้ไขเครื่อง EDC
const edcDeviceSchema = z.object({
  deviceName: z.string().trim().min(1, "กรุณากรอกชื่อเครื่อง"),
  terminalId: z.string().trim().min(1, "กรุณากรอก Terminal ID").max(50, "Terminal ID ยาวได้ไม่เกิน 50 ตัวอักษร"),
  merchantId: z.string().trim().nullish(),
  provider: z.string().trim().nullish(),
  serialNo: z.string().trim().nullish(),
  location: z.string().trim().nullish(),
  usage: z.enum(["cashier", "device"], "กรุณาเลือกการใช้งาน"),
  status: z.enum(["active", "maintenance", "inactive"]).optional(),
  note: z.string().nullish(),
});

// Schema ฟอร์ม kiosk / barrier gate ตรวจเฉพาะชื่อและประเภท field อื่นส่งผ่านไปตามเดิม (looseObject ไม่ตัดทิ้ง)
const deviceSchema = z.looseObject({
  deviceName: z.string().trim().min(1, "กรุณากรอกชื่ออุปกรณ์"),
  deviceType: z.string().min(1, "กรุณาเลือกประเภทอุปกรณ์"),
});

// Config รูปแบบสี HEX 6 หลักที่ backend รับ
const HEX_COLOR_PATTERN = /^#[0-9A-F]{6}$/i;

// Schema ฟอร์มเลือกธีม (สี Custom ต้องเป็น HEX เมื่อเลือกธีม Custom)
const themeFormSchema = z
  .object({
    themeMode: z.enum(["theme1", "theme2", "theme3", "custom"]),
    customColor: z.string(),
  })
  .refine((values) => values.themeMode !== "custom" || HEX_COLOR_PATTERN.test(values.customColor), {
    message: "กรุณาระบุค่าสี Custom ให้ถูกต้อง เช่น #FFD54F",
    path: ["customColor"],
  });

export { HEX_COLOR_PATTERN, edcDeviceSchema, deviceSchema, themeFormSchema };
