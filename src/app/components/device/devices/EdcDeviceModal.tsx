"use client";
// Import Library
import { useState, type JSX, type ComponentProps } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LuX } from "react-icons/lu";
// Import Components
import { FieldError } from "@/src/app/components/shared/FieldError";
import { SelectField } from "@/src/app/components/shared/SelectField";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/src/app/components/ui/dialog";
// Import Client
import { applyServerErrors } from "@/src/app/lib/client/forms";
// Import Shared
import { ApiError, getErrorMessage } from "@/src/app/lib/shared/http";
import { edcDeviceSchema } from "@/src/app/lib/shared/schemas/device";
// Import Types
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


// Function ช่องกรอกข้อความพร้อม label และ error (ส่ง register(...) ของฟอร์มผ่าน inputProps)
function TextField({
    id,
    label,
    required,
    placeholder,
    error,
    inputProps,
}: {
    id: string;
    label: string;
    required?: boolean;
    placeholder?: string;
    error?: string;
    inputProps: ComponentProps<"input">;
}): JSX.Element {
    return (
        <div>
            <label htmlFor={id} className="mb-2 block text-[13px] text-[#6B7280]">
                {label} {required ? <span className="text-red-600">*</span> : null}
            </label>
            <input
                id={id}
                placeholder={placeholder}
                {...inputProps}
                aria-invalid={Boolean(error)}
                className={`${inputClass} ${error ? "border-red-400" : "border-[#E5E7EB]"}`}
            />
            <FieldError message={error} />
        </div>
    );
}

/* -------------------------------------- Component -------------------------------------- */

