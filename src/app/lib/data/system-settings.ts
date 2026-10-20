import "server-only";
// Import Types
import type { SystemSettings, SystemSettingsUpdateRequest, SystemSettingsUpdateResponse } from "@/src/app/type/api/system-settings";
// Import Server
import { backendJson } from "@/src/app/lib/server/backend";

// Function ดึงการตั้งค่าระบบรวมใบเสร็จและ printer (GET /api/system-settings)
function getSystemSettings(): Promise<SystemSettings> {
  return backendJson<SystemSettings>("/system-settings", { errorMessage: "โหลดข้อมูลตั้งค่าระบบไม่สำเร็จ" });
}

// Function บันทึกการตั้งค่าระบบเฉพาะส่วนที่ส่ง ได้แค่ success/message ต้องโหลดใหม่ (PUT /api/system-settings)
function updateSystemSettings(body: SystemSettingsUpdateRequest): Promise<SystemSettingsUpdateResponse> {
  return backendJson<SystemSettingsUpdateResponse>("/system-settings", {
    method: "PUT",
    body,
    errorMessage: "บันทึกข้อมูลตั้งค่าระบบไม่สำเร็จ",
  });
}

// Function บันทึกเฉพาะการตั้งค่าใบเสร็จ (PUT /api/system-settings)
function updateReceiptSettings(receipt: NonNullable<SystemSettingsUpdateRequest["receipt"]>): Promise<SystemSettingsUpdateResponse> {
  return updateSystemSettings({ receipt });
}

export { getSystemSettings, updateSystemSettings, updateReceiptSettings };
