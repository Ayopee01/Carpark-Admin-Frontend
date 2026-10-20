"use server";
// Import Data
import * as themeData from "@/src/app/lib/data/theme";
// Import Server
import { runAction } from "@/src/app/lib/server/action";
// Import Types
import type { ActionResult } from "@/src/app/type/api/common";
import type { ThemeLogoDeleteResponse, ThemeLogoUploadResponse, ThemeUpdateRequest, ThemeUpdateResponse } from "@/src/app/type/api/theme";
// Import Shared
import { toApiError } from "@/src/app/lib/shared/http";

// Server Action บันทึกสีของธีม
async function updateTheme(body: ThemeUpdateRequest): Promise<ActionResult<ThemeUpdateResponse>> {
  return runAction(() => themeData.updateTheme(body));
}

// Server Action อัปโหลดโลโก้จาก FormData field logo (ขนาดไฟล์และชนิด backend ตรวจ)
async function uploadLogo(formData: FormData): Promise<ActionResult<ThemeLogoUploadResponse>> {
  return runAction(() => {
    const file = formData.get("logo");
    if (!(file instanceof File)) {
      throw toApiError(400, { code: "LOGO_FILE_REQUIRED", message: "Logo file is required" }, "กรุณาเลือกไฟล์โลโก้");
    }
    return themeData.uploadLogo(file);
  });
}

// Server Action ลบโลโก้
async function deleteLogo(): Promise<ActionResult<ThemeLogoDeleteResponse>> {
  return runAction(() => themeData.deleteLogo());
}

export { updateTheme, uploadLogo, deleteLogo };
