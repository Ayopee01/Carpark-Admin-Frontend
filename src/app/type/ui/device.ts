// Import Types
import type { PaymentMethodId } from "@/src/app/type/api/payments";
import type { PaymentChannelSetting, PaymentMethodSetting } from "@/src/app/type/api/payment-settings";
import type { ActivationDevice, CreateEdcDeviceRequest, DeviceStatusInput, Direction, EdcDevice, EdcUsage, PeripheralDevice } from "@/src/app/type/api/devices";
import type { SettingMenuKey } from "@/src/app/type/ui/navigation";
import type { FeeType, PricingRule, PricingRuleBody } from "@/src/app/type/api/pricing";
import type { VehicleType } from "@/src/app/type/api/transactions";

/* -------------------------------------- Devices Tab Types -------------------------------------- */

// Type ตัวเลือกของ select (ประเภทอุปกรณ์, ประเภทการเชื่อมต่อ)
export type DeviceMasterItem = { code: string; label: string };

// Type ค่าในฟอร์ม Kiosk / Barrier Gate
export type DevicePayload = {
  deviceCode: string;
  deviceName: string;
  deviceType: string;
  connectionType: string;
  ipAddress: string | null;
  status: string;
  isOnline: boolean;
  note: string;
  location?: string | null;
  deviceId?: string | null;
  activationCode?: string | null;
  activationExpiresAt?: string | null;
  expiresAt?: string | null;
  gateId?: string | null;
  direction?: Direction | null;
  cameraRole?: string | null;
  cameraIds?: string[];
  printerRole?: string | null;
  printerIds?: string[];
  edcDeviceId?: string | null; // "" ในฟอร์ม = ไม่ผูก (ส่งเป็น null)
  allowedIps?: string[]; // บรรทัดละ IP ตอนส่งตัดบรรทัดว่างออก
};

// Type ค่าในฟอร์มลงทะเบียน/แก้ไขเครื่อง EDC
export type EdcDevicePayload = Omit<CreateEdcDeviceRequest, "deviceType" | "usage"> & {
  usage: EdcUsage;
  status?: DeviceStatusInput;
};

// Type activation code ที่ dialog แสดง (อุปกรณ์ใหม่ หรือออกรหัสใหม่ให้เครื่องเดิม)
export type DeviceActivationResult = {
  CodeActivate: string;
  message?: string;
  deviceId?: string | null;
  expiresAt?: string | null;
  recovery?: boolean; // true = ออกรหัสใหม่ให้เครื่องเดิมและยกเลิก token เก่า
};

/* -------------------------------------- Pricing Tab Types -------------------------------------- */

// Type ค่าในฟอร์มกฎค่าบริการ เก็บเป็น string เพื่อรองรับค่าว่างและทศนิยม
export type PricingRuleForm = {
  name: string;
  feeType: FeeType;
  vehicleType: VehicleType;
  price: string;
  hourStart: string;
  hourEnd: string;
  status: PricingRule["status"];
};

// Type กฎค่าบริการที่สร้างจากฟอร์ม (ยังไม่มี id) ส่งไปใน PUT /pricing
export type PricingRulePayload = Omit<PricingRuleBody, "id" | "price"> & { price: number };

/* -------------------------------------- Theme Tab Types -------------------------------------- */

// Type ธีมสำเร็จรูปและสีกำหนดเอง (ค่าอื่นจาก GET /theme ใช้ theme1)
export type ThemeMode = "theme1" | "theme2" | "theme3" | "custom";

// Type ธีมที่แปลงแล้ว สีเป็น HEX ที่ถูกต้องเสมอและ URL โลโก้เต็ม
export type ThemeState = {
  themeColor: string;
  logoUrl: string | null;
  configUpdatedAt: string | null;
  themeMode: ThemeMode;
  customThemeColor: string;
  updatedAt: string | null;
};

// Type ค่าในฟอร์มเลือกธีม (สีที่ใช้จริงคำนวณจากสองค่านี้)
export type ThemeForm = {
  themeMode: ThemeMode;
  customColor: string;
};

// Type body ของ PUT /theme เฉพาะสี (โลโก้มี endpoint แยก)
export type ThemePutPayload = {
  themeColor: string;
  themeMode: ThemeMode;
  customThemeColor: string;
};

// Type การ์ดธีมหนึ่งใบ
export type ThemeColorOption = {
  mode: ThemeMode;
  title: string;
  subtitle: string;
  color: string;
};

/* -------------------------------------- Component Types -------------------------------------- */

// Type props ของ dialog ผูกวิธีชำระกับช่องทาง
export type ChannelMappingModalProps = {
    open: boolean;
    channel: PaymentChannelSetting | null;
    methods: PaymentMethodSetting[]; // เฉพาะที่เปิดใช้งาน
    onClose: () => void;
    onSubmit: (allowedMethods: PaymentMethodId[]) => Promise<void>; // throw = ไม่ปิด dialog
};

// Type ค่าในฟอร์มผูกวิธีชำระกับช่องทาง
export type ChannelMappingForm = {
    allowedMethods: PaymentMethodId[];
};

// Type props ของ dialog kiosk / barrier gate
export type DeviceModalProps = {
    open: boolean;
    mode: "create" | "edit";
    defaultValues: DevicePayload;
    cameraDevices: PeripheralDevice[];
    printerDevices: PeripheralDevice[];
    editingId: string | null; // id ของอุปกรณ์ที่แก้อยู่ (null = สร้างใหม่)
    deviceTypes: DeviceMasterItem[];
    // เครื่อง EDC ที่ลงทะเบียน ผูกได้เฉพาะ usage device
    edcDevices?: EdcDevice[];
    // EDC deviceId -> kiosk/gate ที่ผูกอยู่
    edcOwnerById?: Map<string, ActivationDevice>;
    activationResult?: DeviceActivationResult | null;
    cameraOwnerById: Map<string, ActivationDevice>;
    printerOwnersById: Map<string, ActivationDevice[]>;
    onClose: () => void;
    onSubmit: (values: DevicePayload) => Promise<void>; // throw เมื่อบันทึกไม่สำเร็จ dialog แสดง error เอง
    getActivationCode: (result: DeviceActivationResult | null) => string;
    formatDateTime: (value?: string | null) => string;
};

// Type props ของ dialog เครื่อง EDC
export type EdcDeviceModalProps = {
    open: boolean;
    mode: "create" | "edit";
    defaultValues: EdcDevicePayload;
    onClose: () => void;
    onSubmit: (values: EdcDevicePayload) => Promise<void>; // throw เมื่อบันทึกไม่สำเร็จ dialog แสดง error เอง
};

// Type props ของแท็บหน้า device
export type DeviceTabsProps = {
    activeTab: SettingMenuKey;
    onChange: (tab: SettingMenuKey) => void;
};

// Type props ของ dialog กฎค่าบริการ
export type PricingRuleModalProps = {
    open: boolean;
    mode: "create" | "edit";
    defaultValues: PricingRuleForm;
    onClose: () => void;
    onSubmit: (values: PricingRuleForm) => Promise<void>; // throw เมื่อบันทึกไม่สำเร็จ dialog แสดง error เอง
};

// Type props ของการ์ดธีม
export type ThemeOptionCardProps = {
    title: string;
    subtitle: string;
    color: string;
    selected: boolean;
    active: boolean;
    onClick: () => void;
};

// Type props ของตัวเลือกสีกำหนดเอง
export type CustomColorEditorProps = {
    value: string;
    onChange: (value: string) => void;
};
