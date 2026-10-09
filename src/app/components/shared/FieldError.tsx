// Import Library
import type { JSX } from "react";
// Import Shared
import { cn } from "@/src/app/lib/shared/utils";

// Function แสดงข้อความ error ใต้ช่องกรอก (ไม่มีข้อความ = ไม่แสดง, className ทับระยะห่างเดิมได้)
function FieldError({ message, className = "" }: { message?: string; className?: string }): JSX.Element | null {
    return message ? <p className={cn("mt-1 text-[12px] text-red-600", className)}>{message}</p> : null;
}

export { FieldError };
