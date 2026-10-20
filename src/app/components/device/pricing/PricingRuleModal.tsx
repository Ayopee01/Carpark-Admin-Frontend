"use client";
// Import Library
import { useState, type JSX } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LuX } from "react-icons/lu";
// Import Components
import { FieldError } from "@/src/app/components/shared/FieldError";
import { SelectField } from "@/src/app/components/shared/SelectField";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/src/app/components/ui/dialog";
// Import Client
import { applyServerErrors } from "@/src/app/lib/client/forms";
// Import Landing
import { FEE_TYPE_OPTIONS, MAX_HOUR, VEHICLE_TYPE_OPTIONS } from "@/src/app/lib/landing/device";
// Import Shared
import { getErrorMessage } from "@/src/app/lib/shared/http";
import { pricingRuleSchema } from "@/src/app/lib/shared/schemas/pricing";
// Import Types
import type { PricingRuleModalProps, PricingRuleForm } from "@/src/app/type/ui/device";

/* -------------------------------------- Config -------------------------------------- */

// Config class ของช่องกรอก
const inputClass = "h-11 w-full rounded-md border px-4 text-[14px] outline-none";

/* -------------------------------------- Helpers -------------------------------------- */

// Function class ของช่องกรอกตามสถานะ error
function fieldClass(hasError: boolean): string {
    return `${inputClass} ${hasError ? "border-red-400" : "border-[#E5E7EB]"}`;
}

/* -------------------------------------- Component -------------------------------------- */

