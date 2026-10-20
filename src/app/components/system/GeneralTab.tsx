"use client";
// Import Library
import { useMemo, type JSX } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
// Import Components
import { SelectField } from "@/src/app/components/shared/SelectField";
import { Switch } from "@/src/app/components/ui/switch";
// Import Actions
import { updateSystemSettings } from "@/src/app/lib/actions/system-settings";
// Import Client
import { queryKeys, systemSettingsQuery } from "@/src/app/lib/client/queries";
import { unwrap } from "@/src/app/lib/client/http";
// Import Landing
import { DEFAULT_SYSTEM_SETTINGS, toSystemSettingsForm } from "@/src/app/lib/landing/system";
// Import Types
import type { SystemSettingsUpdateRequest } from "@/src/app/type/api/system-settings";
import type { SystemSettingsForm } from "@/src/app/type/ui/system";
// Import Shared
import { getErrorMessage } from "@/src/app/lib/shared/http";
import { systemSettingsSchema } from "@/src/app/lib/shared/schemas/system";

// Function แปลงค่าในฟอร์มเป็น body ของ PUT /system-settings
function toSystemSettingsPayload(values: SystemSettingsForm): SystemSettingsUpdateRequest {
    return {
        general: values.general,
        billing: values.billing,
        receipt: {
            printer: { paperWidth: values.receipt.paperWidth },
            footerText: values.receipt.footerText,
        },
    };
}

