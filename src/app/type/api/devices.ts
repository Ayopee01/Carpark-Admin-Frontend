/* -------------------------------------- Device Types -------------------------------------- */

// Type ทิศทางของ gate และกล้อง
export type Direction = "IN" | "OUT";

// Type ประเภทอุปกรณ์
export type DeviceType = "kiosk" | "barrier_gate" | "camera" | "printer" | "edc";

// Type สถานะอุปกรณ์ (inactive = ปิดใช้งาน token ใช้ไม่ได้จนกว่าจะตั้งกลับเป็น active)
export type DeviceStatus = "pending_activation" | "active" | "offline" | "maintenance" | "inactive";

// Type สถานะที่ตั้งผ่าน PUT ได้ (เครื่องที่รอ activate เปลี่ยนสถานะไม่ได้)
export type DeviceStatusInput = "active" | "maintenance" | "inactive";

// Type การใช้งานเครื่อง EDC (ประจำเคาน์เตอร์ / ผูกกับอุปกรณ์)
export type EdcUsage = "cashier" | "device";

// Type ทิศทางที่ส่งใน request ได้ ("" หรือ null = ไม่ระบุ)
export type DirectionInput = Direction | "" | null;

// Type field ที่อุปกรณ์ทุกประเภทมี (ทุก key มีเสมอ ไม่มีค่า = null หรือ [])
interface DeviceBase {
  id: string; // key เดียวที่ไม่ซ้ำและไม่เปลี่ยน ใช้ใน path ทุกเส้นและใน cameraIds/printerIds/edcDeviceId
  deviceCode: string;
  deviceName: string;
  status: DeviceStatus;
  isOnline: boolean;
  location: string | null;
  note: string | null;
}

// Type field เครือข่ายของอุปกรณ์ที่ต่อ online (EDC ไม่มี)
interface NetworkDeviceFields {
  connectionType: string | null;
  ipAddress: string | null;
  lastSeen: string | null;
  allowedIps: string[]; // [] = ไม่จำกัด
  gateId: string | null;
  direction: Direction | null;
}

// Type kiosk / barrier gate (สร้างด้วย activation code)
export interface ActivationDevice extends DeviceBase, NetworkDeviceFields {
  deviceType: "kiosk" | "barrier_gate";
  deviceId: string | null; // null จนกว่าจะ activate
  activationCode: string | null; // มีค่าระหว่างรอ activate
  activationExpiresAt: string | null;
  cameraIds: string[]; // มีค่าได้เฉพาะ barrier_gate
  printerIds: string[];
  edcDeviceId: string | null;
}

// Type กล้อง / printer (ได้ device token ตอนสร้าง)
export interface PeripheralDevice extends DeviceBase, NetworkDeviceFields {
  deviceType: "camera" | "printer";
  deviceId: string;
  cameraRole: string | null;
  printerRole: string | null;
}

// Type เครื่อง EDC (ไม่มีการเชื่อมต่อ online)
export interface EdcDevice extends DeviceBase {
  deviceType: "edc";
  deviceId: string;
  status: DeviceStatusInput; // สร้างเป็น active ที่เหลือมาจาก PUT
  isOnline: false;
  terminalId: string;
  merchantId: string | null;
  provider: string | null;
  serialNo: string | null;
  usage: EdcUsage;
}

// Type อุปกรณ์ในรายการและใน response ของ POST/PUT/mapping แยกด้วย deviceType
export type Device = ActivationDevice | PeripheralDevice | EdcDevice;

/* -------------------------------------- Devices Route Types -------------------------------------- */

// Type query ของ GET /devices
export interface DeviceListQuery {
  deviceType?: DeviceType;
  status?: DeviceStatus;
  keyword?: string;
}

// Type response ของ GET /devices
export interface DeviceListResponse {
  total: number;
  online: number;
  offline: number; // ไม่นับ maintenance / inactive
  maintenance: number;
  inactive: number;
  devices: Device[];
  configUpdatedAt: string | null;
}

// Type body ของ POST /devices สำหรับ kiosk/barrier gate (ได้ activation code)
export interface CreateActivationDeviceRequest {
  deviceType: "kiosk" | "barrier_gate";
  deviceName: string;
  deviceCode?: string | null;
  location?: string | null;
  gateId?: string | null; // เฉพาะ barrier_gate
  direction?: DirectionInput;
  cameraIds?: string[]; // เฉพาะ barrier_gate
  printerIds?: string[];
  edcDeviceId?: string | null; // EDC ที่ usage เป็น device และยังว่าง
  allowedIps?: string[];
  connectionType?: string | null;
  note?: string | null;
}

// Type body ของ POST /devices สำหรับกล้อง/printer (ได้ deviceToken)
export interface CreateCredentialedDeviceRequest {
  deviceType: "camera" | "printer";
  deviceName: string;
  deviceCode?: string | null; // ใช้เป็น deviceId
  location?: string | null;
  gateId?: string | null;
  direction?: DirectionInput;
  ipAddress?: string | null;
  cameraRole?: string | null;
  printerRole?: string | null;
  allowedIps?: string[];
  connectionType?: string | null;
  note?: string | null;
}

