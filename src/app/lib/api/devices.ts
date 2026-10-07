// Import Types
import type { ActivationCodeResponse, CreateActivationDeviceRequest, CreateCredentialedDeviceRequest, CreateDeviceRequest, CreateDeviceResponse, CreateEdcDeviceRequest, CredentialedDeviceResponse, DeviceActivationCodeResponse, DeviceDeleteResponse, DeviceListQuery, DeviceListResponse, DeviceMappingResponse, DeviceUpdateRequest, DeviceUpdateResponse, DevicesStreamEvent, EdcDeviceResponse } from "@/src/app/type/api/devices";
import type { SseOptions } from "@/src/app/type/api/common";
// Import Shared
import { apiRequest, seg, subscribeSse } from "@/src/app/lib/shared/http";

// Function ดึงรายการอุปกรณ์พร้อมจำนวน online/offline (GET /api/devices)
function getDevices(query: DeviceListQuery = {}): Promise<DeviceListResponse> {
  return apiRequest<DeviceListResponse>("/devices", { query: { ...query }, errorMessage: "โหลดข้อมูลอุปกรณ์ไม่สำเร็จ" });
}

// Function เปิด SSE รับสถานะอุปกรณ์แบบ realtime (GET /api/devices/events)
function subscribeDeviceEvents(options: SseOptions<DevicesStreamEvent>): () => void {
  return subscribeSse("/devices/events", options);
}

// Function สร้างอุปกรณ์ deviceType เป็นตัวกำหนดรูปแบบ response (POST /api/devices)
function createDevice(body: CreateActivationDeviceRequest): Promise<ActivationCodeResponse>;
function createDevice(body: CreateCredentialedDeviceRequest): Promise<CredentialedDeviceResponse>;
function createDevice(body: CreateEdcDeviceRequest): Promise<EdcDeviceResponse>;
function createDevice(body: CreateDeviceRequest): Promise<CreateDeviceResponse>;
function createDevice(body: CreateDeviceRequest): Promise<CreateDeviceResponse> {
  return apiRequest<CreateDeviceResponse>("/devices", {
    method: "POST",
    body,
    errorMessage: "สร้างอุปกรณ์ไม่สำเร็จ",
  });
}

// Function แก้ไขข้อมูลอุปกรณ์ (PUT /api/devices/:deviceId)
function updateDevice(deviceId: string, body: DeviceUpdateRequest): Promise<DeviceUpdateResponse> {
  return apiRequest<DeviceUpdateResponse>(`/devices/${seg(deviceId)}`, {
    method: "PUT",
    body,
    errorMessage: "บันทึกข้อมูลอุปกรณ์ไม่สำเร็จ",
  });
}

// Function ลบอุปกรณ์ (DELETE /api/devices/:deviceId)
function deleteDevice(deviceId: string): Promise<DeviceDeleteResponse> {
  return apiRequest<DeviceDeleteResponse>(`/devices/${seg(deviceId)}`, {
    method: "DELETE",
    errorMessage: "ลบอุปกรณ์ไม่สำเร็จ",
  });
}

// Function ออก activation code ใหม่ให้ kiosk/barrier gate และยกเลิก token เก่า (POST /api/devices/:deviceId/activation-code)
function issueActivationCode(deviceId: string): Promise<DeviceActivationCodeResponse> {
  return apiRequest<DeviceActivationCodeResponse>(`/devices/${seg(deviceId)}/activation-code`, {
    method: "POST",
    errorMessage: "สร้าง Activation Code ใหม่ไม่สำเร็จ",
  });
}

// Function ผูกกล้องกับ barrier gate ทีละตัว (PUT /api/devices/:deviceId/cameras/:cameraId)
function mapCamera(deviceId: string, cameraId: string): Promise<DeviceMappingResponse> {
  return apiRequest<DeviceMappingResponse>(`/devices/${seg(deviceId)}/cameras/${seg(cameraId)}`, {
    method: "PUT",
    errorMessage: "ผูกกล้องไม่สำเร็จ",
  });
}

// Function ถอดกล้องออกจากอุปกรณ์ (DELETE /api/devices/:deviceId/cameras/:cameraId)
function unmapCamera(deviceId: string, cameraId: string): Promise<DeviceMappingResponse> {
  return apiRequest<DeviceMappingResponse>(`/devices/${seg(deviceId)}/cameras/${seg(cameraId)}`, {
    method: "DELETE",
    errorMessage: "ถอดกล้องไม่สำเร็จ",
  });
}

// Function ผูก printer กับ kiosk/barrier gate ทีละตัว (PUT /api/devices/:deviceId/printers/:printerId)
function mapPrinter(deviceId: string, printerId: string): Promise<DeviceMappingResponse> {
  return apiRequest<DeviceMappingResponse>(`/devices/${seg(deviceId)}/printers/${seg(printerId)}`, {
    method: "PUT",
    errorMessage: "ผูกเครื่องพิมพ์ไม่สำเร็จ",
  });
}

// Function ถอด printer ออกจากอุปกรณ์ (DELETE /api/devices/:deviceId/printers/:printerId)
function unmapPrinter(deviceId: string, printerId: string): Promise<DeviceMappingResponse> {
  return apiRequest<DeviceMappingResponse>(`/devices/${seg(deviceId)}/printers/${seg(printerId)}`, {
    method: "DELETE",
    errorMessage: "ถอดเครื่องพิมพ์ไม่สำเร็จ",
  });
}

export { getDevices, subscribeDeviceEvents, createDevice, updateDevice, deleteDevice, issueActivationCode, mapCamera, unmapCamera, mapPrinter, unmapPrinter };
