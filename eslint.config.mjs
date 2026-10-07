// Import Library
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Config ของ ESLint ตาม eslint-config-next
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // กฎใหม่ของ eslint-config-next 16.4 ยังเป็น warning จนกว่าจะแก้ setState ใน useEffect ที่มีอยู่ (21 จุด)
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
