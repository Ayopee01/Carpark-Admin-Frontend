// Import Library
import { z } from "zod";

// schema ของฟอร์มตั้งค่าระบบและใบเสร็จ ตรวจขั้นพื้นฐานก่อนส่ง กฎจริงอยู่ที่ backend

// Config ช่วงนาทีหมดอายุหลังจ่ายที่ backend รับ
const EXPIRY_DURATION_MIN = 1;
const EXPIRY_DURATION_MAX = 1440;

// Schema การแสดงผลของใบเสร็จขาเข้า
const entryBillSchema = z.object({
  showDate: z.boolean(),
  showEntryTime: z.boolean(),
  showQrCode: z.boolean(),
  showBillNo: z.boolean(),
});

// Schema ฟอร์มใบเสร็จ (paperWidth = receipt.printer.paperWidth)
const receiptSettingsSchema = z.object({
  entryBill: entryBillSchema,
  paymentBill: entryBillSchema.extend({
    showExpiryTime: z.boolean(),
    expiryDuration: z
      .number("กรุณากรอกจำนวนนาที")
      .int("กรุณากรอกจำนวนเต็ม")
      .min(EXPIRY_DURATION_MIN, `ต้องอยู่ระหว่าง ${EXPIRY_DURATION_MIN}-${EXPIRY_DURATION_MAX} นาที`)
      .max(EXPIRY_DURATION_MAX, `ต้องอยู่ระหว่าง ${EXPIRY_DURATION_MIN}-${EXPIRY_DURATION_MAX} นาที`),
  }),
  paperWidth: z.number().positive(),
  footerText: z.string(),
});

// Schema ฟอร์มตั้งค่าระบบทั้งหมด
const systemSettingsSchema = z.object({
  general: z.object({
    systemName: z.string().trim(),
    location: z.string().trim(),
    language: z.enum(["th", "en"]),
    timezone: z.literal("Asia/Bangkok"),
    frontendUrl: z.string().optional(),
  }),
  receipt: receiptSettingsSchema,
  billing: z.object({
    taxEnabled: z.boolean(),
    currency: z.literal("THB"),
    roundingMode: z.literal("normal"),
  }),
});

export { receiptSettingsSchema, systemSettingsSchema };
