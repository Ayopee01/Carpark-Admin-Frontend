// Import Types
import type { SystemBillingSettings, SystemGeneralSettings, SystemLanguage } from "@/src/app/type/api/system-settings";
import type { SystemMenuKey } from "@/src/app/type/ui/navigation";

/* -------------------------------------- System Form Types -------------------------------------- */

// Type ค่าในฟอร์มตั้งค่าทั่วไป
export type SystemGeneralForm = {
  systemName: string;
  location: string;
  language: SystemLanguage;
  timezone: SystemGeneralSettings["timezone"];
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
  paperWidth: number; // ความกว้างกระดาษ mm (receipt.printer.paperWidth)
  footerText: string;
};

// Type ค่าในฟอร์มการคิดเงิน
export type BillingSettingsForm = SystemBillingSettings;

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
