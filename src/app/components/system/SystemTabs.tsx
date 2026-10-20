"use client";
// Import Library
import type { JSX } from "react";
// Import Components
import { Tabs, TabsList, TabsTrigger } from "@/src/app/components/ui/tabs";
// Import Types
import type { SystemTabsProps } from "@/src/app/type/ui/system";
import type { SystemMenuItem } from "@/src/app/type/ui/navigation";

// Config แท็บของหน้า system
const menuItems: SystemMenuItem[] = [
        {
            key: "device",
            label: "ตั้งค่าอุปกรณ์",
        },
        {
            key: "entry_bill",
            label: "ใบ Bill เข้าใช้บริการ",
        },
        {
            key: "paid_bill",
            label: "ใบ Bill หลังชำระ",
        },
    ];

// Function แถบแท็บของหน้า system
function SystemTabs({ activeTab, onChange }: SystemTabsProps): JSX.Element {
    return (
        // ปุ่มลูกศรเลื่อน tab ได้ เนื้อหาของ tab render ที่ SystemView ตาม activeTab
        <Tabs value={activeTab} onValueChange={(value) => onChange(value as typeof activeTab)}>
            <TabsList className="mt-6 flex w-full flex-col gap-2 rounded-xl bg-[#E3E5E8] p-2 md:inline-flex md:w-auto md:flex-row">
                {menuItems.map((item) => (
                    <TabsTrigger key={item.key} value={item.key} className="w-full rounded-lg px-4 py-3 text-left text-[13px] font-semibold text-[#1F2933] transition hover:bg-white/70 data-[state=active]:bg-white data-[state=active]:shadow-sm md:w-auto md:text-center">
                        {item.label}
                    </TabsTrigger>
                ))}
            </TabsList>
        </Tabs>
    );
}

export { SystemTabs };
