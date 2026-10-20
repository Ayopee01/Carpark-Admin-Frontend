"use client"
// Import Library
import * as React from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

// ไฟล์นี้เป็น Toaster แบบ shadcn บน sonner วางครั้งเดียวที่ root layout แล้วเรียก toast.success()/toast.error() จากที่ไหนก็ได้
// z-index ของ sonner สูงกว่า Dialog/AlertDialog อยู่แล้ว

// Function กล่องแสดง toast ของทั้งเว็บ
function Toaster({ ...props }: ToasterProps): React.JSX.Element {
  return (
    <Sonner
      position="top-right"
      richColors
      closeButton
      duration={4000}
      toastOptions={{
        style: { fontFamily: "var(--font-inter), var(--font-thai), system-ui, sans-serif", fontSize: 14 },
      }}
      {...props}
    />
  )
}

export { Toaster };
