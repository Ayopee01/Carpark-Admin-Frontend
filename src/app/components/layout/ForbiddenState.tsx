// Import Library
import type { JSX } from "react";
// Import Types
import type { ForbiddenStateProps } from "@/src/app/type/ui/navigation";

// Function แสดงหน้าไม่มีสิทธิ์พร้อมรายชื่อ permission ที่ต้องมี
function ForbiddenState({ requiredPermissions }: ForbiddenStateProps): JSX.Element {
  return (
    <section className="flex min-h-screen items-center justify-center bg-gray-100 px-5">
      <div className="w-full max-w-xl rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-3xl font-bold text-slate-800">ไม่มีสิทธิ์เข้าถึง</h1>
        <p className="mt-3 text-sm text-slate-500">
          บัญชีนี้ไม่มีสิทธิ์สำหรับหน้านี้
          {requiredPermissions?.length ? ` (${requiredPermissions.join(" / ")})` : ""}
        </p>
      </div>
    </section>
  );
}

export { ForbiddenState };
