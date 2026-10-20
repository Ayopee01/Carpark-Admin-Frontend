// Import Library
import type { JSX } from "react";
// Import Components
import { ProgressBar } from "@/src/app/components/shared/StatCards";
// Import Types
import type { ChannelCardProps } from "@/src/app/type/ui/dashboard";

// Function การ์ดยอดเงินและจำนวนรายการของช่องทางชำระหนึ่งช่องทาง
function ChannelCard({
    title,
    subTitle,
    countText,
    amountText,
    percent,
    icon,
}: ChannelCardProps): JSX.Element {
    return (
        <article className="rounded-[18px] bg-[#E4E6E8] px-4 pb-4 pt-4 shadow-none md:px-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-[6px] bg-[#F7F7F8] text-[#1F2937]">
                {icon}
            </div>

            <div className="mt-5">
                <h3 className="text-[16px] font-bold leading-[1.2] text-[#111827] md:text-[18px]">
                    {title}
                </h3>
                <p className="mt-1 text-[10px] font-medium leading-[15px] text-[#4B5563]">
                    {subTitle}
                </p>
                <p className="mt-1 text-[10px] font-medium leading-[15px] text-[#6B7280]">
                    {countText}
                </p>
            </div>

            <div className="mt-9 flex items-end justify-between gap-3">
                <p className="text-[20px] font-medium leading-none tracking-[-0.03em] text-[#1F2937] md:text-[22px]">
                    {amountText}
                </p>
                <span className="text-[11px] font-bold leading-none text-[#111827]">
                    {percent}%
                </span>
            </div>

            <div className="mt-4">
                <ProgressBar
                    value={percent}
                    colorClass="bg-[#15263A]"
                    trackClass="bg-white/80"
                    heightClass="h-[5px]"
                />
            </div>
        </article>
    );
}

export { ChannelCard };
