"use client";
// Import Library
import type { JSX } from "react";

// Function หน้าแสดงเมื่อโหลดข้อมูลฝั่ง server ไม่สำเร็จ (เช่นเชื่อมต่อ backend ไม่ได้) retry() โหลดจาก server ใหม่
function LandingError({ retry }: { error: Error & { digest?: string }; retry: () => void }): JSX.Element {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-[#EFEFEF] px-4 text-center">
      <p className="text-sm font-semibold text-slate-700">โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>
      <button type="button" onClick={() => retry()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white">
        ลองใหม่
      </button>
    </div>
  );
}

export default LandingError;
