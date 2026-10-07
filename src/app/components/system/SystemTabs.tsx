"use client";
// Import Library
import type { JSX } from "react";
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
        <div className="mt-6 flex w-full flex-col gap-2 rounded-xl bg-[#E3E5E8] p-2 md:inline-flex md:w-auto md:flex-row">
            {menuItems.map((item) => {
                const isActive = item.key === activeTab;

                return (
                    <button
                        key={item.key}
                        type="button"
                        onClick={() => onChange(item.key)}
                        className={`w-full rounded-lg px-4 py-3 text-left text-[13px] font-semibold transition md:w-auto md:text-center ${isActive
                            ? "bg-white text-[#1F2933] shadow-sm"
                            : "text-[#1F2933] hover:bg-white/70"
                            }`}
                    >
                        {item.label}
                    </button>
                );
            })}
        </div>
    );
}

export { SystemTabs };
