// Import Library
import type { NextConfig } from "next";

// Config ของ Next.js (standalone = build เป็น server.js ที่รันใน Docker ได้โดยไม่ต้องมี node_modules ทั้งหมด)
const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
};

export default nextConfig;
