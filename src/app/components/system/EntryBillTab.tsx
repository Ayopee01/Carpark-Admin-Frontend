"use client";
// Import Library
import type { JSX } from "react";
import { useWatch } from "react-hook-form";
import type { ReactNode } from "react";
import { LuCalendarDays, LuClock3, LuQrCode, LuReceiptText } from "react-icons/lu";
// Import Components
import { Switch } from "@/src/app/components/ui/switch";
// Import Hooks
import { useReceiptSettingsForm } from "@/src/app/components/system/useReceiptSettingsForm";
// Import Types
import type { ReceiptSettingsForm } from "@/src/app/type/ui/system";

// Function แถวเปิดปิดการแสดงผลหนึ่งรายการ
function RowItem({
    icon,
    label,
    checked,
    onChange,
}: {
    icon: ReactNode;
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}): JSX.Element {
    return (
        <label className="flex w-full cursor-pointer items-center justify-between rounded-xl bg-[#E8EBEF] px-5 py-4 transition hover:bg-[#DDE2E8]">
            <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[#1F2933]">
                    {icon}
                </div>

                <span className="text-[16px] text-[#1F2933]">{label}</span>
            </div>

            <Switch checked={checked} onCheckedChange={onChange} />
        </label>
    );
}

// Function แท็บตั้งค่าใบเสร็จขาเข้า
function EntryBillTab(): JSX.Element {
    const { form, isPending, error, submit, cancel } = useReceiptSettingsForm(
        (values) => ({ entryBill: values.entryBill, footerText: values.footerText }),
        "บันทึกข้อมูลใบเข้าใช้บริการเรียบร้อยแล้ว"
    );
    const { setValue, formState: { isSubmitting } } = form;
    const draft = useWatch({ control: form.control, compute: (values) => values });

    // เปิดปิดการแสดงผลหนึ่งรายการ
    function toggle(key: keyof ReceiptSettingsForm["entryBill"], checked: boolean) {
        setValue(`entryBill.${key}`, checked, { shouldDirty: true });
    }

    if (isPending) {
        return (
            <div className="grid min-w-0 max-w-full grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="h-[430px] animate-pulse rounded-2xl bg-white" />
                <div className="h-[520px] animate-pulse rounded-2xl bg-[#D9DDE4]" />
            </div>
        );
    }

    return (
        <div className="grid min-w-0 max-w-full grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 rounded-2xl border-t-4 border-[#0D1B2A] bg-white p-4 shadow-sm sm:p-6">
                <h2 className="flex items-center gap-3 text-[22px] font-extrabold text-[#1F2933]">
                    <span className="h-6 w-1 rounded-full bg-[#1F2933]" />
                    กำหนดข้อมูลในใบเข้าใช้บริการ
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
                        checked={draft.entryBill.showDate}
                        onChange={(checked) => toggle("showDate", checked)}
                    />
                    <RowItem
                        icon={<LuClock3 size={18} />}
                        label="เวลาเข้า"
                        checked={draft.entryBill.showEntryTime}
                        onChange={(checked) => toggle("showEntryTime", checked)}
                    />
                    <RowItem
                        icon={<LuQrCode size={18} />}
                        label="QR Code"
                        checked={draft.entryBill.showQrCode}
                        onChange={(checked) => toggle("showQrCode", checked)}
                    />
                    <RowItem
                        icon={<LuReceiptText size={18} />}
                        label="รหัสบิล"
                        checked={draft.entryBill.showBillNo}
                        onChange={(checked) => toggle("showBillNo", checked)}
                    />
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
                        {draft.entryBill.showDate ? (
                            <>
                                <div>วันที่ :</div>
                                <div className="text-right">25/10/2023</div>
                            </>
                        ) : null}

                        {draft.entryBill.showEntryTime ? (
                            <>
                                <div>เวลาเข้า :</div>
                                <div className="text-right">14:30:22</div>
                            </>
                        ) : null}

                        {draft.entryBill.showBillNo ? (
                            <>
                                <div>รหัสบิล :</div>
                                <div className="text-right">#GP-09941</div>
                            </>
                        ) : null}
                    </div>

                    {draft.entryBill.showQrCode ? (
                        <div className="mx-auto mt-8 flex h-32 w-32 items-center justify-center bg-[#F3F4F6]">
                            QR
                        </div>
                    ) : null}

                    <div className="mt-8 border-t border-dashed border-[#D1D5DB] pt-6 text-center">
                        <div className="text-[18px] font-bold">{draft.footerText}</div>
                        <div className="mt-1 text-[11px] text-[#6B7280]">
                            โปรดเก็บใบเสร็จนี้เพื่อใช้อ้างอิงภายหลัง
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export { EntryBillTab };
