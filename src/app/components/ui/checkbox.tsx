"use client"
// Import Library
import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { Check } from "lucide-react";
// Import Shared
import { cn } from "@/src/app/lib/shared/utils";

// ไฟล์นี้เป็น Checkbox แบบ shadcn บน Radix Checkbox (เป็นปุ่ม กดผ่าน label ที่ครอบอยู่ได้)

// Function ช่องติ๊ก ใช้ checked + onCheckedChange แทน onChange ของ input
function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>): React.JSX.Element {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-[#9CA3AF] bg-white text-white outline-none transition focus-visible:ring-2 focus-visible:ring-[#061D36]/30 disabled:cursor-not-allowed disabled:opacity-60 data-[state=checked]:border-[#061D36] data-[state=checked]:bg-[#061D36]",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className="flex items-center justify-center">
        <Check className="size-3.5" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox };
