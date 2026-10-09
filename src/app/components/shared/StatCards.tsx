// Import Library
import type { JSX } from "react";
// Import Types
import type { RevenueGroupCardProps, SummaryCardProps, ProgressBarProps } from "@/src/app/type/ui/shared";

/* -------------------------------------- Progress Bar -------------------------------------- */

// Function แถบแสดงสัดส่วนเป็นเปอร์เซ็นต์
function ProgressBar({
    value,
    colorClass = "bg-yellow-400",
    trackClass = "bg-white/75",
    heightClass = "h-[5px]",
}: ProgressBarProps): JSX.Element {
    const safeValue = Math.max(0, Math.min(100, value));

    return (
        <div
            className={`w-full overflow-hidden rounded-full ${trackClass} ${heightClass}`}
        >
            <div
                className={`h-full rounded-full ${colorClass}`}
                style={{ width: `${safeValue}%` }}
            />
        </div>
    );
}

/* -------------------------------------- Summary Card -------------------------------------- */

// Function การ์ดตัวเลขสรุปของ dashboard และหน้าภาพรวม
function SummaryCard({
    title,
    value,
    suffix,
    note,
    noteIcon,
    icon,
}: SummaryCardProps): JSX.Element {
    return (
        <article className="relative min-h-[138px] rounded-[8px] bg-[#E4E6E8] px-5 pb-4 pt-4 shadow-none">
            <div className="absolute inset-x-0 top-0 h-[4px] rounded-t-[8px] bg-[#1F2937]" />

            <div className="flex items-start justify-between">
                <p className="text-[11px] font-medium leading-[16px] text-[#5F6B76]">
                    {title}
                </p>

                <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-[#D9DDE1] text-[#1F2937]">
                    {icon}
                </div>
            </div>

            <div className="mt-7 flex items-end gap-2">
                <h3 className="text-[28px] font-bold leading-none tracking-[-0.03em] text-[#4B5563] md:text-[32px]">
                    {value}
                </h3>

                {suffix ? (
                    <span className="mb-[2px] text-[12px] font-medium text-[#6B7280]">
                        {suffix}
                    </span>
                ) : null}
            </div>

            <p className="mt-4 flex items-center gap-1.5 text-[11px] font-semibold leading-[16px] text-[#111827]">
                {noteIcon ? (
                    <span className="flex shrink-0 items-center justify-center">
                        {noteIcon}
                    </span>
                ) : null}

                <span>{note}</span>
            </p>
        </article>
    );
}

/* -------------------------------------- Revenue Group Card -------------------------------------- */

// Function การ์ดรายได้ตามกลุ่ม แสดงยอดเงินและเปอร์เซ็นต์
function RevenueGroupCard({
    title,
    description,
    amountText,
    percent,
    icon,
}: RevenueGroupCardProps): JSX.Element {
    return (
        <article className="rounded-[18px] bg-[#E4E6E8] px-5 pb-4 pt-4 shadow-none md:px-6 md:pb-5 md:pt-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-[6px] bg-[#F7F7F8] text-[#1F2937]">
                {icon}
            </div>

            <div className="mt-5">
                <h3 className="text-[18px] font-bold leading-[1.25] text-[#111827]">
                    {title}
                </h3>
                <p className="mt-1 text-[11px] font-medium leading-[16px] text-[#4B5563]">
                    {description}
                </p>
            </div>

            <div className="mt-10 flex items-end justify-between gap-3">
                <p className="text-[30px] font-medium leading-none tracking-[-0.03em] text-[#1F2937] md:text-[34px]">
                    {amountText}
                </p>
                <span className="text-[11px] font-bold leading-none text-[#111827]">
                    {percent}%
                </span>
            </div>

            <div className="mt-4">
                <ProgressBar
                    value={percent}
                    colorClass="bg-[#F2C744]"
                    trackClass="bg-white/80"
                    heightClass="h-[5px]"
                />
            </div>
        </article>
    );
}

export { ProgressBar, SummaryCard, RevenueGroupCard };
