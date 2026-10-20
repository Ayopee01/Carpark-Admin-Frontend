"use client";
// Import Library
import type { JSX } from "react";
import { LuX } from "react-icons/lu";
// Import Components
import { FieldError } from "@/src/app/components/shared/FieldError";
// Import Types
import type { DeviceStatusInput } from "@/src/app/type/api/devices";
import type { EdcDeviceModalProps, EdcDevicePayload } from "@/src/app/type/ui/device";

/* -------------------------------------- Config -------------------------------------- */

// Config ตัวเลือกการใช้งานเครื่อง EDC
const EDC_USAGE_OPTIONS = [
    { value: "cashier", label: "เคาน์เตอร์ Admin (รับบัตรที่หน้ารับชำระ)" },
    { value: "device", label: "ติดกับ Kiosk / Barrier Gate" },
] as const;

// Config ตัวเลือกสถานะเครื่อง EDC
const EDC_STATUS_OPTIONS = [
    { value: "active", label: "ใช้งาน" },
    { value: "maintenance", label: "ส่งซ่อม" },
    { value: "inactive", label: "ปิดใช้งาน" },
] as const;

// Config class ของช่องกรอก
const inputClass = "h-11 w-full rounded-md border bg-[#F1F2F3] px-4 text-[14px] outline-none";

/* -------------------------------------- Helpers -------------------------------------- */


// Function ช่องกรอกข้อความพร้อม label และ error
function TextField({
    id,
    label,
    value,
    required,
    placeholder,
    error,
    onChange,
}: {
    id: string;
    label: string;
    value: string;
    required?: boolean;
    placeholder?: string;
    error?: string;
    onChange: (value: string) => void;
}): JSX.Element {
    return (
        <div>
            <label htmlFor={id} className="mb-2 block text-[13px] text-[#6B7280]">
                {label} {required ? <span className="text-red-600">*</span> : null}
            </label>
            <input
                id={id}
                value={value}
                placeholder={placeholder}
                onChange={(event) => onChange(event.target.value)}
                aria-invalid={Boolean(error)}
                className={`${inputClass} ${error ? "border-red-400" : "border-[#E5E7EB]"}`}
            />
            <FieldError message={error} />
        </div>
    );
}

/* -------------------------------------- Component -------------------------------------- */

