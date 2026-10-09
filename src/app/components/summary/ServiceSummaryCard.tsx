"use client";
// Import Library
import type { JSX } from "react";
import { LuDoorOpen, LuMonitorSmartphone, LuQrCode, LuWalletCards } from "react-icons/lu";
// Import Types
import type { ServiceSummaryCardProps } from "@/src/app/type/ui/summary";
import type { OverviewServiceSummaryItem } from "@/src/app/type/api/overview";
// Import Shared
import { formatMoney } from "@/src/app/lib/shared/format";

// Function เลือกไอคอนตามรหัสบริการ
function getServiceIcon(icon: OverviewServiceSummaryItem["icon"]): JSX.Element {
    switch (icon) {
        case "cash":
            return <LuWalletCards size={16} />;
        case "qr":
            return <LuQrCode size={16} />;
        case "kiosk":
            return <LuMonitorSmartphone size={16} />;
        case "gate":
            return <LuDoorOpen size={16} />;
        default:
            return <LuWalletCards size={16} />;
    }
}

// Function การ์ดสรุปยอดเงินแยกตามบริการ
function ServiceSummaryCard({ items, totalAmount }: ServiceSummaryCardProps): JSX.Element {
    return (
        <article className="min-w-0 rounded-[18px] bg-[#E4E6E8] p-4 md:p-6">
            <h3 className="text-[16px] font-bold text-[#1F2937] sm:text-[18px]">
                สรุปรายได้ตามช่องทางบริการ
            </h3>

            <div className="mt-5 space-y-4">
                {items.map((item) => (
                    <div
                        key={item.id}
                        className="flex min-w-0 items-start gap-3"
                    >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[#F7F7F8] text-[#1F2937] sm:h-10 sm:w-10">
                            {getServiceIcon(item.icon)}
                        </div>

                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[14px] font-bold text-[#1F2937]">
                                {item.label}
                            </p>
                            <p className="mt-1 text-[11px] text-[#667085]">
                                {item.count} รายการ
                            </p>
                        </div>

                        <div className="shrink-0 basis-[76px] text-right sm:basis-auto">
                            <p className="whitespace-nowrap text-[13px] font-bold text-[#1F2937] sm:text-[14px]">
                                {formatMoney(item.amount)} ฿
                            </p>
                            <p className="mt-1 text-[11px] text-[#667085]">{item.percent}%</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 border-t border-[#CDD2D8] pt-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
                    <span className="text-[14px] font-semibold text-[#475467]">
                        รายได้รวมทั้งหมด
                    </span>
                    <span className="break-words text-[22px] font-extrabold leading-none text-[#1F2937] sm:text-[28px]">
                        {formatMoney(totalAmount)} ฿
                    </span>
                </div>
            </div>
        </article>
    );
}

export { ServiceSummaryCard };
