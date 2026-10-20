import "server-only";
// Import Types
import type { ActivationCodeResponse, CreateActivationDeviceRequest, CreateCredentialedDeviceRequest, CreateDeviceRequest, CreateDeviceResponse, CreateEdcDeviceRequest, CredentialedDeviceResponse, DeviceActivationCodeResponse, DeviceDeleteResponse, DeviceListQuery, DeviceListResponse, DeviceUpdateRequest, DeviceUpdateResponse, EdcDeviceResponse } from "@/src/app/type/api/devices";
// Import Server
import { backendJson } from "@/src/app/lib/server/backend";
// Import Shared
import { seg } from "@/src/app/lib/shared/http";

// Function ดึงรายการอุปกรณ์พร้อมจำนวน online/offline (GET /api/devices)
function getDevices(query: DeviceListQuery = {}): Promise<DeviceListResponse> {
  return backendJson<DeviceListResponse>("/devices", { query: { ...query }, errorMessage: "โหลดข้อมูลอุปกรณ์ไม่สำเร็จ" });
}


// Function สร้างอุปกรณ์ deviceType เป็นตัวกำหนดรูปแบบ response (POST /api/devices)
function createDevice(body: CreateActivationDeviceRequest): Promise<ActivationCodeResponse>;
function createDevice(body: CreateCredentialedDeviceRequest): Promise<CredentialedDeviceResponse>;
function createDevice(body: CreateEdcDeviceRequest): Promise<EdcDeviceResponse>;
function createDevice(body: CreateDeviceRequest): Promise<CreateDeviceResponse>;
function createDevice(body: CreateDeviceRequest): Promise<CreateDeviceResponse> {
  return backendJson<CreateDeviceResponse>("/devices", {
    method: "POST",
    body,
    errorMessage: "สร้างอุปกรณ์ไม่สำเร็จ",
  });
}

// Function แก้ไขข้อมูลอุปกรณ์ (PUT /api/devices/:deviceId)
function updateDevice(deviceId: string, body: DeviceUpdateRequest): Promise<DeviceUpdateResponse> {
  return backendJson<DeviceUpdateResponse>(`/devices/${seg(deviceId)}`, {
    method: "PUT",
    body,
    errorMessage: "บันทึกข้อมูลอุปกรณ์ไม่สำเร็จ",
  });
}

// Function ลบอุปกรณ์ (DELETE /api/devices/:deviceId)
function deleteDevice(deviceId: string): Promise<DeviceDeleteResponse> {
  return backendJson<DeviceDeleteResponse>(`/devices/${seg(deviceId)}`, {
    method: "DELETE",
    errorMessage: "ลบอุปกรณ์ไม่สำเร็จ",
  });
}

// Function ออก activation code ใหม่ให้ kiosk/barrier gate และยกเลิก token เก่า (POST /api/devices/:deviceId/activation-code)
function issueActivationCode(deviceId: string): Promise<DeviceActivationCodeResponse> {
  return backendJson<DeviceActivationCodeResponse>(`/devices/${seg(deviceId)}/activation-code`, {
    method: "POST",
    errorMessage: "สร้าง Activation Code ใหม่ไม่สำเร็จ",
  });
}

export { getDevices, createDevice, updateDevice, deleteDevice, issueActivationCode };
