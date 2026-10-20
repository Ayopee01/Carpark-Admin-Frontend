"use client"
// Import Library
import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
// Import Shared
import { cn } from "@/src/app/lib/shared/utils";

// ไฟล์นี้เป็น Dialog แบบ shadcn บน Radix Dialog (animation จาก tw-animate-css)
// Radix จัดการ Escape, focus, ล็อก scroll และค้าง element ไว้จน animation ตอนปิดเล่นจบ
// ฉากหลังห่อเนื้อหา (scrollable overlay) เนื้อหาที่สูงกว่าจอเลื่อนได้ และจัดกลางเหมือน modal เดิม

// Function กล่อง dialog
function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>): React.JSX.Element {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

// Function ปุ่มที่ปิด dialog
function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>): React.JSX.Element {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

// Function เนื้อหาของ dialog พร้อมฉากหลัง
// locked = ระหว่างบันทึก ปิดด้วย Escape/คลิกฉากหลังไม่ได้, closeOnOverlayClick = คลิกฉากหลังแล้วปิด (ฟอร์มไม่ปิด กันข้อมูลหาย)
function DialogContent({
  className,
  overlayClassName,
  locked = false,
  closeOnOverlayClick = false,
  onEscapeKeyDown,
  onInteractOutside,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  overlayClassName?: string;
  locked?: boolean;
  closeOnOverlayClick?: boolean;
}): React.JSX.Element {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        data-slot="dialog-overlay"
        className={cn(
          "fixed inset-0 z-[999] flex items-center justify-center overflow-y-auto px-4 py-6 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
          overlayClassName
        )}
      >
        <DialogPrimitive.Content
          data-slot="dialog-content"
          onEscapeKeyDown={(event) => {
            if (locked) event.preventDefault();
            onEscapeKeyDown?.(event);
          }}
          onInteractOutside={(event) => {
            if (locked || !closeOnOverlayClick) event.preventDefault();
            onInteractOutside?.(event);
          }}
          className={cn(
            "relative w-full outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        >
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Overlay>
    </DialogPrimitive.Portal>
  )
}

// Function หัวข้อของ dialog (Radix ใช้เป็นชื่อของ dialog สำหรับ screen reader)
function DialogTitle({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>): React.JSX.Element {
  return <DialogPrimitive.Title data-slot="dialog-title" {...props} />
}

// Function คำอธิบายของ dialog
function DialogDescription({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>): React.JSX.Element {
  return <DialogPrimitive.Description data-slot="dialog-description" {...props} />
}

export { Dialog, DialogClose, DialogContent, DialogTitle, DialogDescription };
