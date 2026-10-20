"use client"
// Import Library
import * as React from "react";
import { Toggle as TogglePrimitive } from "radix-ui";
// Import Shared
import { cn } from "@/src/app/lib/shared/utils";

// ไฟล์นี้เป็น Toggle แบบ shadcn บน Radix Toggle ปุ่มกดเปิด/ปิด (aria-pressed, data-state="on" | "off")

// Function ปุ่มเปิด/ปิด หน้าตากำหนดจาก className ของแต่ละที่
function Toggle({
  className,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root>): React.JSX.Element {
  return <TogglePrimitive.Root data-slot="toggle" className={cn("outline-none focus-visible:ring-2 focus-visible:ring-[#061D36]/30", className)} {...props} />
}

export { Toggle };
