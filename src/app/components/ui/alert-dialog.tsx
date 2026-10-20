"use client"
// Import Library
import * as React from "react";
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
// Import Shared
import { cn } from "@/src/app/lib/shared/utils";

// ไฟล์นี้เป็น AlertDialog แบบ shadcn บน Radix AlertDialog (animation จาก tw-animate-css)
// ใช้ถามยืนยันก่อนทำสิ่งที่ย้อนกลับไม่ได้ (คลิกฉากหลังไม่ปิด ต้องกด ยกเลิก/ยืนยัน หรือ Escape)

// Function กล่อง alert dialog
function AlertDialog({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Root>): React.JSX.Element {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
}

// Function เนื้อหาของ alert dialog พร้อมฉากหลัง
function AlertDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>): React.JSX.Element {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay
        data-slot="dialog-overlay"
        className="fixed inset-0 z-[1001] flex items-center justify-center bg-[#26313C]/75 px-4 py-6 backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
      >
        <AlertDialogPrimitive.Content
          data-slot="dialog-content"
          className={cn(
            "relative w-full max-w-[440px] rounded-[14px] bg-white p-6 shadow-2xl outline-none sm:p-8 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        >
          {children}
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Overlay>
    </AlertDialogPrimitive.Portal>
  )
}

// Function หัวข้อของ alert dialog
function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>): React.JSX.Element {
  return <AlertDialogPrimitive.Title data-slot="alert-dialog-title" className={cn("text-[20px] font-bold text-[#061D36]", className)} {...props} />
}

// Function คำอธิบายของ alert dialog
function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>): React.JSX.Element {
  return <AlertDialogPrimitive.Description data-slot="alert-dialog-description" className={cn("mt-2 whitespace-pre-line text-[14px] leading-6 text-[#374151]", className)} {...props} />
}

// Function ปุ่มยกเลิก (ปิด dialog)
function AlertDialogCancel({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>): React.JSX.Element {
  return (
    <AlertDialogPrimitive.Cancel
      data-slot="alert-dialog-cancel"
      className={cn("h-11 min-w-[110px] rounded-full bg-[#9CA3AF] px-6 text-[14px] font-bold text-white", className)}
      {...props}
    />
  )
}

// Function ปุ่มยืนยัน (ปิด dialog)
function AlertDialogAction({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action>): React.JSX.Element {
  return (
    <AlertDialogPrimitive.Action
      data-slot="alert-dialog-action"
      className={cn("h-11 min-w-[110px] rounded-full bg-[#061D36] px-6 text-[14px] font-bold text-white", className)}
      {...props}
    />
  )
}

export { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle };
