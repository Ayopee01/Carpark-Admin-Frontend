"use client"
// Import Library
import * as React from "react";
import { Dialog as SheetPrimitive } from "radix-ui";
// Import Shared
import { cn } from "@/src/app/lib/shared/utils";

// ไฟล์นี้เป็น Sheet แบบ shadcn บน Radix Dialog เลื่อนออกจากขอบซ้ายหรือขวา (animation จาก tw-animate-css)
// Radix ค้าง element ไว้จน animation ตอนปิดเล่นจบ และจัดการ focus, Escape, คลิกนอก และล็อก scroll ให้

// Function กล่อง sheet
function Sheet({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Root>): React.JSX.Element {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

// Function ปุ่มที่ปิด sheet
function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>): React.JSX.Element {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

// Config ตำแหน่งและทิศที่เลื่อนของแต่ละด้าน
const SHEET_SIDE_CLASSES = {
  right: "right-0 data-open:slide-in-from-right data-closed:slide-out-to-right",
  left: "left-0 data-open:slide-in-from-left data-closed:slide-out-to-left",
};

// Function เนื้อหาของ sheet พร้อมฉากหลัง เลื่อนเข้าจากขอบตอนเปิดและเลื่อนออกตอนปิด
function SheetContent({
  side = "right",
  className,
  children,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & { side?: keyof typeof SHEET_SIDE_CLASSES }): React.JSX.Element {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay
        data-slot="sheet-overlay"
        className="fixed inset-0 z-[900] bg-[#26313C]/60 backdrop-blur-[2px] data-open:animate-in data-open:fade-in-0 data-open:duration-300 data-closed:animate-out data-closed:fade-out-0 data-closed:duration-200"
      />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "fixed inset-y-0 z-[900] flex h-full w-full flex-col shadow-2xl outline-none ease-out data-open:animate-in data-open:duration-300 data-closed:animate-out data-closed:duration-200 data-closed:ease-in",
          SHEET_SIDE_CLASSES[side],
          className
        )}
        {...props}
      >
        {children}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  )
}

// Function หัวข้อของ sheet (Radix ใช้เป็นชื่อของ dialog สำหรับ screen reader)
function SheetTitle({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>): React.JSX.Element {
  return <SheetPrimitive.Title data-slot="sheet-title" {...props} />
}

// Function คำอธิบายของ sheet
function SheetDescription({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>): React.JSX.Element {
  return <SheetPrimitive.Description data-slot="sheet-description" {...props} />
}

export { Sheet, SheetClose, SheetContent, SheetTitle, SheetDescription };
