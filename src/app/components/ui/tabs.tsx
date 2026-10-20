"use client"
// Import Library
import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
// Import Shared
import { cn } from "@/src/app/lib/shared/utils";

// ไฟล์นี้เป็น Tabs แบบ shadcn บน Radix Tabs (ปุ่มลูกศรเลื่อน tab, aria ของ tab/tabpanel)
// หน้าตาของแถบและปุ่มกำหนดจาก className ของแต่ละที่ ปุ่มที่เลือกอยู่มี data-state="active"

// Function กล่อง tabs
function Tabs({
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>): React.JSX.Element {
  return <TabsPrimitive.Root data-slot="tabs" {...props} />
}

// Function แถบปุ่ม tab
function TabsList({
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>): React.JSX.Element {
  return <TabsPrimitive.List data-slot="tabs-list" {...props} />
}

// Function ปุ่ม tab หนึ่งปุ่ม
function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>): React.JSX.Element {
  return <TabsPrimitive.Trigger data-slot="tabs-trigger" className={cn("outline-none", className)} {...props} />
}

// Function เนื้อหาของ tab (render เฉพาะ tab ที่เลือก)
function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>): React.JSX.Element {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn("outline-none", className)} {...props} />
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
