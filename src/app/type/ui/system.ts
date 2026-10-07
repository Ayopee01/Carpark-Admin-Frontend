// Import Types
import type { SystemMenuKey } from "@/src/app/type/ui/navigation";

/* -------------------------------------- System Form Types -------------------------------------- */

// Type ภาษาของระบบ
export type SystemLanguage = "th" | "en" | "zh" | (string & {});

// Type timezone ของระบบ
export type SystemTimezone = "Asia/Bangkok" | (string & {});

// Type ความกว้างกระดาษใบเสร็จ
export type PaperWidth = "58mm" | "80mm" | (string & {});

// Type สกุลเงิน
export type CurrencyCode = "THB" | (string & {});

// Type วิธีปัดเศษ
export type RoundingMode = "normal" | "up" | "down" | (string & {});

// Type ค่าในฟอร์มตั้งค่าทั่วไป
export type SystemGeneralForm = {
  systemName: string;
  location: string;
  language: SystemLanguage;
  timezone: SystemTimezone;
  frontendUrl?: string;
};

// Type ค่าในฟอร์มใบเสร็จขาเข้า
export type EntryBillSettings = {
  showDate: boolean;
  showEntryTime: boolean;
  showQrCode: boolean;
  showBillNo: boolean;
};

// Type ค่าในฟอร์มใบเสร็จชำระเงิน
export type PaymentBillSettings = EntryBillSettings & {
  showExpiryTime: boolean;
  expiryDuration: number;
};

// Type ค่าในฟอร์มใบเสร็จทั้งหมด
export type ReceiptSettingsForm = {
  entryBill: EntryBillSettings;
  paymentBill: PaymentBillSettings;
  paperWidth: PaperWidth;
  footerText: string;
};

// Type ค่าในฟอร์มการคิดเงิน
export type BillingSettingsForm = {
  taxEnabled: boolean;
  currency: CurrencyCode;
  roundingMode: RoundingMode;
};

// Type ค่าในฟอร์มตั้งค่าระบบทั้งหมด (ทุก field มีค่า)
export type SystemSettingsForm = {
  general: SystemGeneralForm;
  receipt: ReceiptSettingsForm;
  billing: BillingSettingsForm;
};

/* -------------------------------------- Component Types -------------------------------------- */

// Type props ของแท็บหน้า system
export type SystemTabsProps = {
    activeTab: SystemMenuKey;
    onChange: (tab: SystemMenuKey) => void;
};
