"use client";
// Import Library
import type { JSX } from "react";
import { LuCarFront } from "react-icons/lu";
// Import Types
import type { LoadingScreenProps } from "@/src/app/type/ui/shared";

// Function แสดงหน้าโหลดพร้อมข้อความ
function LoadingScreen({
    open = true,
    progress = 0,
    message = "กำลังโหลดข้อมูล...",
    detail = "ระบบลานจอดรถ",
    fullscreen = true,
}: LoadingScreenProps): JSX.Element | null {
    if (!open) return null;

    const safeProgress = Math.max(0, Math.min(progress, 100));
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (safeProgress / 100) * circumference;

    return (
        <div
            className={
                fullscreen
                    ? "fixed inset-0 z-[9999] flex min-h-screen items-center justify-center bg-[#F4F4F4] px-6 py-10"
                    : "flex min-h-screen w-full items-center justify-center bg-[#F4F4F4] px-6 py-10"
            }
        >
            <div className="flex w-full max-w-[520px] flex-col items-center">
                <div className="relative flex h-[170px] w-[170px] items-center justify-center">
                    <svg
                        className="-rotate-90"
                        width="170"
                        height="170"
                        viewBox="0 0 140 140"
                    >
                        <circle
                            cx="70"
                            cy="70"
                            r={radius}
                            fill="none"
                            stroke="#D9DEE6"
                            strokeWidth="4"
                        />
                        <circle
                            cx="70"
                            cy="70"
                            r={radius}
                            fill="none"
                            stroke="#0D1B2A"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            style={{ transition: "stroke-dashoffset 0.35s ease" }}
                        />
                    </svg>

                    <div className="absolute flex h-[118px] w-[118px] items-center justify-center rounded-full border border-[#D1D7E0] bg-[#EEF2F7] text-[#0D1B2A]">
                        <LuCarFront size={28} />
                    </div>
                </div>

                <div className="mt-2 text-center text-[34px] font-semibold text-[#1F2933]">
                    {message}
                </div>

                <div className="mt-14 flex w-full flex-col items-center">
                    <div className="flex w-full max-w-[360px] items-center gap-4">
                        <span className="text-[20px] leading-none text-[#0D1B2A]">
                            •
                        </span>

                        <div className="relative h-[6px] flex-1 overflow-hidden rounded-full bg-[#0D1B2A]">
                            <div
                                className="absolute left-0 top-0 h-full rounded-full bg-[#E9BE3B] transition-all duration-300"
                                style={{ width: `${safeProgress}%` }}
                            />
                        </div>

                        <span className="min-w-[42px] text-right text-[12px] font-semibold tracking-[0.2em] text-[#1F2933]">
                            {safeProgress}%
                        </span>
                    </div>

                    <div className="mt-16 text-center text-[13px] text-[#1F2933]">
                        • {detail}
                    </div>
                </div>
            </div>
        </div>
    );
}

export { LoadingScreen };