// Function แท็บตั้งค่าทั่วไปของระบบ
function GeneralTab(): JSX.Element {
    const queryClient = useQueryClient();
    const { data, isPending, error } = useQuery(systemSettingsQuery());
    const settings = useMemo(() => (data ? toSystemSettingsForm(data) : DEFAULT_SYSTEM_SETTINGS), [data]);

    // ค่าจาก backend เข้าฟอร์มทุกครั้งที่โหลดใหม่ ช่องที่กำลังแก้อยู่ไม่ถูกทับ
    const { register, control, handleSubmit, reset, formState: { isSubmitting } } = useForm<SystemSettingsForm>({
        resolver: zodResolver(systemSettingsSchema),
        values: settings,
        resetOptions: { keepDirtyValues: true },
    });
    const draft = useWatch({ control, compute: (values) => values });

    // ได้แค่ success/message ต้องโหลดใหม่
    const save = useMutation({
        mutationFn: (values: SystemSettingsForm) => unwrap(updateSystemSettings(toSystemSettingsPayload(values))),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.systemSettings }),
    });

    const submit = handleSubmit(
        async (values) => {
            try {
                await save.mutateAsync(values);
                reset(values);
                toast.success("บันทึกข้อมูลตั้งค่าระบบเรียบร้อยแล้ว");
            } catch (err) {
                toast.error(getErrorMessage(err, "เกิดข้อผิดพลาด"));
            }
        },
        () => toast.error("ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง")
    );

    function handleCancel() {
        reset(settings);
    }

    if (isPending) {
        return (
            <div className="grid min-w-0 max-w-full grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="h-[520px] animate-pulse rounded-2xl bg-white" />
                <div className="h-[420px] animate-pulse rounded-2xl bg-[#D9DDE4]" />
            </div>
        );
    }

    return (
        <div className="grid min-w-0 max-w-full grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 rounded-2xl border-t-4 border-[#0D1B2A] bg-white p-4 shadow-sm sm:p-6">
                <h2 className="flex items-center gap-3 text-[22px] font-extrabold text-[#1F2933]">
                    <span className="h-6 w-1 rounded-full bg-[#1F2933]" />
                    ตั้งค่าระบบทั่วไป
                </h2>

                {error ? (
                    <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
                        {getErrorMessage(error, "เกิดข้อผิดพลาด")}
                    </div>
                ) : null}

                <div className="mt-8 space-y-6">
                    <div>
                        <label className="mb-2 block text-[14px] text-[#667085]">
                            ชื่อระบบ
                        </label>
                        <input
                            {...register("general.systemName")}
                            className="w-full rounded-xl bg-[#E5E7EB] px-4 py-4 text-[18px] font-bold text-[#1F2933] outline-none"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-[14px] text-[#667085]">
                            สถานที่
                        </label>
                        <input
                            {...register("general.location")}
                            className="w-full rounded-xl bg-[#E5E7EB] px-4 py-4 text-[18px] font-bold text-[#1F2933] outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-[14px] text-[#667085]">
                                ภาษา
                            </label>
                            <Controller
                                control={control}
                                name="general.language"
                                render={({ field }) => (
                                    <SelectField
                                        aria-label="ภาษา"
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        options={[
                                            { value: "th", label: "ไทย" },
                                            { value: "en", label: "English" },
                                        ]}
                                        className="w-full rounded-xl bg-[#E5E7EB] px-4 py-4 text-[16px] font-bold text-[#1F2933]"
                                    />
                                )}
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-[14px] text-[#667085]">
                                Timezone
                            </label>
                            {/* backend คิดเวลาไทยเสมอ แก้ไม่ได้ */}
                            <div className="w-full rounded-xl bg-[#E5E7EB] px-4 py-4 text-[16px] font-bold text-[#1F2933]">
                                {draft.general.timezone}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-[14px] text-[#667085]">
                                ขนาดกระดาษ
                            </label>
                            <Controller
                                control={control}
                                name="receipt.paperWidth"
                                render={({ field }) => (
                                    <SelectField
                                        aria-label="ขนาดกระดาษ"
                                        value={String(field.value)}
                                        onValueChange={(value) => field.onChange(Number(value))}
                                        options={[
                                            { value: "58", label: "58 mm" },
                                            { value: "80", label: "80 mm" },
                                        ]}
                                        className="w-full rounded-xl bg-[#E5E7EB] px-4 py-4 text-[16px] font-bold text-[#1F2933]"
                                    />
                                )}
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-[14px] text-[#667085]">
                                สกุลเงิน
                            </label>
                            {/* backend รองรับแค่ THB */}
                            <div className="w-full rounded-xl bg-[#E5E7EB] px-4 py-4 text-[16px] font-bold text-[#1F2933]">
                                {draft.billing.currency}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-[14px] text-[#667085]">
                            ข้อความท้ายใบเสร็จ
                        </label>
                        <textarea
                            {...register("receipt.footerText")}
                            rows={3}
                            className="w-full resize-none rounded-xl bg-[#E5E7EB] px-4 py-4 text-[16px] font-bold text-[#1F2933] outline-none"
                        />
                    </div>

                    <label className="flex cursor-pointer items-center justify-between rounded-xl bg-[#E8EBEF] px-5 py-4">
                        <span className="text-[15px] font-semibold text-[#1F2933]">
                            เปิดใช้งานภาษี
                        </span>
                        <Controller
                            control={control}
                            name="billing.taxEnabled"
                            render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
                        />
                    </label>
                </div>

                <div className="mt-10 flex justify-end gap-4 border-t border-[#E5E7EB] pt-6">
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
                        onClick={handleCancel}
                        disabled={isSubmitting}
                        className="rounded-full bg-[#E5E7EB] px-8 py-3 text-[14px] font-semibold text-[#1F2933] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        ยกเลิก
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                <div className="rounded-2xl bg-[#D9DDE4] p-5 shadow-sm">
                    <div className="text-[18px] font-bold text-[#1F2933]">
                        ข้อมูลปัจจุบัน
                    </div>

                    <div className="mt-4 space-y-3 text-[14px] text-[#667085]">
                        <div>
                            <span className="font-bold text-[#1F2933]">ระบบ:</span>{" "}
                            {draft.general.systemName}
                        </div>
                        <div>
                            <span className="font-bold text-[#1F2933]">สถานที่:</span>{" "}
                            {draft.general.location}
                        </div>
                        <div>
                            <span className="font-bold text-[#1F2933]">ภาษา:</span>{" "}
                            {draft.general.language}
                        </div>
                        <div>
                            <span className="font-bold text-[#1F2933]">Timezone:</span>{" "}
                            {draft.general.timezone}
                        </div>
                        <div>
                            <span className="font-bold text-[#1F2933]">กระดาษ:</span>{" "}
                            {draft.receipt.paperWidth} mm
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl bg-[#D9DDE4] p-5 shadow-sm">
                    <div className="mb-4 text-[18px] font-bold text-[#1F2933]">
                        Live Preview
                    </div>

                    <div className="mx-auto max-w-[220px] rounded-xl bg-white p-5 shadow-sm">
                        <div className="text-center text-[18px] font-extrabold text-[#1F2933]">
                            {draft.general.systemName}
                        </div>
                        <div className="mt-1 text-center text-[10px] text-[#667085]">
                            {draft.general.location}
                        </div>

                        <div className="mt-6 space-y-2 text-[11px] text-[#374151]">
                            <div>วันที่ : 25/10/2023</div>
                            <div>เวลาเข้า : 14:30:22</div>
                            <div>รหัสบิล : #A8902</div>
                        </div>

                        <div className="mx-auto mt-8 h-20 w-20 rounded bg-[#F3F4F6]" />

                        <div className="mt-6 border-t border-dashed border-[#D1D5DB] pt-4 text-center text-[10px] text-[#6B7280]">
                            {draft.receipt.footerText}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export { GeneralTab };