// Type body ของ POST /devices สำหรับเครื่อง EDC
export interface CreateEdcDeviceRequest {
  deviceType: "edc";
  deviceName: string;
  terminalId: string; // TID บน slip ห้ามซ้ำ ไม่เกิน 50 ตัว
  merchantId?: string | null;
  provider?: string | null;
  serialNo?: string | null;
  location?: string | null;
  usage?: EdcUsage; // ไม่ส่ง = device
  note?: string | null;
}

// Type body ของ POST /devices ทุกประเภท
export type CreateDeviceRequest = CreateActivationDeviceRequest | CreateCredentialedDeviceRequest | CreateEdcDeviceRequest;

// Type response ของ POST /devices สำหรับ kiosk/barrier gate (ยังไม่ activate)
export interface ActivationCodeResponse {
  CodeActivate: string; // 6 หลัก
  activationExpiresAt: string;
  deviceName: string;
  deviceType: "kiosk" | "barrier_gate";
  status: "pending_activation";
  isOnline: false;
  device: ActivationDevice;
}

// Type response ของ POST /devices สำหรับกล้อง/printer
export interface CredentialedDeviceResponse {
  success: true;
  message: "Camera provisioned" | "Printer provisioned";
  device: PeripheralDevice;
  deviceToken: string; // แสดงครั้งเดียว
}

// Type response ของ POST /devices สำหรับเครื่อง EDC
export interface EdcDeviceResponse {
  success: true;
  message: "EDC device registered";
  device: EdcDevice;
}

// Type response ของ POST /devices ทุกประเภท
export type CreateDeviceResponse = ActivationCodeResponse | CredentialedDeviceResponse | EdcDeviceResponse;

// Type response ของ POST /devices/:deviceId/activation-code
export interface DeviceActivationCodeResponse {
  success: true;
  message: string;
  deviceId: string;
  deviceName: string;
  deviceType: "kiosk" | "barrier_gate";
  activationCode: string;
  expiresAt: string;
  device: ActivationDevice;
}

// Type body ของ PUT /devices/:deviceId ส่งเฉพาะ field ที่แก้
export interface DeviceUpdateRequest {
  deviceName?: string | null;
  deviceCode?: string | null;
  location?: string | null;
  connectionType?: string | null;
  ipAddress?: string | null;
  status?: DeviceStatusInput; // ส่งกับเครื่องที่รอ activate ไม่ได้
  note?: string | null;
  allowedIps?: string[];
  // เฉพาะ kiosk / barrier_gate
  gateId?: string | null;
  direction?: DirectionInput;
  cameraIds?: string[];
  printerIds?: string[];
  edcDeviceId?: string | null; // null = ถอด EDC
  cameraRole?: string | null;
  printerRole?: string | null;
  // เฉพาะ edc
  terminalId?: string;
  merchantId?: string | null;
  provider?: string | null;
  serialNo?: string | null;
  usage?: EdcUsage;
  deviceType?: DeviceType; // ต้องเป็นค่าเดิม
}

// Type response ของ PUT /devices/:deviceId
export interface DeviceUpdateResponse {
  message: "Device updated";
  device: Device;
}

// Type response ของ PUT/DELETE ผูกหรือถอดกล้อง/printer ทีละตัว (เรียกซ้ำได้ 200)
export interface DeviceMappingResponse {
  message: "Device mapped" | "Device unmapped";
  device: Device;
}

// Type gate ที่กล้องผูกอยู่ ใน error 409 CAMERA_IN_USE
export interface CameraAssignment {
  cameraId: string;
  deviceId: string;
}

// Type response ของ DELETE /devices/:deviceId
export interface DeviceDeleteResponse {
  success: true;
  message: "Device deleted";
}

/* -------------------------------------- Device Event Types -------------------------------------- */

// Type event เมื่ออุปกรณ์ตัวหนึ่งเปลี่ยนสถานะ
export interface DeviceEvent {
  type:
    | "device_provisioned"
    | "device_activated"
    | "device_activation_expired"
    | "device_activation_reissued"
    | "device_status_changed"
    | "device_deleted";
  deviceId: string | null;
  id: string;
  deviceCode: string;
  deviceType: DeviceType;
  deviceName: string;
  status?: DeviceStatus | "expired" | "deleted";
  previousStatus?: string;
  isOnline?: boolean;
  lastSeen?: string | null;
  activationExpiresAt?: string; // เฉพาะ device_activation_reissued
}

// Type event รายการอุปกรณ์ทั้งหมด ส่งทุกครั้งที่ต่อ stream
export interface DevicesSnapshotEvent {
  type: "devices_snapshot";
  data: DeviceListResponse; // ไม่กรอง
  generatedAt: string;
}

// Type event เมื่อ config ของอุปกรณ์ถูกแก้
export interface DevicesConfigUpdatedEvent {
  type: "devices_config_updated";
  config: {
    summary: { totalDevices: number; online: number; offline: number };
    devices: Device[];
    masterData: Record<string, unknown>;
    configUpdatedAt: string | null;
  };
}

// Type event ของ GET /devices/events (connected/ping จัดการใน subscribeSse)
export type DevicesStreamEvent = DevicesSnapshotEvent | DeviceEvent | DevicesConfigUpdatedEvent;
