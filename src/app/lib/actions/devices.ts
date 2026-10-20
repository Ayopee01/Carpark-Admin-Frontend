"use server";
// Import Data
import * as devicesData from "@/src/app/lib/data/devices";
// Import Server
import { runAction } from "@/src/app/lib/server/action";
// Import Types
import type { ActionResult } from "@/src/app/type/api/common";
import type { ActivationCodeResponse, CreateActivationDeviceRequest, CreateCredentialedDeviceRequest, CreateDeviceRequest, CreateDeviceResponse, CreateEdcDeviceRequest, CredentialedDeviceResponse, DeviceActivationCodeResponse, DeviceDeleteResponse, DeviceUpdateRequest, DeviceUpdateResponse, EdcDeviceResponse } from "@/src/app/type/api/devices";

// Server Action สร้างอุปกรณ์ deviceType เป็นตัวกำหนดรูปแบบ response
async function createDevice(body: CreateActivationDeviceRequest): Promise<ActionResult<ActivationCodeResponse>>;
async function createDevice(body: CreateCredentialedDeviceRequest): Promise<ActionResult<CredentialedDeviceResponse>>;
async function createDevice(body: CreateEdcDeviceRequest): Promise<ActionResult<EdcDeviceResponse>>;
async function createDevice(body: CreateDeviceRequest): Promise<ActionResult<CreateDeviceResponse>>;
async function createDevice(body: CreateDeviceRequest): Promise<ActionResult<CreateDeviceResponse>> {
  return runAction(() => devicesData.createDevice(body));
}

// Server Action แก้ไขข้อมูลอุปกรณ์
async function updateDevice(deviceId: string, body: DeviceUpdateRequest): Promise<ActionResult<DeviceUpdateResponse>> {
  return runAction(() => devicesData.updateDevice(deviceId, body));
}

// Server Action ลบอุปกรณ์
async function deleteDevice(deviceId: string): Promise<ActionResult<DeviceDeleteResponse>> {
  return runAction(() => devicesData.deleteDevice(deviceId));
}

// Server Action ออก activation code ใหม่ให้ kiosk/barrier gate และยกเลิก token เก่า
async function issueActivationCode(deviceId: string): Promise<ActionResult<DeviceActivationCodeResponse>> {
  return runAction(() => devicesData.issueActivationCode(deviceId));
}

export { createDevice, updateDevice, deleteDevice, issueActivationCode };
