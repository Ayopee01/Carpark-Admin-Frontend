"use client";
// Import Library
import type { JSX } from "react";
import { useWatch } from "react-hook-form";
import type { ReactNode } from "react";
import { LuCalendarDays, LuClock3, LuQrCode, LuReceiptText, LuTimerReset } from "react-icons/lu";
// Import Components
import { Switch } from "@/src/app/components/ui/switch";
import { FieldError } from "@/src/app/components/shared/FieldError";
// Import Hooks
import { useReceiptSettingsForm } from "@/src/app/components/system/useReceiptSettingsForm";
// Import Types
import type { ReceiptSettingsForm } from "@/src/app/type/ui/system";

// Function แถวเปิดปิดการแสดงผลหนึ่งรายการ
function RowItem({
    icon,
    label,
    subLabel,
    checked,
    onChange,
}: {
    icon: ReactNode;
    label: string;
    subLabel?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}): JSX.Element {
    return (
        <label className="flex w-full cursor-pointer items-center justify-between rounded-xl bg-[#E8EBEF] px-5 py-4 transition hover:bg-[#DDE2E8]">
            <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[#1F2933]">
                    {icon}
                </div>

                <div>
                    <div className="text-[16px] text-[#1F2933]">{label}</div>
                    {subLabel ? (
                        <div className="text-[12px] text-[#667085]">{subLabel}</div>
                    ) : null}
                </div>
            </div>

            <Switch checked={checked} onCheckedChange={onChange} />
        </label>
    );
}

// Function แท็บตั้งค่าใบเสร็จชำระเงิน
function PaidBillTab(): JSX.Element {
    const { form, isPending, error, submit, cancel } = useReceiptSettingsForm(
        (values) => ({ paymentBill: values.paymentBill, footerText: values.footerText }),
        "บันทึกข้อมูลใบหลังชำระเรียบร้อยแล้ว"
    );
    const { setValue, register, formState: { errors, isSubmitting } } = form;
    const draft = useWatch({ control: form.control, compute: (values) => values });

    // เปิดปิดการแสดงผลหนึ่งรายการ
    function toggle(key: Exclude<keyof ReceiptSettingsForm["paymentBill"], "expiryDuration">, checked: boolean) {
        setValue(`paymentBill.${key}`, checked, { shouldDirty: true });
    }

    if (isPending) {
        return (
            <div className="grid min-w-0 max-w-full grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="h-[500px] animate-pulse rounded-2xl bg-white" />
                <div className="h-[580px] animate-pulse rounded-2xl bg-[#D9DDE4]" />
            </div>
        );
    }

    return (
        <div className="grid min-w-0 max-w-full grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 rounded-2xl border-t-4 border-[#0D1B2A] bg-white p-4 shadow-sm sm:p-6">
                <h2 className="flex items-center gap-3 text-[22px] font-extrabold text-[#1F2933]">
                    <span className="h-6 w-1 rounded-full bg-[#1F2933]" />
                    กำหนดข้อมูลในใบหลังชำระ
                </h2>

                {error ? (
                    <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
                        {error}
                    </div>
                ) : null}

                <div className="mt-8 space-y-4">
                    <RowItem
                        icon={<LuCalendarDays size={18} />}
                        label="วัน เดือน ปี"
                        checked={draft.paymentBill.showDate}
                        onChange={(checked) => toggle("showDate", checked)}
                    />
                    <RowItem
                        icon={<LuClock3 size={18} />}
                        label="เวลาเข้า"
                        checked={draft.paymentBill.showEntryTime}
                        onChange={(checked) => toggle("showEntryTime", checked)}
                    />
                    <RowItem
                        icon={<LuQrCode size={18} />}
                        label="QR Code"
                        checked={draft.paymentBill.showQrCode}
                        onChange={(checked) => toggle("showQrCode", checked)}
                    />
                    <RowItem
                        icon={<LuReceiptText size={18} />}
                        label="รหัสบิล"
                        checked={draft.paymentBill.showBillNo}
                        onChange={(checked) => toggle("showBillNo", checked)}
                    />
                    <RowItem
                        icon={<LuTimerReset size={18} />}
                        label="เวลาหมดอายุ"
                        subLabel={`(${draft.paymentBill.expiryDuration || "-"} นาที)`}
                        checked={draft.paymentBill.showExpiryTime}
                        onChange={(checked) => toggle("showExpiryTime", checked)}
                    />

                    <div>
                        <label className="mb-2 block text-[14px] text-[#667085]">
                            ระยะเวลาหมดอายุ QR Code (นาที)
                        </label>
                        <input
                            type="number"
                            min={1}
                            max={1440}
                            step={1}
                            {...register("paymentBill.expiryDuration", { valueAsNumber: true })}
                            aria-invalid={Boolean(errors.paymentBill?.expiryDuration)}
                            className="w-full rounded-xl bg-[#E8EBEF] px-5 py-4 text-[18px] font-bold text-[#1F2933] outline-none aria-invalid:ring-2 aria-invalid:ring-red-400"
                        />
                        <FieldError message={errors.paymentBill?.expiryDuration?.message} />
                    </div>
                </div>

                <div className="mt-10 flex justify-center gap-4 border-t border-[#E5E7EB] pt-6">
                    <button
                        type="button"
                        onClick={() => void submit()}
                        disabled={isSubmitting}
                        className="rounded-full bg-[#061D36] px-8 py-3 text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
                    </button>
                    <button
                        type="button"
                        onClick={cancel}
                        disabled={isSubmitting}
                        className="rounded-full bg-[#E5E7EB] px-8 py-3 text-[14px] font-semibold text-[#1F2933] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        ยกเลิก
                    </button>
                </div>
            </div>

            <div className="rounded-2xl bg-[#D9DDE4] p-5 shadow-sm">
                <div className="mb-4 text-[18px] font-bold text-[#1F2933]">ตัวอย่าง</div>

                <div className="mx-auto w-full max-w-[260px] rounded-xl bg-white p-6 shadow-md">
                    <div className="text-center text-[28px] font-extrabold text-[#1F2933]">
                        Smart Carpark
                    </div>
                    <div className="mt-1 text-center text-[10px] text-[#6B7280]">
                        ระบบจอดรถอัจฉริยะ | อาคาร A-12
                    </div>

                    <div className="mt-8 grid grid-cols-2 gap-y-2 text-[13px]">
                        {draft.paymentBill.showDate ? (
                            <>
                                <div>วันที่ :</div>
                                <div className="text-right">24 Oct 2023</div>
                            </>
                        ) : null}

                        {draft.paymentBill.showEntryTime ? (
                            <>
                                <div>เวลาเข้า :</div>
                                <div className="text-right">14:23:45</div>
                            </>
                        ) : null}

                        {draft.paymentBill.showBillNo ? (
                            <>
                                <div>รหัสบิล :</div>
                                <div className="text-right">#GP-984421</div>
                            </>
                        ) : null}
                    </div>

                    {draft.paymentBill.showQrCode ? (
                        <div className="mx-auto mt-8 flex h-24 w-24 items-center justify-center bg-[#F3F4F6]">
                            QR
                        </div>
                    ) : null}

                    {draft.paymentBill.showExpiryTime ? (
                        <div className="mt-6 text-center">
                            <div className="text-[12px] text-[#6B7280]">หมดอายุใน</div>
                            <div className="text-[34px] font-extrabold leading-none text-[#1F2933]">
                                {String(draft.paymentBill.expiryDuration || 0).padStart(2, "0")}:00 นาที
                            </div>
                            <div className="mt-2 text-[10px] text-[#6B7280]">
                                กรุณาสแกนภายในเวลาที่กำหนด มิฉะนั้นจะต้องเริ่มกระบวนการใหม่
                            </div>
                        </div>
                    ) : null}

                    <div className="mt-8 border-t border-dashed border-[#D1D5DB] pt-4 text-center text-[10px] text-[#6B7280]">
                        {draft.footerText}
                    </div>
                </div>

                <div className="mt-5 text-[12px] text-[#667085]">
                    * ตัวอย่างนี้จะแสดงตามค่าที่เปิดใช้งานจาก API
                </div>
            </div>
        </div>
    );
}

export { PaidBillTab };
