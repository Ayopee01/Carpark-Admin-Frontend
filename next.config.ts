// Import Library
import type { NextConfig } from "next";

// Config ของ Next.js (standalone = build เป็น server.js ที่รันใน Docker ได้โดยไม่ต้องมี node_modules ทั้งหมด)
// serverActions.bodySizeLimit = อัปโหลดโลโก้ผ่าน Server Action ได้ถึง 2MB (เผื่อ overhead ของ multipart)
const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "3mb",
    },
  },
};

export default nextConfig;
