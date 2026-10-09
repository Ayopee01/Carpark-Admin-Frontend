// Import Library
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Config ของ ESLint ตาม eslint-config-next
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // ห้าม ?? / ?. / เงื่อนไขกับค่าที่ type บอกว่ามีแน่นอน (ใช้ contract ของ backend ตรง ๆ ไม่เผื่อ)
      "@typescript-eslint/no-unnecessary-condition": "error",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
