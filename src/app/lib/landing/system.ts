// Import Types
import type { SystemSettings } from "@/src/app/type/api/system-settings";
import type { ReceiptSettingsForm, SystemSettingsForm } from "@/src/app/type/ui/system";

/* -------------------------------------- Config -------------------------------------- */

// Config ค่าในฟอร์มก่อนโหลดการตั้งค่าจาก backend
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
    paperWidth: 80,
    footerText: "",
  },
  billing: {
    taxEnabled: false,
    currency: "THB",
    roundingMode: "normal",
  },
};

// Config ค่าในฟอร์มใบเสร็จก่อนโหลดจาก backend
const DEFAULT_RECEIPT_SETTINGS: ReceiptSettingsForm = DEFAULT_SYSTEM_SETTINGS.receipt;

/* -------------------------------------- Functions -------------------------------------- */

// Function แปลงการตั้งค่าใบเสร็จจาก backend เป็นค่าในฟอร์ม
function toReceiptForm(receipt: SystemSettings["receipt"]): ReceiptSettingsForm {
  return {
    entryBill: { ...receipt.entryBill },
    paymentBill: { ...receipt.paymentBill },
    paperWidth: receipt.printer.paperWidth,
    footerText: receipt.footerText ?? "",
  };
}

// Function แปลงการตั้งค่าระบบจาก backend เป็นค่าในฟอร์ม (general ที่เป็น null แสดงเป็นช่องว่าง)
function toSystemSettingsForm(settings: SystemSettings): SystemSettingsForm {
  const { general } = settings;
  return {
    general: {
      systemName: general.systemName ?? "",
      location: general.location ?? "",
      language: general.language,
      timezone: general.timezone,
      ...(general.frontendUrl ? { frontendUrl: general.frontendUrl } : {}),
    },
    receipt: toReceiptForm(settings.receipt),
    billing: { ...settings.billing },
  };
}

export { DEFAULT_SYSTEM_SETTINGS, DEFAULT_RECEIPT_SETTINGS, toReceiptForm, toSystemSettingsForm };
