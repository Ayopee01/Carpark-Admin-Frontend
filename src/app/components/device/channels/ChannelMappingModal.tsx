"use client";
// Import Library
import { useState, type ReactNode, type JSX } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LuBuilding2, LuCreditCard, LuQrCode, LuUser, LuWallet, LuX } from "react-icons/lu";
// Import Components
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/src/app/components/ui/dialog";
import { Checkbox } from "@/src/app/components/ui/checkbox";
// Import Types
import type { ChannelMappingForm, ChannelMappingModalProps } from "@/src/app/type/ui/device";
// Import Shared
import { channelMappingSchema } from "@/src/app/lib/shared/schemas/payment";

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

// Function dialog เลือกวิธีชำระที่ช่องทางนี้รับได้ (หน้าแม่ใส่ key ใหม่ทุกครั้งที่เปิด ฟอร์มจึงเริ่มจากค่าของช่องทางนั้น)
function ChannelMappingModal({
    open,
    channel,
    methods,
    onClose,
    onSubmit,
}: ChannelMappingModalProps): JSX.Element {
    // เก็บช่องทางล่าสุดไว้ ตอนปิด animation ยังมีชื่อให้แสดง
    const [shownChannel, setShownChannel] = useState(channel);
    if (channel && channel !== shownChannel) setShownChannel(channel);

    // เลือกไว้เฉพาะวิธีที่ยังเปิดใช้งาน
    const { control, handleSubmit, formState: { isSubmitting } } = useForm<ChannelMappingForm>({
        resolver: zodResolver(channelMappingSchema),
        defaultValues: {
            allowedMethods: (channel?.allowedMethods ?? []).filter((methodId) => methods.some((method) => method.id === methodId)),
        },
    });

    const submit = handleSubmit(async (values) => {
        try {
            await onSubmit(values.allowedMethods);
        } catch {
            // หน้าแม่แจ้ง error แล้ว คง dialog ไว้ให้แก้แล้วกดใหม่
        }
    });

    return (
        <Dialog open={open && Boolean(shownChannel)} onOpenChange={(next) => !next && onClose()}>
            <DialogContent
                locked={isSubmitting}
                overlayClassName="bg-[#111827]/80 backdrop-blur-sm"
                className="max-h-[calc(100dvh-48px)] max-w-[410px] overflow-y-auto rounded-[14px] bg-white shadow-2xl"
            >
                <div className="px-5 py-5 sm:px-7">
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute right-5 top-5 text-[#061D36]"
                    >
                        <LuX size={20} />
                    </button>

                    <DialogTitle className="pr-8 text-[18px] font-extrabold leading-tight text-[#061D36]">
                        ช่องทางบริการ ({shownChannel?.name})
                    </DialogTitle>
                    <DialogDescription className="mt-1 text-[12px] text-[#667085]">
                        เลือกวิธีชำระเงินที่อนุญาตสำหรับช่องทางนี้
                    </DialogDescription>
                </div>

                <div className="px-5 pb-6 sm:px-7 sm:pb-7">
                    <p className="mb-3 text-[12px] font-semibold text-[#475467]">
                        วิธีชำระเงินที่เปิดใช้งาน
                    </p>

                    <Controller
                        control={control}
                        name="allowedMethods"
                        render={({ field }) => (
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

                                            <Checkbox
                                                checked={field.value.includes(method.id)}
                                                onCheckedChange={(checked) =>
                                                    field.onChange(
                                                        checked
                                                            ? [...field.value, method.id]
                                                            : field.value.filter((item) => item !== method.id)
                                                    )
                                                }
                                            />
                                        </label>
                                    ))
                                )}
                            </div>
                        )}
                    />

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
                            onClick={() => void submit()}
                            disabled={isSubmitting || methods.length === 0}
                            className="h-10 min-w-[104px] rounded-full bg-[#061D36] px-6 text-[13px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            ตกลง
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export { ChannelMappingModal };