// Function dialog ลงทะเบียน/แก้ไขเครื่อง EDC (หน้าแม่ใส่ key ใหม่ทุกครั้งที่เปิด ฟอร์มเริ่มจาก defaultValues)
function EdcDeviceModal({ open, mode, defaultValues, onClose, onSubmit }: EdcDeviceModalProps): JSX.Element {
    const [formError, setFormError] = useState("");
    const {
        register,
        control,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting: submitting },
    } = useForm<EdcDevicePayload>({ resolver: zodResolver(edcDeviceSchema), defaultValues });

    // ตรวจ schema ก่อนส่ง แล้วใส่ error ของ backend เข้าช่อง (TID ซ้ำ / เครื่องผูกอยู่ ใส่ใต้ช่องที่เกี่ยวข้อง)
    const submit = handleSubmit(async (values) => {
        setFormError("");
        try {
            await onSubmit(values);
        } catch (err) {
            applyServerErrors(setError, err);
            if (err instanceof ApiError && err.code === "EDC_TERMINAL_ID_EXISTS") setError("terminalId", { type: "server", message: err.message });
            if (err instanceof ApiError && err.code === "EDC_DEVICE_IN_USE") setError("usage", { type: "server", message: err.message });
            setFormError(getErrorMessage(err, "บันทึกเครื่อง EDC ไม่สำเร็จ"));
        }
    });
    return (
        <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogContent
                locked={submitting}
                overlayClassName="bg-[#26313C]/75 backdrop-blur-sm"
                className="max-h-[calc(100dvh-48px)] max-w-[560px] overflow-y-auto rounded-[14px] bg-white p-5 shadow-2xl sm:p-8"
            >
                <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    aria-label="ปิด"
                    className="absolute right-6 top-6 text-[#061D36] disabled:opacity-50"
                >
                    <LuX size={22} />
                </button>

                <DialogTitle className="text-[24px] font-bold text-[#061D36]">
                    {mode === "create" ? "ลงทะเบียนเครื่อง EDC" : "แก้ไขเครื่อง EDC"}
                </DialogTitle>
                <DialogDescription className="mt-1 text-[14px] text-[#6B7280]">
                    เครื่อง EDC ไม่ต้อง Activate ลงทะเบียนเลขเครื่องไว้ให้ระบบตรวจสอบเท่านั้น
                </DialogDescription>

                <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <TextField
                            id="edc-name"
                            label="ชื่อเครื่อง"
                            required
                            placeholder="เช่น EDC เคาน์เตอร์ 1"
                            error={errors.deviceName?.message}
                            inputProps={register("deviceName")}
                        />
                    </div>

                    <TextField
                        id="edc-terminal-id"
                        label="Terminal ID (TID บนสลิป)"
                        required
                        placeholder="เช่น TID-12345678"
                        error={errors.terminalId?.message}
                        inputProps={register("terminalId")}
                    />
                    <TextField
                        id="edc-merchant-id"
                        label="Merchant ID (MID)"
                        error={errors.merchantId?.message}
                        inputProps={register("merchantId")}
                    />
                    <TextField
                        id="edc-provider"
                        label="ผู้ให้บริการ / ธนาคาร"
                        placeholder="เช่น KBank"
                        error={errors.provider?.message}
                        inputProps={register("provider")}
                    />
                    <TextField
                        id="edc-serial"
                        label="Serial No."
                        error={errors.serialNo?.message}
                        inputProps={register("serialNo")}
                    />
                    <div className="sm:col-span-2">
                        <TextField
                            id="edc-location"
                            label="ตำแหน่ง"
                            placeholder="เช่น Lobby"
                            error={errors.location?.message}
                            inputProps={register("location")}
                        />
                    </div>

                    <div className="sm:col-span-2">
                        <label htmlFor="edc-usage" className="mb-2 block text-[13px] text-[#6B7280]">
                            การใช้งาน <span className="text-red-600">*</span>
                        </label>
                        <Controller
                            control={control}
                            name="usage"
                            render={({ field }) => (
                                <SelectField
                                    id="edc-usage"
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    options={EDC_USAGE_OPTIONS}
                                    className={`${inputClass} ${errors.usage ? "border-red-400" : "border-[#E5E7EB]"}`}
                                />
                            )}
                        />
                        <FieldError message={errors.usage?.message} />
                    </div>

                    {mode === "edit" ? (
                        <>
                            <div className="sm:col-span-2">
                                <label htmlFor="edc-status" className="mb-2 block text-[13px] text-[#6B7280]">
                                    สถานะ
                                </label>
                                <Controller
                                    control={control}
                                    name="status"
                                    render={({ field }) => (
                                        <SelectField
                                            id="edc-status"
                                            value={field.value ?? "active"}
                                            onValueChange={field.onChange}
                                            options={EDC_STATUS_OPTIONS}
                                            className={`${inputClass} ${errors.status ? "border-red-400" : "border-[#E5E7EB]"}`}
                                        />
                                    )}
                                />
                                <p className="mt-1 text-[12px] text-[#6B7280]">
                                    เครื่องที่ส่งซ่อมหรือปิดใช้งานจะเลือกในหน้ารับชำระไม่ได้
                                </p>
                                <FieldError message={errors.status?.message} />
                            </div>
                            <div className="sm:col-span-2">
                                <label htmlFor="edc-note" className="mb-2 block text-[13px] text-[#6B7280]">
                                    หมายเหตุ
                                </label>
                                <textarea
                                    id="edc-note"
                                    rows={2}
                                    {...register("note")}
                                    className="w-full rounded-md border border-[#E5E7EB] bg-[#F1F2F3] px-4 py-2 text-[14px] outline-none"
                                />
                            </div>
                        </>
                    ) : null}
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
                        disabled={submitting}
                        className="h-11 min-w-[110px] rounded-full bg-[#9CA3AF] px-6 text-[14px] font-bold text-white disabled:opacity-60"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="button"
                        onClick={() => void submit()}
                        disabled={submitting}
                        className="h-11 min-w-[110px] rounded-full bg-[#061D36] px-6 text-[14px] font-bold text-white disabled:opacity-60"
                    >
                        {submitting ? "กำลังบันทึก..." : mode === "create" ? "ลงทะเบียน" : "บันทึก"}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export { EDC_USAGE_OPTIONS, EDC_STATUS_OPTIONS, EdcDeviceModal };
