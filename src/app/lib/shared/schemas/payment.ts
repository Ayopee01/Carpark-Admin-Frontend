// Import Library
import { z } from "zod";

// schema ของช่องกรอกเงินในหน้ารับชำระ ตรวจแค่รูปแบบตัวเลข กติกายอดเงิน (เกินยอดค้าง ฯลฯ) backend ตรวจ

// Config ข้อความเมื่อกรอกจำนวนเงินผิดรูปแบบ
const MONEY_INPUT_MESSAGE = "กรุณากรอกจำนวนเงินให้ถูกต้อง (ทศนิยมไม่เกิน 2 ตำแหน่ง)";

// Schema จำนวนเงินบาทจากช่องกรอก (ตัวเลขไม่ติดลบ ทศนิยมไม่เกิน 2 ตำแหน่ง) ได้ number
const moneyInputSchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, MONEY_INPUT_MESSAGE)
  .transform(Number);

// Config รหัสวิธีชำระ (ชุดตายตัวของ backend)
const PAYMENT_METHOD_IDS = ["cash", "qr", "promptpay", "card", "mobile_banking", "bank1", "wallet", "other"] as const;

// Schema ฟอร์มผูกวิธีชำระกับช่องทางบริการ (ไม่เลือกเลย = ช่องทางนี้รับชำระไม่ได้)
const channelMappingSchema = z.object({
  allowedMethods: z.array(z.enum(PAYMENT_METHOD_IDS)),
});

export { MONEY_INPUT_MESSAGE, moneyInputSchema, channelMappingSchema };
