"use server";
// Import Data
import * as systemSettingsData from "@/src/app/lib/data/system-settings";
// Import Server
import { runAction } from "@/src/app/lib/server/action";
// Import Types
import type { ActionResult } from "@/src/app/type/api/common";
import type { SystemSettingsUpdateRequest, SystemSettingsUpdateResponse } from "@/src/app/type/api/system-settings";

// Server Action บันทึกการตั้งค่าระบบเฉพาะส่วนที่ส่ง (ได้แค่ success/message ต้องโหลดใหม่)
async function updateSystemSettings(body: SystemSettingsUpdateRequest): Promise<ActionResult<SystemSettingsUpdateResponse>> {
  return runAction(() => systemSettingsData.updateSystemSettings(body));
}

// Server Action บันทึกเฉพาะการตั้งค่าใบเสร็จ
async function updateReceiptSettings(receipt: NonNullable<SystemSettingsUpdateRequest["receipt"]>): Promise<ActionResult<SystemSettingsUpdateResponse>> {
  return runAction(() => systemSettingsData.updateReceiptSettings(receipt));
}

export { updateSystemSettings, updateReceiptSettings };
