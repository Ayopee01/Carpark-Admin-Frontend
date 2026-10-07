"use client";
// Import Library
import type { ReactNode, JSX } from "react";
import { LuBuilding2, LuCreditCard, LuQrCode, LuUser, LuWallet, LuX } from "react-icons/lu";
// Import Types
import type { ChannelMappingModalProps } from "@/src/app/type/ui/device";

// Function เลือกไอคอนของวิธีชำระ
function getMethodIcon(icon?: string | null): ReactNode {
    switch (icon) {
        case "cash":
            return <LuUser size={15} />;
        case "bank":
            return <LuBuilding2 size={15} />;
        case "qr":
            return <LuQrCode size={15} />;
        case "wallet":
            return <LuWallet size={15} />;
        default:
            return <LuCreditCard size={15} />;
    }
}

// Function dialog เลือกวิธีชำระที่ช่องทางนี้รับได้
function ChannelMappingModal({
    open,
    channel,
    methods,
    selectedMethods,
    submitting,
    onClose,
    onToggle,
    onSubmit,
}: ChannelMappingModalProps): JSX.Element | null {
    if (!open || !channel) return null;

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#111827]/80 px-4 py-6 backdrop-blur-sm">
            <div className="relative max-h-[calc(100dvh-48px)] w-full max-w-[410px] overflow-y-auto rounded-[14px] bg-white shadow-2xl">
                <div className="px-5 py-5 sm:px-7">
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute right-5 top-5 text-[#061D36]"
                    >
                        <LuX size={20} />
                    </button>

                    <h2 className="pr-8 text-[18px] font-extrabold leading-tight text-[#061D36]">
                        ช่องทางบริการ ({channel.name})
                    </h2>
                    <p className="mt-1 text-[12px] text-[#667085]">
                        เลือกวิธีชำระเงินที่อนุญาตสำหรับช่องทางนี้
                    </p>
                </div>

                <div className="px-5 pb-6 sm:px-7 sm:pb-7">
                    <p className="mb-3 text-[12px] font-semibold text-[#475467]">
                        วิธีชำระเงินที่เปิดใช้งาน
                    </p>

                    <div className="space-y-2">
                        {methods.length === 0 ? (
                            <div className="rounded-md bg-[#D9DDE1] px-3 py-3 text-[13px] font-semibold text-[#667085]">
                                ยังไม่มีวิธีชำระเงินที่เปิดใช้งาน
                            </div>
                        ) : (
                            methods.map((method) => (
                                <label
                                    key={method.id}
                                    className="flex min-h-[40px] cursor-pointer items-center justify-between gap-3 rounded-md bg-[#D9DDE1] px-3 text-[13px] font-semibold text-[#1F2937]"
                                >
                                    <span className="flex min-w-0 items-center gap-3">
                                        <span className="shrink-0">
                                            {getMethodIcon(method.icon)}
                                        </span>
                                        <span className="truncate">{method.label}</span>
                                    </span>

                                    <input
                                        type="checkbox"
                                        checked={selectedMethods.includes(method.id)}
                                        onChange={() => onToggle(method.id)}
                                        className="h-4 w-4 shrink-0 accent-[#061D36]"
                                    />
                                </label>
                            ))
                        )}
                    </div>

                    <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-10 min-w-[104px] rounded-full bg-[#9CA3AF] px-6 text-[13px] font-bold text-white"
                        >
                            ยกเลิก
                        </button>

                        <button
                            type="button"
                            onClick={onSubmit}
                            disabled={submitting || methods.length === 0}
                            className="h-10 min-w-[104px] rounded-full bg-[#061D36] px-6 text-[13px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            ตกลง
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export { ChannelMappingModal };
