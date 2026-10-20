"use client";
// Import Library
import type { JSX } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
// Import Types
import type { UsageChartCardProps, UsageChartRow, UsageChartTickProps } from "@/src/app/type/ui/summary";
import type { UsageChartItem, UsageChartMode } from "@/src/app/type/api/overview";

/* -------------------------------------- Config -------------------------------------- */

// Config จำนวนแท่งสูงสุด (โหมดรายปีแสดงเฉพาะปีล่าสุด)
const MAX_VISIBLE_BARS = 12;

// Config สีของกราฟ
const BAR_COLOR = "#8EC0F4";
const TRACK_COLOR = "#EEF2F6";

/* -------------------------------------- Helpers -------------------------------------- */

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

// Function สร้างข้อความใต้ป้ายของแท่งกราฟตามโหมด (วันที่ของรายวัน/รายสัปดาห์)
function getItemHint(item: UsageChartItem, mode?: UsageChartMode): string {
    if (mode === "daily" && "date" in item) return formatShortDate(item.date);
    if (mode === "weekly" && "startDate" in item) {
        return `${formatShortDate(item.startDate)} - ${formatShortDate(item.endDate)}`;
    }
    return "";
}

/* -------------------------------------- Component -------------------------------------- */

// Function กราฟแท่งจำนวนการใช้งานตามช่วงเวลา (มือถือแท่งแนวนอน, จอใหญ่แท่งแนวตั้ง)
function UsageChartCard({
    title = "สถิติการใช้งานของผู้ใช้",
    description = "ข้อมูลแสดงจำนวนผู้เข้าใช้บริการ",
    badgeLabel = "มีการใช้",
    mode,
    items,
}: UsageChartCardProps): JSX.Element {
    const visibleItems = items.slice(-MAX_VISIBLE_BARS);
    const hiddenCount = items.length - visibleItems.length;
    const rows: UsageChartRow[] = visibleItems.map((item, index) => ({
        key: getItemKey(item, index),
        label: item.label,
        hint: getItemHint(item, mode),
        value: item.value,
    }));

    // ป้ายใต้แท่ง: ชื่อช่วง และวันที่ (ถ้ามี) 2 บรรทัด
    function renderColumnTick({ x, y, payload }: UsageChartTickProps): JSX.Element {
        const row = rows.at(payload?.index ?? 0);
        return (
            <g transform={`translate(${x},${y})`}>
                <text y={12} textAnchor="middle" fontSize={11} fill="#667085">{row?.label}</text>
                {row?.hint ? <text y={26} textAnchor="middle" fontSize={10} fill="#98A2B3">{row.hint}</text> : null}
            </g>
        );
    }

    // ป้ายซ้ายของแท่งแนวนอน (มือถือ)
    function renderRowTick({ x, y, payload }: UsageChartTickProps): JSX.Element {
        const row = rows.at(payload?.index ?? 0);
        return (
            <g transform={`translate(${x},${y})`}>
                <text x={-84} y={row?.hint ? -2 : 4} fontSize={12} fill="#667085">{row?.label}</text>
                {row?.hint ? <text x={-84} y={11} fontSize={10} fill="#98A2B3">{row.hint}</text> : null}
            </g>
        );
    }

    const tooltip = (
        <Tooltip
            cursor={{ fill: "#F3F4F6" }}
            formatter={(value) => [value, badgeLabel]}
            labelFormatter={(_, payload) => {
                const row = payload[0]?.payload as UsageChartRow | undefined;
                return row ? [row.label, row.hint].filter(Boolean).join(" ") : "";
            }}
            contentStyle={{ borderRadius: 8, borderColor: "#E5E7EB", fontSize: 12 }}
        />
    );

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

            {rows.length === 0 ? (
                <div className="flex min-h-[260px] items-center justify-center text-[14px] text-[#98A2B3]">
                    ไม่มีข้อมูลกราฟ
                </div>
            ) : (
                <>
                    <div className="md:hidden" style={{ height: rows.length * 40 + 8 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 36, bottom: 4, left: 0 }}>
                                <XAxis type="number" hide domain={[0, "dataMax"]} />
                                <YAxis type="category" dataKey="key" width={92} axisLine={false} tickLine={false} tick={renderRowTick} />
                                {tooltip}
                                <Bar dataKey="value" fill={BAR_COLOR} radius={999} barSize={28} background={{ fill: TRACK_COLOR, radius: 999 }} isAnimationActive={false}>
                                    <LabelList dataKey="value" position="right" fontSize={12} fontWeight={700} fill="#1F2937" />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="hidden h-[300px] md:block">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={rows} margin={{ top: 20, right: 8, bottom: 0, left: 8 }}>
                                <CartesianGrid vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="key" interval={0} height={36} axisLine={{ stroke: "#E5E7EB" }} tickLine={false} tick={renderColumnTick} />
                                <YAxis hide allowDecimals={false} />
                                {tooltip}
                                <Bar dataKey="value" fill={BAR_COLOR} radius={[6, 6, 0, 0]} maxBarSize={56} minPointSize={(value) => (Number(value) > 0 ? 4 : 0)}>
                                    <LabelList dataKey="value" position="top" fontSize={11} fontWeight={700} fill="#1F2937" />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {hiddenCount > 0 ? (
                        <p className="mt-3 text-[12px] text-[#98A2B3]">
                            แสดง {rows.length} ช่วงล่าสุด (ซ่อน {hiddenCount} ช่วงก่อนหน้า)
                        </p>
                    ) : null}
                </>
            )}
        </article>
    );
}

export { UsageChartCard };
