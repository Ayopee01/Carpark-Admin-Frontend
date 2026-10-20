// Import Library
import { z } from "zod";

// schema ของฟอร์มกฎค่าบริการ ค่าในฟอร์มเป็น string (ช่องว่างได้) แปลงเป็นตัวเลขตอนส่งด้วย formToPayload
// ตรวจเฉพาะกฎหนึ่งรายการ ส่วนกฎทั้งชุด (ช่วงชั่วโมงซ้อนกัน ฯลฯ) backend ตรวจ

// Config ชั่วโมงสูงสุดของกฎรายชั่วโมง (ตรงกับ MAX_HOUR ใน lib/landing/device)
const MAX_PRICING_HOUR = 24;

// Function อ่านชั่วโมงจาก string (ไม่ใช่จำนวนเต็ม 1..24 = null)
function parseHour(value: string): number | null {
  const hour = Number(value);
  return value.trim() !== "" && Number.isInteger(hour) && hour >= 1 && hour <= MAX_PRICING_HOUR ? hour : null;
}

// Schema ฟอร์มกฎค่าบริการหนึ่งรายการ
const pricingRuleSchema = z
  .object({
    name: z.string(),
    feeType: z.enum(["base_hour", "next_hour", "overnight_day"], "กรุณาเลือกประเภทค่าบริการ"),
    vehicleType: z.enum(["car", "motorcycle"], "กรุณาเลือกประเภทรถ"),
    price: z
      .string()
      .trim()
      .min(1, "กรุณากรอกราคา")
      .refine((value) => Number.isFinite(Number(value)) && Number(value) >= 0, "ราคาต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป"),
    hourStart: z.string(),
    hourEnd: z.string(),
    status: z.enum(["active", "inactive"], "กรุณาเลือกสถานะ"),
  })
  .superRefine((values, ctx) => {
    const hourMessage = `ต้องเป็นจำนวนเต็ม 1-${MAX_PRICING_HOUR}`;

    if (values.feeType === "base_hour") {
      if (parseHour(values.hourEnd) === null) ctx.addIssue({ code: "custom", path: ["hourEnd"], message: `กรุณากรอกชั่วโมงสิ้นสุด (${hourMessage})` });
      return;
    }

    if (values.feeType === "next_hour") {
      const start = parseHour(values.hourStart);
      if (start === null) ctx.addIssue({ code: "custom", path: ["hourStart"], message: `กรุณากรอกชั่วโมงเริ่มต้น (${hourMessage})` });
      // เว้นว่าง = ถึงชั่วโมงสุดท้าย
      if (values.hourEnd.trim() === "") return;
      const end = parseHour(values.hourEnd);
      if (end === null) ctx.addIssue({ code: "custom", path: ["hourEnd"], message: hourMessage });
      else if (start !== null && end < start) ctx.addIssue({ code: "custom", path: ["hourEnd"], message: "ชั่วโมงสิ้นสุดต้องไม่น้อยกว่าชั่วโมงเริ่มต้น" });
    }
  });

export { pricingRuleSchema };
