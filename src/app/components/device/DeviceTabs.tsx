"use client";
// Import Library
import { useEffect, useMemo, type JSX } from "react";
// Import Auth
import { hasPermission, useCurrentUser } from "@/src/app/lib/auth/permissions";
// Import Types
import type { DeviceTabsProps } from "@/src/app/type/ui/device";
import type { SettingMenuItem } from "@/src/app/type/ui/navigation";

// Config แท็บของหน้า device และ permission ที่ต้องมี
const menuItems: SettingMenuItem[] = [
        {
            key: "device",
            label: "การตั้งค่าอุปกรณ์",
            permission: "devices",
        },
        {
            key: "pricing",
            label: "กำหนดค่าบริการ",
            permission: "pricing",
        },
        {
            key: "channels",
            label: "ช่องทางการชำระค่าบริการ",
            permission: "pricing",
        },
        {
            key: "theme",
            label: "ธีม",
            permission: "theme",
        },
    ];

// Function แถบแท็บของหน้า device แสดงเฉพาะแท็บที่มีสิทธิ์
function DeviceTabs({ activeTab, onChange }: DeviceTabsProps): JSX.Element | null {
    const user = useCurrentUser();

    const visibleMenuItems = useMemo(
        () => menuItems.filter((item) => hasPermission(user, item.permission)),
        [user]
    );

    useEffect(() => {
        if (visibleMenuItems.length === 0) return;

        const canUseActiveTab = visibleMenuItems.some(
            (item) => item.key === activeTab
        );

        if (!canUseActiveTab) {
            onChange(visibleMenuItems[0].key);
        }
    }, [activeTab, onChange, visibleMenuItems]);

    if (visibleMenuItems.length === 0) return null;

    return (
        <div className="mt-6 flex w-full flex-col gap-2 rounded-xl bg-[#E3E5E8] p-2 md:inline-flex md:w-auto md:flex-row">
            {visibleMenuItems.map((item) => {
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

export { DeviceTabs };
