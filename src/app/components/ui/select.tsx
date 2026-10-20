"use client"
// Import Library
import * as React from "react";
import { Select as SelectPrimitive } from "radix-ui";
import { Check, ChevronDown } from "lucide-react";
// Import Shared
import { cn } from "@/src/app/lib/shared/utils";

// ไฟล์นี้เป็น Select แบบ shadcn บน Radix Select (animation จาก tw-animate-css)

// Function กล่อง select
function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>): React.JSX.Element {
  return <SelectPrimitive.Root data-slot="select" {...props} />
}

// Function ข้อความค่าที่เลือก (ไม่มีค่า = placeholder)
function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>): React.JSX.Element {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

// Function ปุ่มที่เปิดรายการ (หน้าตากำหนดจาก className ของแต่ละที่)
function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>): React.JSX.Element {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "flex items-center justify-between gap-2 text-left outline-none disabled:cursor-not-allowed disabled:opacity-60 data-placeholder:text-[#9CA3AF] [&>span]:truncate",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="size-4 shrink-0 opacity-60" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

// Function รายการตัวเลือก (อยู่เหนือ dialog/sheet)
function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>): React.JSX.Element {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        position={position}
        className={cn(
          "relative z-[1000] max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) overflow-hidden rounded-md border border-[#E5E7EB] bg-white text-[14px] text-[#1F2933] shadow-md data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1",
          className
        )}
        {...props}
      >
        <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

// Function ตัวเลือกหนึ่งรายการ
function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>): React.JSX.Element {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full items-center rounded-sm py-2 pr-8 pl-3 outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-[#F3F4F6]",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <span className="absolute right-2 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  )
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