// Function dialog ลงทะเบียน/แก้ไขเครื่อง EDC
function EdcDeviceModal({
    open,
    mode,
    form,
    fieldErrors,
    error,
    submitting,
    onClose,
    onChange,
    onSubmit,
}: EdcDeviceModalProps): JSX.Element | null {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#26313C]/75 px-4 py-6 backdrop-blur-sm">
            <div className="relative max-h-[calc(100dvh-48px)] w-full max-w-[560px] overflow-y-auto rounded-[14px] bg-white p-5 shadow-2xl sm:p-8">
                <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    aria-label="ปิด"
                    className="absolute right-6 top-6 text-[#061D36] disabled:opacity-50"
                >
                    <LuX size={22} />
                </button>

                <h2 className="text-[24px] font-bold text-[#061D36]">
                    {mode === "create" ? "ลงทะเบียนเครื่อง EDC" : "แก้ไขเครื่อง EDC"}
                </h2>
                <p className="mt-1 text-[14px] text-[#6B7280]">
                    เครื่อง EDC ไม่ต้อง Activate ลงทะเบียนเลขเครื่องไว้ให้ระบบตรวจสอบเท่านั้น
                </p>

                <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <TextField
                            id="edc-name"
                            label="ชื่อเครื่อง"
                            required
                            value={form.deviceName}
                            placeholder="เช่น EDC เคาน์เตอร์ 1"
                            error={fieldErrors.deviceName}
                            onChange={(value) => onChange({ deviceName: value })}
                        />
                    </div>

                    <TextField
                        id="edc-terminal-id"
                        label="Terminal ID (TID บนสลิป)"
                        required
                        value={form.terminalId}
                        placeholder="เช่น TID-12345678"
                        error={fieldErrors.terminalId}
                        onChange={(value) => onChange({ terminalId: value })}
                    />
                    <TextField
                        id="edc-merchant-id"
                        label="Merchant ID (MID)"
                        value={form.merchantId ?? ""}
                        error={fieldErrors.merchantId}
                        onChange={(value) => onChange({ merchantId: value })}
                    />
                    <TextField
                        id="edc-provider"
                        label="ผู้ให้บริการ / ธนาคาร"
                        value={form.provider ?? ""}
                        placeholder="เช่น KBank"
                        error={fieldErrors.provider}
                        onChange={(value) => onChange({ provider: value })}
                    />
                    <TextField
                        id="edc-serial"
                        label="Serial No."
                        value={form.serialNo ?? ""}
                        error={fieldErrors.serialNo}
                        onChange={(value) => onChange({ serialNo: value })}
                    />
                    <div className="sm:col-span-2">
                        <TextField
                            id="edc-location"
                            label="ตำแหน่ง"
                            value={form.location ?? ""}
                            placeholder="เช่น Lobby"
                            error={fieldErrors.location}
                            onChange={(value) => onChange({ location: value })}
                        />
                    </div>

                    <div className="sm:col-span-2">
                        <label htmlFor="edc-usage" className="mb-2 block text-[13px] text-[#6B7280]">
                            การใช้งาน <span className="text-red-600">*</span>
                        </label>
                        <select
                            id="edc-usage"
                            value={form.usage}
                            onChange={(event) => onChange({ usage: event.target.value as EdcDevicePayload["usage"] })}
                            className={`${inputClass} ${fieldErrors.usage ? "border-red-400" : "border-[#E5E7EB]"}`}
                        >
                            {EDC_USAGE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <FieldError message={fieldErrors.usage} />
                    </div>

                    {mode === "edit" ? (
                        <>
                            <div className="sm:col-span-2">
                                <label htmlFor="edc-status" className="mb-2 block text-[13px] text-[#6B7280]">
                                    สถานะ
                                </label>
                                <select
                                    id="edc-status"
                                    value={form.status ?? "active"}
                                    onChange={(event) => onChange({ status: event.target.value as DeviceStatusInput })}
                                    className={`${inputClass} ${fieldErrors.status ? "border-red-400" : "border-[#E5E7EB]"}`}
                                >
                                    {EDC_STATUS_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-1 text-[12px] text-[#6B7280]">
                                    เครื่องที่ส่งซ่อมหรือปิดใช้งานจะเลือกในหน้ารับชำระไม่ได้
                                </p>
                                <FieldError message={fieldErrors.status} />
                            </div>
                            <div className="sm:col-span-2">
                                <label htmlFor="edc-note" className="mb-2 block text-[13px] text-[#6B7280]">
                                    หมายเหตุ
                                </label>
                                <textarea
                                    id="edc-note"
                                    rows={2}
                                    value={form.note ?? ""}
                                    onChange={(event) => onChange({ note: event.target.value })}
                                    className="w-full rounded-md border border-[#E5E7EB] bg-[#F1F2F3] px-4 py-2 text-[14px] outline-none"
                                />
                            </div>
                        </>
                    ) : null}
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
                        disabled={submitting}
                        className="h-11 min-w-[110px] rounded-full bg-[#9CA3AF] px-6 text-[14px] font-bold text-white disabled:opacity-60"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="button"
                        onClick={onSubmit}
                        disabled={submitting}
                        className="h-11 min-w-[110px] rounded-full bg-[#061D36] px-6 text-[14px] font-bold text-white disabled:opacity-60"
                    >
                        {submitting ? "กำลังบันทึก..." : mode === "create" ? "ลงทะเบียน" : "บันทึก"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export { EDC_USAGE_OPTIONS, EDC_STATUS_OPTIONS, EdcDeviceModal };
