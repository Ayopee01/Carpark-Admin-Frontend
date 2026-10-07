// Import Types
import type { FeeType, PricingRule, PricingRuleBody } from "@/src/app/type/api/pricing";
import type { VehicleType } from "@/src/app/type/api/transactions";
import type { PricingRuleForm, PricingRulePayload } from "@/src/app/type/ui/device";

/* -------------------------------------- Config -------------------------------------- */

// Config ชั่วโมงสุดท้ายของวันที่กฎค่าบริการกำหนดได้
const MAX_HOUR = 24;

// Config ตัวเลือกประเภทค่าบริการในฟอร์ม
const FEE_TYPE_OPTIONS: { code: FeeType; label: string; description: string }[] = [
  {
    code: "base_hour",
    label: "ชั่วโมงพื้นฐาน (base_hour)",
    description: "ราคาต่อชั่วโมง สำหรับชั่วโมงที่ 1 ถึงชั่วโมงที่กำหนดของแต่ละวัน",
  },
  {
    code: "next_hour",
    label: "ชั่วโมงถัดไป (next_hour)",
    description: "ราคาต่อชั่วโมง สำหรับช่วงชั่วโมงที่กำหนด ต้องเริ่มหลังชั่วโมงสุดท้ายของ base_hour",
  },
  {
    code: "overnight_day",
    label: "ค่าค้างคืน (overnight_day)",
    description: "คิดครั้งละ 1 เมื่อข้ามเที่ยงคืน 1 ครั้ง",
  },
];

// Config ตัวเลือกประเภทรถในฟอร์ม
const VEHICLE_TYPE_OPTIONS: { code: VehicleType; label: string }[] = [
  { code: "car", label: "รถยนต์" },
  { code: "motorcycle", label: "รถจักรยานยนต์" },
];

// Config ค่าเริ่มต้นของฟอร์มกฎค่าบริการใหม่
const EMPTY_PRICING_FORM: PricingRuleForm = {
  name: "",
  feeType: "base_hour",
  vehicleType: "car",
  price: "",
  hourStart: "1",
  hourEnd: "",
  status: "active",
};

/* -------------------------------------- Functions -------------------------------------- */

// Function ดึงชั่วโมงเริ่มของกฎ (base_hour เริ่มชั่วโมงที่ 1 เสมอ)
function getRuleHourStart(rule: Pick<PricingRule, "feeType" | "hourStart">): number {
  return rule.feeType === "base_hour" ? 1 : rule.hourStart ?? 1;
}

// Function ตรวจว่าเป็นประเภทค่าบริการที่ฟอร์มรองรับ
function isSupportedFeeType(value: string): value is FeeType {
  return FEE_TYPE_OPTIONS.some((option) => option.code === value);
}

// Function ดึงชื่อที่แสดงของประเภทค่าบริการ
function getFeeTypeLabel(value: string): string {
  return FEE_TYPE_OPTIONS.find((option) => option.code === value)?.label ?? value;
}

// Function ดึงชั่วโมงสุดท้ายของกฎ (base_hour ใช้ baseHours ถ้าไม่มี hourEnd, next_hour ไม่มี = 24)
function getRuleHourEnd(rule: Pick<PricingRule, "feeType" | "hourEnd" | "baseHours">): number | null {
  if (rule.feeType === "base_hour") return rule.hourEnd ?? rule.baseHours ?? 1;
  if (rule.feeType === "next_hour") return rule.hourEnd ?? MAX_HOUR;
  return null;
}

// Function แปลงกฎค่าบริการเป็นค่าในฟอร์ม
function ruleToForm(rule: PricingRule): PricingRuleForm {
  const hourEnd = getRuleHourEnd(rule);
  return {
    name: rule.name ?? "",
    feeType: isSupportedFeeType(rule.feeType) ? rule.feeType : "base_hour",
    vehicleType: rule.vehicleType,
    price: String(rule.price ?? ""),
    hourStart: String(rule.feeType === "base_hour" ? 1 : rule.hourStart ?? ""),
    hourEnd: rule.feeType === "next_hour" && rule.hourEnd === null ? "" : hourEnd === null ? "" : String(hourEnd),
    status: rule.status ?? "active",
  };
}

// Function แปลงค่าในฟอร์มเป็นกฎค่าบริการ ส่งเฉพาะ field ของประเภทนั้น
function formToPayload(form: PricingRuleForm): PricingRulePayload {
  const base = {
    name: form.name.trim() || getFeeTypeLabel(form.feeType),
    feeType: form.feeType,
    vehicleType: form.vehicleType,
    price: Number(form.price.trim()),
    status: form.status,
  };

  if (form.feeType === "base_hour") {
    return { ...base, hourStart: 1, hourEnd: Number(form.hourEnd) };
  }

  if (form.feeType === "next_hour") {
    return {
      ...base,
      hourStart: Number(form.hourStart),
      hourEnd: form.hourEnd.trim() ? Number(form.hourEnd) : null,
    };
  }

  return base;
}

// Function แปลงกฎเดิมเป็น body ของ PUT /pricing คง id ไว้ และส่งเฉพาะ field ของประเภทนั้น
function ruleToBody(rule: PricingRule): PricingRuleBody {
  const body: PricingRuleBody = {
    id: rule.id,
    name: rule.name,
    feeType: rule.feeType,
    vehicleType: rule.vehicleType,
    price: rule.price,
    status: rule.status,
  };

  if (rule.feeType === "base_hour") {
    return { ...body, hourStart: 1, hourEnd: getRuleHourEnd(rule) ?? 1 };
  }

  if (rule.feeType === "next_hour") {
    return { ...body, hourStart: getRuleHourStart(rule), hourEnd: rule.hourEnd ?? null };
  }

  return body;
}

// Function แปลงช่อง IP บรรทัดละตัวเป็นรายการ IP ตัดช่องว่างและบรรทัดว่างออก
function parseIpLines(lines: string[] | undefined): string[] {
  return (lines ?? []).map((line) => line.trim()).filter(Boolean);
}

export { MAX_HOUR, FEE_TYPE_OPTIONS, VEHICLE_TYPE_OPTIONS, EMPTY_PRICING_FORM, getRuleHourStart, isSupportedFeeType, getFeeTypeLabel, getRuleHourEnd, ruleToForm, formToPayload, ruleToBody, parseIpLines };
