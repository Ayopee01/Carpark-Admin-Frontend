/* -------------------------------------- Theme Types -------------------------------------- */

// Type สีและโลโก้ของระบบ
export interface Theme {
  themeColor: string | null;
  logoUrl: string | null; // เช่น /uploads/logo-....png
  themeMode: string; // เช่น theme1 | custom | ""
  customThemeColor: string | null;
  updatedAt?: string;
  configUpdatedAt: string | null;
}

// Type body ของ PUT /theme
export interface ThemeUpdateRequest {
  themeColor?: string | null;
  logoUrl?: string | null;
  themeMode?: string;
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
