import "server-only";
// Import Types
import type { Theme, ThemeLogoDeleteResponse, ThemeLogoUploadResponse, ThemeUpdateRequest, ThemeUpdateResponse } from "@/src/app/type/api/theme";
// Import Server
import { backendJson } from "@/src/app/lib/server/backend";

// Function ดึงสีและโลโก้ล่าสุด (GET /api/theme)
function getTheme(): Promise<Theme> {
  return backendJson<Theme>("/theme", { errorMessage: "โหลดข้อมูลธีมไม่สำเร็จ" });
}

// Function บันทึกสีของธีม (PUT /api/theme)
function updateTheme(body: ThemeUpdateRequest): Promise<ThemeUpdateResponse> {
  return backendJson<ThemeUpdateResponse>("/theme", { method: "PUT", body, errorMessage: "บันทึกธีมไม่สำเร็จ" });
}

// Function อัปโหลดโลโก้ผ่าน field logo ไฟล์ jpg/png/webp ไม่เกิน 2 MB (POST /api/theme/logo)
function uploadLogo(file: File): Promise<ThemeLogoUploadResponse> {
  const body = new FormData();
  body.append("logo", file);
  return backendJson<ThemeLogoUploadResponse>("/theme/logo", {
    method: "POST",
    body,
    errorMessage: "อัปโหลดโลโก้ไม่สำเร็จ",
  });
}

// Function ลบโลโก้ (DELETE /api/theme/logo)
function deleteLogo(): Promise<ThemeLogoDeleteResponse> {
  return backendJson<ThemeLogoDeleteResponse>("/theme/logo", { method: "DELETE", errorMessage: "ลบโลโก้ไม่สำเร็จ" });
}

export { getTheme, updateTheme, uploadLogo, deleteLogo };
