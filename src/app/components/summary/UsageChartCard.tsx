"use client";
// Import Library
import type { JSX } from "react";
// Import Types
import type { UsageChartCardProps } from "@/src/app/type/ui/summary";
import type { UsageChartItem, UsageChartMode } from "@/src/app/type/api/overview";

// Config จำนวนแท่งสูงสุด (โหมดรายปีแสดงเฉพาะปีล่าสุด)
const MAX_VISIBLE_BARS = 12;

// Function แปลงวันที่เป็นข้อความสั้นสำหรับป้ายกราฟ
function formatShortDate(value?: string): string {
    if (!value) return "";
    const [, month, day] = value.split("-");
    return month && day ? `${Number(day)}/${Number(month)}` : value;
}

// Function สร้าง key ของแท่งกราฟตาม field ของโหมดนั้น
function getItemKey(item: UsageChartItem, index: number): string {
    if ("date" in item) return item.date;
    if ("startDate" in item) return item.startDate;
    if ("month" in item) return item.month;
    if ("year" in item) return String(item.year);
    return `${(item as { label: string }).label}-${index}`;
}

// Function สร้างข้อความ tooltip ของแท่งกราฟตามโหมด
function getItemHint(item: UsageChartItem, mode?: UsageChartMode): string {
    if (mode === "daily" && "date" in item) return formatShortDate(item.date);
    if (mode === "weekly" && "startDate" in item) {
        return `${formatShortDate(item.startDate)} - ${formatShortDate(item.endDate)}`;
    }
    return "";
}

// Function กราฟแท่งจำนวนการใช้งานตามช่วงเวลา
function UsageChartCard({
    title = "สถิติการใช้งานของผู้ใช้",
    description = "ข้อมูลแสดงจำนวนผู้เข้าใช้บริการ",
    badgeLabel = "มีการใช้",
    mode,
    items,
}: UsageChartCardProps): JSX.Element {
    const visibleItems = items.slice(-MAX_VISIBLE_BARS);
    const hiddenCount = items.length - visibleItems.length;
    const maxValue = Math.max(...visibleItems.map((item) => item.value), 1);

    return (
        <article className="min-w-0 rounded-[18px] border border-[#E5E7EB] bg-white p-5 md:p-6">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h3 className="text-[18px] font-bold text-[#1F2937]">{title}</h3>
                    <p className="mt-1 text-[12px] text-[#667085]">{description}</p>
                </div>

                <div className="inline-flex items-center gap-2 text-[12px] font-medium text-[#667085]">
                    <span className="h-2 w-2 rounded-full bg-[#8EC0F4]" />
                    {badgeLabel}
                </div>
            </div>

            {visibleItems.length === 0 ? (
                <div className="flex min-h-[260px] items-center justify-center text-[14px] text-[#98A2B3]">
                    ไม่มีข้อมูลกราฟ
                </div>
            ) : (
                <>
                    <div className="space-y-3 md:hidden">
                        {visibleItems.map((item, index) => {
                            const percent = item.value > 0 ? Math.max(4, (item.value / maxValue) * 100) : 0;
                            const hint = getItemHint(item, mode);

                            return (
                                <div
                                    key={getItemKey(item, index)}
                                    className="grid min-w-0 grid-cols-[88px_minmax(0,1fr)_44px] items-center gap-3"
                                >
                                    <span className="min-w-0 text-[12px] font-medium leading-tight text-[#667085]">
                                        <span className="block truncate">{item.label}</span>
                                        {hint ? <span className="block truncate text-[10px] text-[#98A2B3]">{hint}</span> : null}
                                    </span>
                                    <div className="h-7 min-w-0 rounded-full bg-[#EEF2F6]">
                                        <div
                                            className="h-full rounded-full bg-[#8EC0F4]"
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>
                                    <span className="text-right text-[12px] font-bold text-[#1F2937]">
                                        {item.value}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    <div className="hidden md:block">
                        <div className="flex h-[260px] items-end gap-3 border-b border-[#E5E7EB] px-2 pt-6">
                            {visibleItems.map((item, index) => {
                                const percent = (item.value / maxValue) * 100;

                                return (
                                    <div
                                        key={getItemKey(item, index)}
                                        className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                                        title={`${item.label}: ${item.value}`}
                                    >
                                        <span className="mb-1 text-[11px] font-bold text-[#1F2937]">
                                            {item.value}
                                        </span>
                                        <div
                                            className="w-full max-w-[56px] rounded-t-md bg-[#8EC0F4]"
                                            style={{ height: `${percent}%`, minHeight: item.value > 0 ? 4 : 0 }}
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-2 flex gap-3 px-2">
                            {visibleItems.map((item, index) => {
                                const hint = getItemHint(item, mode);

                                return (
                                    <div
                                        key={getItemKey(item, index)}
                                        className="min-w-0 flex-1 text-center text-[11px] leading-tight text-[#667085]"
                                    >
                                        <span className="block truncate">{item.label}</span>
                                        {hint ? <span className="block truncate text-[10px] text-[#98A2B3]">{hint}</span> : null}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {hiddenCount > 0 ? (
                        <p className="mt-3 text-[12px] text-[#98A2B3]">
                            แสดง {visibleItems.length} ช่วงล่าสุด (ซ่อน {hiddenCount} ช่วงก่อนหน้า)
                        </p>
                    ) : null}
                </>
            )}
        </article>
    );
}

export { UsageChartCard };
