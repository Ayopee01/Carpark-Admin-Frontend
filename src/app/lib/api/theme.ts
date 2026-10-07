// Import Types
import type { Theme, ThemeLogoDeleteResponse, ThemeLogoUploadResponse, ThemeUpdateRequest, ThemeUpdateResponse } from "@/src/app/type/api/theme";
// Import Shared
import { apiRequest, backendUrl } from "@/src/app/lib/shared/http";

// Function ดึงสีและโลโก้ล่าสุด (GET /api/theme)
function getTheme(): Promise<Theme> {
  return apiRequest<Theme>("/theme", { errorMessage: "โหลดข้อมูลธีมไม่สำเร็จ" });
}

// Function บันทึกสีของธีม (PUT /api/theme)
function updateTheme(body: ThemeUpdateRequest): Promise<ThemeUpdateResponse> {
  return apiRequest<ThemeUpdateResponse>("/theme", { method: "PUT", body, errorMessage: "บันทึกธีมไม่สำเร็จ" });
}

// Function อัปโหลดโลโก้ผ่าน field logo ไฟล์ jpg/png/webp ไม่เกิน 2 MB (POST /api/theme/logo)
function uploadLogo(file: File): Promise<ThemeLogoUploadResponse> {
  const body = new FormData();
  body.append("logo", file);
  return apiRequest<ThemeLogoUploadResponse>("/theme/logo", {
    method: "POST",
    body,
    errorMessage: "อัปโหลดโลโก้ไม่สำเร็จ",
  });
}

// Function ลบโลโก้ (DELETE /api/theme/logo)
function deleteLogo(): Promise<ThemeLogoDeleteResponse> {
  return apiRequest<ThemeLogoDeleteResponse>("/theme/logo", { method: "DELETE", errorMessage: "ลบโลโก้ไม่สำเร็จ" });
}

// Function แปลง path /uploads ของ backend เป็น URL เต็ม ส่วน URL เต็ม/data/blob คืนตามเดิม
function resolveLogoUrl(logoUrl: string | null | undefined): string | null {
  if (!logoUrl) return null;
  if (/^(https?:|data:|blob:)/i.test(logoUrl)) return logoUrl;
  return backendUrl(logoUrl);
}

export { getTheme, updateTheme, uploadLogo, deleteLogo, resolveLogoUrl };
