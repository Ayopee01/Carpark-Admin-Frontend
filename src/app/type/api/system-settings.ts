/* -------------------------------------- System Settings Types -------------------------------------- */

// Type ตัวเลือกการแสดงผลของใบเสร็จขาเข้า
export interface ReceiptBillSettings {
  showDate?: boolean;
  showEntryTime?: boolean;
  showQrCode?: boolean;
  showBillNo?: boolean;
  [key: string]: unknown;
}

// Type ตัวเลือกการแสดงผลของใบเสร็จชำระเงิน
export interface PaymentBillReceiptSettings extends ReceiptBillSettings {
  showExpiryTime?: boolean;
  expiryDuration?: number; // นาที จำนวนเต็ม 1-1440
}

// Type ขนาดตัวอักษรและกระดาษของ printer
export interface ReceiptPrinterSettings {
  fontSize?: number;
  billNumberFontSize?: number;
  paperWidth?: number;
}

// Type การตั้งค่าใบเสร็จทั้งหมด
export interface ReceiptSettings {
  entryBill: ReceiptBillSettings;
  paymentBill: PaymentBillReceiptSettings;
  printer: ReceiptPrinterSettings;
  paperWidth?: string | number;
  footerText?: string | null;
}

// Type การตั้งค่าทั่วไปของระบบ
export interface SystemGeneralSettings {
  systemName: string | null;
  location: string | null;
  language: string | null;
  timezone: string | null;
  frontendUrl: string | null;
}

// Type response ของ GET /system-settings
export interface SystemSettings {
  general: SystemGeneralSettings;
  receipt: ReceiptSettings;
  billing: Record<string, unknown>; // เช่น taxEnabled, currency, roundingMode
  updatedAt?: string;
  configUpdatedAt: string | null;
}

// Type body ของ PUT /system-settings (field ที่ส่งจะ merge กับค่าเดิม)
export type SystemSettingsUpdateRequest = Partial<{
  general: Partial<SystemGeneralSettings>;
  receipt: Partial<{
    entryBill: Partial<ReceiptBillSettings>;
    paymentBill: Partial<PaymentBillReceiptSettings>;
    printer: Partial<ReceiptPrinterSettings>;
    paperWidth: string | number;
    footerText: string | null;
  }>;
  billing: Record<string, unknown>;
}>;

// Type response ของ PUT /system-settings ต้องโหลดใหม่
export interface SystemSettingsUpdateResponse {
  success: true;
  message: string;
}
