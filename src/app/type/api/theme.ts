/* -------------------------------------- Theme Types -------------------------------------- */

// Type ธีมที่บันทึกได้ ("" = ยังไม่เลือก ค่าเริ่มต้น)
export type ThemeModeValue = "" | "theme1" | "theme2" | "theme3" | "custom";

// Type สีและโลโก้ของระบบ
export interface Theme {
  themeColor: string | null; // สีแบบ #RRGGBB
  logoUrl: string | null; // เช่น /uploads/logo-....png
  themeMode: ThemeModeValue;
  customThemeColor: string | null; // สีแบบ #RRGGBB
  updatedAt: string | null; // null จนกว่าจะบันทึกครั้งแรก
  configUpdatedAt: string | null;
}

// Type body ของ PUT /theme
export interface ThemeUpdateRequest {
  themeColor?: string | null;
  logoUrl?: string | null;
  themeMode?: ThemeModeValue;
  customThemeColor?: string | null;
}

// Type response ของ PUT /theme
export interface ThemeUpdateResponse {
  message: "Theme updated";
  theme: Theme;
}

// Type response ของ POST /theme/logo
export interface ThemeLogoUploadResponse {
  message: string;
  logoUrl: string;
  theme: Theme;
}

// Type response ของ DELETE /theme/logo
export interface ThemeLogoDeleteResponse {
  message: string;
  theme: Theme;
}
