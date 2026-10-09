"use client";
// Import Library
import type { JSX } from "react";
import { LuX } from "react-icons/lu";
// Import Components
import { FieldError } from "@/src/app/components/shared/FieldError";
// Import Landing
import { FEE_TYPE_OPTIONS, MAX_HOUR, VEHICLE_TYPE_OPTIONS } from "@/src/app/lib/landing/device";
// Import Types
import type { PricingRuleStatus } from "@/src/app/type/api/pricing";
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

// Function dialog เพิ่ม/แก้ไขกฎค่าบริการ
function PricingRuleModal({
    open,
    mode,
    form,
    fieldErrors,
    error,
    submitting,
    onClose,
    onChange,
    onSubmit,
}: PricingRuleModalProps): JSX.Element | null {
    if (!open) return null;

    const feeTypeOption = FEE_TYPE_OPTIONS.find((option) => option.code === form.feeType);
    const isHourly = form.feeType === "base_hour" || form.feeType === "next_hour";

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#26313C]/75 px-4 py-6 backdrop-blur-sm">
            <div className="relative max-h-[calc(100dvh-48px)] w-full max-w-[520px] overflow-y-auto rounded-[14px] bg-white p-5 shadow-2xl sm:p-8">
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="ปิด"
                    className="absolute right-6 top-6 text-[#061D36]"
                >
                    <LuX size={22} />
                </button>

                <h2 className="text-[24px] font-bold text-[#061D36]">
                    {mode === "create" ? "เพิ่มเงื่อนไขราคา" : "แก้ไขเงื่อนไขราคา"}
                </h2>
                <p className="mt-1 text-[14px] text-[#6B7280]">
                    กำหนดราคาแยกตามประเภทค่าบริการและประเภทรถ
                </p>

                <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <label htmlFor="pricing-fee-type" className="mb-2 block text-[13px] font-semibold text-[#1F2937]">
                            ประเภทค่าบริการ
                        </label>
                        <select
                            id="pricing-fee-type"
                            value={form.feeType}
                            onChange={(event) =>
                                onChange({ feeType: event.target.value as PricingRuleForm["feeType"] })
                            }
                            className={fieldClass(Boolean(fieldErrors.feeType))}
                        >
                            {FEE_TYPE_OPTIONS.map((item) => (
                                <option key={item.code} value={item.code}>
                                    {item.label}
                                </option>
                            ))}
                        </select>
                        {feeTypeOption ? (
                            <p className="mt-1 text-[12px] text-[#6B7280]">{feeTypeOption.description}</p>
                        ) : null}
                        <FieldError message={fieldErrors.feeType} />
                    </div>

                    <div>
                        <label htmlFor="pricing-vehicle-type" className="mb-2 block text-[13px] text-[#6B7280]">
                            ประเภทรถ
                        </label>
                        <select
                            id="pricing-vehicle-type"
                            value={form.vehicleType}
                            onChange={(event) =>
                                onChange({ vehicleType: event.target.value as PricingRuleForm["vehicleType"] })
                            }
                            className={fieldClass(Boolean(fieldErrors.vehicleType))}
                        >
                            {VEHICLE_TYPE_OPTIONS.map((item) => (
                                <option key={item.code} value={item.code}>
                                    {item.label}
                                </option>
                            ))}
                        </select>
                        <FieldError message={fieldErrors.vehicleType} />
                    </div>

                    <div>
                        <label htmlFor="pricing-status" className="mb-2 block text-[13px] text-[#6B7280]">
                            สถานะ
                        </label>
                        <select
                            id="pricing-status"
                            value={form.status}
                            onChange={(event) => onChange({ status: event.target.value as PricingRuleStatus })}
                            className={fieldClass(Boolean(fieldErrors.status))}
                        >
                            <option value="active">เปิดใช้งาน</option>
                            <option value="inactive">ปิดใช้งาน</option>
                        </select>
                        <FieldError message={fieldErrors.status} />
                    </div>

                    {isHourly ? (
                        <>
                            <div>
                                <label htmlFor="pricing-hour-start" className="mb-2 block text-[13px] text-[#6B7280]">
                                    ชั่วโมงเริ่มต้น
                                </label>
                                <input
                                    id="pricing-hour-start"
                                    type="number"
                                    min={1}
                                    max={MAX_HOUR}
                                    step={1}
                                    value={form.feeType === "base_hour" ? "1" : form.hourStart}
                                    disabled={form.feeType === "base_hour"}
                                    onChange={(event) => onChange({ hourStart: event.target.value })}
                                    className={`${fieldClass(Boolean(fieldErrors.hourStart))} disabled:bg-[#F3F4F6] disabled:text-[#9CA3AF]`}
                                />
                                <FieldError message={fieldErrors.hourStart} />
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
                                    placeholder={form.feeType === "next_hour" ? `เว้นว่าง = ${MAX_HOUR}` : ""}
                                    value={form.hourEnd}
                                    onChange={(event) => onChange({ hourEnd: event.target.value })}
                                    className={fieldClass(Boolean(fieldErrors.hourEnd))}
                                />
                                <FieldError message={fieldErrors.hourEnd} />
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
                            value={form.price}
                            onChange={(event) => onChange({ price: event.target.value })}
                            className={fieldClass(Boolean(fieldErrors.price))}
                        />
                        {isHourly ? (
                            <p className="mt-1 text-[12px] text-[#6B7280]">ราคา 0 = ฟรีในชั่วโมงนั้น</p>
                        ) : null}
                        <FieldError message={fieldErrors.price} />
                    </div>

                    <div className="sm:col-span-2">
                        <label htmlFor="pricing-name" className="mb-2 block text-[13px] text-[#6B7280]">
                            ชื่อเงื่อนไข (ไม่บังคับ)
                        </label>
                        <input
                            id="pricing-name"
                            type="text"
                            value={form.name}
                            placeholder={feeTypeOption?.label}
                            onChange={(event) => onChange({ name: event.target.value })}
                            className={fieldClass(Boolean(fieldErrors.name))}
                        />
                        <FieldError message={fieldErrors.name} />
                    </div>
                </div>

                {error ? (
                    <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
                        {error}
                    </div>
                ) : null}

                <div className="mt-9 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-11 min-w-[110px] rounded-full bg-[#9CA3AF] px-6 text-[14px] font-bold text-white"
                    >
                        ยกเลิก
                    </button>

                    <button
                        type="button"
                        onClick={onSubmit}
                        disabled={submitting}
                        className="h-11 min-w-[110px] rounded-full bg-[#061D36] px-6 text-[14px] font-bold text-white disabled:opacity-60"
                    >
                        {submitting ? "กำลังบันทึก..." : "ตกลง"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export { PricingRuleModal };
