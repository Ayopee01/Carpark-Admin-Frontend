// Import Types
import type { SystemSettings } from "@/src/app/type/api/system-settings";
import type { ReceiptSettingsForm, SystemSettingsForm } from "@/src/app/type/ui/system";

/* -------------------------------------- Config -------------------------------------- */

// Config ค่าเริ่มต้นของฟอร์มเมื่อ GET /system-settings ไม่ส่งค่านั้นมา
const DEFAULT_SYSTEM_SETTINGS: SystemSettingsForm = {
  general: {
    systemName: "",
    location: "",
    language: "th",
    timezone: "Asia/Bangkok",
  },
  receipt: {
    entryBill: {
      showDate: true,
      showEntryTime: true,
      showQrCode: true,
      showBillNo: true,
    },
    paymentBill: {
      showDate: true,
      showEntryTime: true,
      showQrCode: true,
      showBillNo: true,
      showExpiryTime: true,
      expiryDuration: 15,
    },
    paperWidth: "80mm",
    footerText: "",
  },
  billing: {
    taxEnabled: false,
    currency: "THB",
    roundingMode: "normal",
  },
};

// Config ค่าเริ่มต้นของฟอร์มใบเสร็จ
const DEFAULT_RECEIPT_SETTINGS: ReceiptSettingsForm = DEFAULT_SYSTEM_SETTINGS.receipt;

/* -------------------------------------- Helpers -------------------------------------- */

// Function ใช้ค่า boolean ที่ได้มา หรือค่าเริ่มต้นถ้าไม่ใช่ boolean
function pickBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

// Function ใช้ค่าตัวเลขที่ได้มา หรือค่าเริ่มต้นถ้าไม่ใช่ตัวเลข
function pickNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

// Function ใช้ค่า string ที่ได้มา หรือค่าเริ่มต้นถ้าไม่ใช่ string
function pickString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

/* -------------------------------------- Functions -------------------------------------- */

// Function แปลงการตั้งค่าใบเสร็จจาก backend เป็นค่าในฟอร์ม เติมค่าที่ขาดด้วยค่าเริ่มต้น
function toReceiptForm(receipt: SystemSettings["receipt"] | null | undefined): ReceiptSettingsForm {
  const defaults = DEFAULT_RECEIPT_SETTINGS;
  const entry = receipt?.entryBill ?? {};
  const payment = receipt?.paymentBill ?? {};

  return {
    entryBill: {
      showDate: pickBoolean(entry.showDate, defaults.entryBill.showDate),
      showEntryTime: pickBoolean(entry.showEntryTime, defaults.entryBill.showEntryTime),
      showQrCode: pickBoolean(entry.showQrCode, defaults.entryBill.showQrCode),
      showBillNo: pickBoolean(entry.showBillNo, defaults.entryBill.showBillNo),
    },
    paymentBill: {
      showDate: pickBoolean(payment.showDate, defaults.paymentBill.showDate),
      showEntryTime: pickBoolean(payment.showEntryTime, defaults.paymentBill.showEntryTime),
      showQrCode: pickBoolean(payment.showQrCode, defaults.paymentBill.showQrCode),
      showBillNo: pickBoolean(payment.showBillNo, defaults.paymentBill.showBillNo),
      showExpiryTime: pickBoolean(payment.showExpiryTime, defaults.paymentBill.showExpiryTime),
      expiryDuration: pickNumber(payment.expiryDuration, defaults.paymentBill.expiryDuration),
    },
    paperWidth:
      receipt?.paperWidth === undefined || receipt.paperWidth === null
        ? defaults.paperWidth
        : String(receipt.paperWidth),
    footerText: receipt?.footerText ?? defaults.footerText,
  };
}

// Function แปลงการตั้งค่าระบบจาก backend เป็นค่าในฟอร์ม เติมค่าที่ขาดด้วยค่าเริ่มต้น
function toSystemSettingsForm(settings: SystemSettings | null | undefined): SystemSettingsForm {
  const defaults = DEFAULT_SYSTEM_SETTINGS;
  const general = settings?.general;
  const billing = settings?.billing ?? {};

  return {
    general: {
      systemName: general?.systemName ?? defaults.general.systemName,
      location: general?.location ?? defaults.general.location,
      language: general?.language ?? defaults.general.language,
      timezone: general?.timezone ?? defaults.general.timezone,
      ...(general?.frontendUrl ? { frontendUrl: general.frontendUrl } : {}),
    },
    receipt: toReceiptForm(settings?.receipt),
    billing: {
      taxEnabled: pickBoolean(billing.taxEnabled, defaults.billing.taxEnabled),
      currency: pickString(billing.currency, defaults.billing.currency),
      roundingMode: pickString(billing.roundingMode, defaults.billing.roundingMode),
    },
  };
}

export { DEFAULT_SYSTEM_SETTINGS, DEFAULT_RECEIPT_SETTINGS, toReceiptForm, toSystemSettingsForm };