// Function dialog เพิ่ม/แก้ไขกฎค่าบริการ (หน้าแม่ใส่ key ใหม่ทุกครั้งที่เปิด ฟอร์มเริ่มจาก defaultValues)
function PricingRuleModal({ open, mode, defaultValues, onClose, onSubmit }: PricingRuleModalProps): JSX.Element {
    const [formError, setFormError] = useState("");
    const {
        register,
        control,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<PricingRuleForm>({ resolver: zodResolver(pricingRuleSchema), defaultValues });

    const feeType = useWatch({ control, name: "feeType" });
    const feeTypeOption = FEE_TYPE_OPTIONS.find((option) => option.code === feeType);
    const isHourly = feeType === "base_hour" || feeType === "next_hour";

    // ตรวจ schema ก่อนส่ง แล้วใส่ error ของ backend เข้าช่อง (INVALID_PRICING_RULES บอกว่ากฎไหนในข้อความด้านล่าง)
    const submit = handleSubmit(async (values) => {
        setFormError("");
        try {
            await onSubmit(values);
        } catch (err) {
            applyServerErrors(setError, err);
            setFormError(getErrorMessage(err, "บันทึกข้อมูลไม่สำเร็จ"));
        }
    });

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogContent
                locked={isSubmitting}
                overlayClassName="bg-[#26313C]/75 backdrop-blur-sm"
                className="max-h-[calc(100dvh-48px)] max-w-[520px] overflow-y-auto rounded-[14px] bg-white p-5 shadow-2xl sm:p-8"
            >
                <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    aria-label="ปิด"
                    className="absolute right-6 top-6 text-[#061D36] disabled:opacity-60"
                >
                    <LuX size={22} />
                </button>

                <DialogTitle className="text-[24px] font-bold text-[#061D36]">
                    {mode === "create" ? "เพิ่มเงื่อนไขราคา" : "แก้ไขเงื่อนไขราคา"}
                </DialogTitle>
                <DialogDescription className="mt-1 text-[14px] text-[#6B7280]">
                    กำหนดราคาแยกตามประเภทค่าบริการและประเภทรถ
                </DialogDescription>

                <form noValidate onSubmit={(event) => void submit(event)}>
                    <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label htmlFor="pricing-fee-type" className="mb-2 block text-[13px] font-semibold text-[#1F2937]">
                                ประเภทค่าบริการ
                            </label>
                            <Controller
                                control={control}
                                name="feeType"
                                render={({ field }) => (
                                    <SelectField
                                        id="pricing-fee-type"
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        options={FEE_TYPE_OPTIONS.map((item) => ({ value: item.code, label: item.label }))}
                                        className={fieldClass(Boolean(errors.feeType))}
                                    />
                                )}
                            />
                            {feeTypeOption ? (
                                <p className="mt-1 text-[12px] text-[#6B7280]">{feeTypeOption.description}</p>
                            ) : null}
                            <FieldError message={errors.feeType?.message} />
                        </div>

                        <div>
                            <label htmlFor="pricing-vehicle-type" className="mb-2 block text-[13px] text-[#6B7280]">
                                ประเภทรถ
                            </label>
                            <Controller
                                control={control}
                                name="vehicleType"
                                render={({ field }) => (
                                    <SelectField
                                        id="pricing-vehicle-type"
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        options={VEHICLE_TYPE_OPTIONS.map((item) => ({ value: item.code, label: item.label }))}
                                        className={fieldClass(Boolean(errors.vehicleType))}
                                    />
                                )}
                            />
                            <FieldError message={errors.vehicleType?.message} />
                        </div>

                        <div>
                            <label htmlFor="pricing-status" className="mb-2 block text-[13px] text-[#6B7280]">
                                สถานะ
                            </label>
                            <Controller
                                control={control}
                                name="status"
                                render={({ field }) => (
                                    <SelectField
                                        id="pricing-status"
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        options={[
                                            { value: "active", label: "เปิดใช้งาน" },
                                            { value: "inactive", label: "ปิดใช้งาน" },
                                        ]}
                                        className={fieldClass(Boolean(errors.status))}
                                    />
                                )}
                            />
                            <FieldError message={errors.status?.message} />
                        </div>

                        {isHourly ? (
                            <>
                                <div>
                                    <label htmlFor="pricing-hour-start" className="mb-2 block text-[13px] text-[#6B7280]">
                                        ชั่วโมงเริ่มต้น
                                    </label>
                                    {feeType === "base_hour" ? (
                                        // ชั่วโมงพื้นฐานเริ่มชั่วโมงที่ 1 เสมอ
                                        <input
                                            id="pricing-hour-start"
                                            type="number"
                                            value="1"
                                            disabled
                                            readOnly
                                            className={`${fieldClass(false)} disabled:bg-[#F3F4F6] disabled:text-[#9CA3AF]`}
                                        />
                                    ) : (
                                        <input
                                            id="pricing-hour-start"
                                            type="number"
                                            min={1}
                                            max={MAX_HOUR}
                                            step={1}
                                            {...register("hourStart")}
                                            className={fieldClass(Boolean(errors.hourStart))}
                                        />
                                    )}
                                    <FieldError message={errors.hourStart?.message} />
                                </div>

                                <div>
                                    <label htmlFor="pricing-hour-end" className="mb-2 block text-[13px] text-[#6B7280]">
                                        ถึงชั่วโมงที่
                                    </label>
                                    <input
                                        id="pricing-hour-end"
                                        type="number"
                                        min={1}
                                        max={MAX_HOUR}
                                        step={1}
                                        placeholder={feeType === "next_hour" ? `เว้นว่าง = ${MAX_HOUR}` : ""}
                                        {...register("hourEnd")}
                                        className={fieldClass(Boolean(errors.hourEnd))}
                                    />
                                    <FieldError message={errors.hourEnd?.message} />
                                </div>
                            </>
                        ) : null}

                        <div className="sm:col-span-2">
                            <label htmlFor="pricing-price" className="mb-2 block text-[13px] text-[#6B7280]">
                                {isHourly ? "ราคาต่อชั่วโมง (บาท)" : "ราคาต่อคืน (บาท)"}
                            </label>
                            <input
                                id="pricing-price"
                                type="number"
                                inputMode="decimal"
                                min={0}
                                step="0.01"
                                {...register("price")}
                                className={fieldClass(Boolean(errors.price))}
                            />
                            {isHourly ? (
                                <p className="mt-1 text-[12px] text-[#6B7280]">ราคา 0 = ฟรีในชั่วโมงนั้น</p>
                            ) : null}
                            <FieldError message={errors.price?.message} />
                        </div>

                        <div className="sm:col-span-2">
                            <label htmlFor="pricing-name" className="mb-2 block text-[13px] text-[#6B7280]">
                                ชื่อเงื่อนไข (ไม่บังคับ)
                            </label>
                            <input
                                id="pricing-name"
                                type="text"
                                placeholder={feeTypeOption?.label}
                                {...register("name")}
                                className={fieldClass(Boolean(errors.name))}
                            />
                            <FieldError message={errors.name?.message} />
                        </div>
                    </div>

                    {formError ? (
                        <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
                            {formError}
                        </div>
                    ) : null}

                    <div className="mt-9 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="h-11 min-w-[110px] rounded-full bg-[#9CA3AF] px-6 text-[14px] font-bold text-white disabled:opacity-60"
                        >
                            ยกเลิก
                        </button>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="h-11 min-w-[110px] rounded-full bg-[#061D36] px-6 text-[14px] font-bold text-white disabled:opacity-60"
                        >
                            {isSubmitting ? "กำลังบันทึก..." : "ตกลง"}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export { PricingRuleModal };
