/* -------------------------------------- System Settings Types -------------------------------------- */

// Type ตัวเลือกการแสดงผลของใบเสร็จขาเข้า
export interface ReceiptBillSettings {
  showDate: boolean;
  showEntryTime: boolean;
  showQrCode: boolean;
  showBillNo: boolean;
}

// Type ตัวเลือกการแสดงผลของใบเสร็จชำระเงิน
export interface PaymentBillReceiptSettings extends ReceiptBillSettings {
  showExpiryTime: boolean;
  expiryDuration: number; // นาที จำนวนเต็ม 1-1440
}

// Type ขนาดตัวอักษรและกระดาษของ printer
export interface ReceiptPrinterSettings {
  fontSize: number;
  billNumberFontSize: number;
  paperWidth: number; // ความกว้างกระดาษ หน่วย mm
}

// Type การตั้งค่าใบเสร็จทั้งหมด
export interface ReceiptSettings {
  entryBill: ReceiptBillSettings;
  paymentBill: PaymentBillReceiptSettings;
  printer: ReceiptPrinterSettings;
  footerText: string | null;
}

// Type ภาษาของระบบ
export type SystemLanguage = "th" | "en";

// Type การตั้งค่าทั่วไปของระบบ (backend คิดเวลาไทยเสมอ)
export interface SystemGeneralSettings {
  systemName: string | null;
  location: string | null;
  language: SystemLanguage;
  timezone: "Asia/Bangkok";
  frontendUrl: string | null;
}

// Type การตั้งค่าการคิดเงิน (backend เก็บไว้ ไม่ได้ใช้คำนวณ)
export interface SystemBillingSettings {
  taxEnabled: boolean;
  currency: "THB";
  roundingMode: "normal";
}

// Type response ของ GET /system-settings (key ครบเสมอ backend มีค่าเริ่มต้น)
export interface SystemSettings {
  general: SystemGeneralSettings;
  receipt: ReceiptSettings;
  billing: SystemBillingSettings;
  updatedAt: string;
  configUpdatedAt: string | null;
}

// Type body ของ PUT /system-settings (field ที่ส่งจะ merge กับค่าเดิม)
export type SystemSettingsUpdateRequest = Partial<{
  general: Partial<SystemGeneralSettings>;
  receipt: Partial<{
    entryBill: Partial<ReceiptBillSettings>;
    paymentBill: Partial<PaymentBillReceiptSettings>;
    printer: Partial<ReceiptPrinterSettings>;
    footerText: string | null;
  }>;
  billing: Partial<SystemBillingSettings>;
}>;

// Type response ของ PUT /system-settings ต้องโหลดใหม่
export interface SystemSettingsUpdateResponse {
  success: true;
  message: string;
}
