// Import Library
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
// Import Types
import type { FieldErrors } from "@/src/app/type/api/common";
// Import Shared
import { getFieldErrors } from "@/src/app/lib/shared/http";

// ไฟล์นี้รวม helper ของฟอร์ม (react-hook-form) ฝั่ง browser

// Function ใส่ error แยกช่องเข้าฟอร์ม fieldMap = ชื่อ field ของ backend ที่ไม่ตรงกับชื่อช่องในฟอร์ม เช่น { username: "email" }
function applyFieldErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  fields: FieldErrors,
  fieldMap: Partial<Record<string, Path<T>>> = {}
): void {
  Object.entries(fields).forEach(([field, message]) => {
    if (!message) return;
    setError(fieldMap[field] ?? (field as Path<T>), { type: "server", message });
  });
}

// Function ใส่ error แยกช่องจาก backend (VALIDATION_ERROR) เข้าฟอร์ม
function applyServerErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  error: unknown,
  fieldMap: Partial<Record<string, Path<T>>> = {}
): void {
  applyFieldErrors(setError, getFieldErrors(error), fieldMap);
}

export { applyFieldErrors, applyServerErrors };
