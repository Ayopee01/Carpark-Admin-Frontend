/* -------------------------------------- Device Types -------------------------------------- */

// Type ทิศทางของ gate และกล้อง
export type Direction = "IN" | "OUT";

// Type ประเภทอุปกรณ์
export type DeviceType = "kiosk" | "barrier_gate" | "camera" | "printer" | "edc";

// Type สถานะอุปกรณ์
export type DeviceStatus = "pending_activation" | "active" | "offline" | "maintenance" | "inactive" | (string & {});

// Type การใช้งานเครื่อง EDC (ประจำเคาน์เตอร์ / ผูกกับอุปกรณ์)
export type EdcUsage = "cashier" | "device";

// Type ทิศทางที่ส่งใน request ได้ ("" หรือ null = ไม่ระบุ)
export type DirectionInput = Direction | "" | null;

// Type อุปกรณ์ในรายการ GET /devices (field ขึ้นกับ deviceType)
export interface Device {
  id: string;
  deviceId: string | null; // null ระหว่าง pending_activation
  deviceCode: string;
  deviceName: string;
  deviceType: DeviceType;
  connectionType: string;
  ipAddress: string | null;
  location: string | null;
  status: DeviceStatus;
  isOnline: boolean; // EDC เป็น false เสมอ
  note: string;
  lastSeen?: string | null;
  activatedAt?: string;
  deviceTokenIssuedAt?: string | null;
  activationCode?: string | null;
  activationExpiresAt?: string | null;
  allowedIps?: string[];
  // เฉพาะ kiosk / barrier_gate
  gateId?: string | null;
  direction?: Direction | null;
  cameraIds?: string[];
  printerIds?: string[];
  edcDeviceId?: string | null;
  cameraRole?: string | null;
  printerRole?: string | null;
  // เฉพาะ edc
  terminalId?: string;
  merchantId?: string | null;
  provider?: string | null;
  serialNo?: string | null;
  usage?: EdcUsage;
}

// Type อุปกรณ์ที่คืนมาหลังสร้าง/แก้ไข
export interface DeviceMutationResponse {
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  connectionType: string;
  location: string | null;
  ipAddress: string | null;
  gateId: string | null;
  direction: Direction | null;
  cameraIds: string[];
  cameraRole: string | null;
  printerIds: string[];
  printerRole: string | null;
  edcDeviceId: string | null;
  terminalId: string | null;
  merchantId: string | null;
  provider: string | null;
  serialNo: string | null;
  usage: EdcUsage | null;
  allowedIps: string[];
  status: DeviceStatus;
  isOnline: boolean;
  note: string;
}

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
  offline: number;
  maintenance: number;
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

// Type response ของ POST /devices สำหรับ kiosk/barrier gate
export interface ActivationCodeResponse {
  CodeActivate: string; // 6 หลัก ใช้ได้ 10 นาที
  deviceName: string;
  deviceType: "kiosk" | "barrier_gate";
  status: "active";
  isOnline: true;
}

// Type response ของ POST /devices สำหรับกล้อง/printer
export interface CredentialedDeviceResponse {
  success: true;
  message: "Camera provisioned" | "Printer provisioned";
  device: DeviceMutationResponse;
  deviceToken: string; // แสดงครั้งเดียว
}

// Type response ของ POST /devices สำหรับเครื่อง EDC
export interface EdcDeviceResponse {
  success: true;
  message: "EDC device registered";
  device: DeviceMutationResponse;
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
  device: DeviceMutationResponse;
}

// Type body ของ PUT /devices/:deviceId ส่งเฉพาะ field ที่แก้
export interface DeviceUpdateRequest {
  deviceName?: string | null;
  deviceCode?: string | null;
  location?: string | null;
  connectionType?: string | null;
  ipAddress?: string | null;
  status?: string;
  isOnline?: boolean;
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
  device: DeviceMutationResponse;
}

// Type response ของ PUT/DELETE ผูกหรือถอดกล้อง/printer ทีละตัว (เรียกซ้ำได้ 200)
export interface DeviceMappingResponse {
  message: "Device mapped" | "Device unmapped";
  device: DeviceMutationResponse;
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
  config: { summary: unknown; devices: Device[]; masterData: unknown; configUpdatedAt: string | null };
}

// Type event ของ GET /devices/events (connected/ping จัดการใน subscribeSse)
export type DevicesStreamEvent = DevicesSnapshotEvent | DeviceEvent | DevicesConfigUpdatedEvent;
