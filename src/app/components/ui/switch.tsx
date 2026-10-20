"use client"
// Import Library
import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";
// Import Shared
import { cn } from "@/src/app/lib/shared/utils";

// ไฟล์นี้เป็น Switch แบบ shadcn บน Radix Switch ใช้กับการเปิด/ปิดการตั้งค่า

// Function สวิตช์เปิด/ปิด ใช้ checked + onCheckedChange แทน onChange ของ input
function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>): React.JSX.Element {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent bg-[#9CA3AF] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#061D36]/30 disabled:cursor-not-allowed disabled:opacity-60 data-[state=checked]:bg-[#061D36]",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-5 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch };
