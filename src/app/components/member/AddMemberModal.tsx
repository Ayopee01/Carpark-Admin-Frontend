"use client";
// Import Library
import { useState, type JSX } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LuX } from "react-icons/lu";
// Import Components
import { FieldError } from "@/src/app/components/shared/FieldError";
import { SelectField } from "@/src/app/components/shared/SelectField";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/src/app/components/ui/dialog";
// Import Client
import { applyServerErrors } from "@/src/app/lib/client/forms";
// Import Landing
import { ROLE_OPTIONS } from "@/src/app/lib/landing/member";
// Import Shared
import { getErrorMessage } from "@/src/app/lib/shared/http";
import { createMemberSchema } from "@/src/app/lib/shared/schemas/member";
// Import Types
import type { AddMemberModalProps, CreateMemberForm } from "@/src/app/type/ui/member";

// Config ค่าเริ่มต้นของฟอร์มเพิ่มสมาชิก
const EMPTY_MEMBER_FORM: CreateMemberForm = {
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    role: "staff",
};

// Config class ของช่องกรอก
const inputClass = "h-11 rounded-md border border-[#E5E7EB] px-4 outline-none aria-invalid:border-red-400";

// Function dialog เพิ่มสมาชิกใหม่ (หน้าแม่ใส่ key ใหม่ทุกครั้งที่เปิด ฟอร์มจึงเริ่มจากค่าว่าง)
function AddMemberModal({ open, onClose, onSubmit }: AddMemberModalProps): JSX.Element {
    const [formError, setFormError] = useState("");
    const {
        register,
        control,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<CreateMemberForm>({ resolver: zodResolver(createMemberSchema), defaultValues: EMPTY_MEMBER_FORM });

    // ตรวจ schema ก่อนส่ง แล้วใส่ error ของ backend เข้าช่อง (backend ใช้ username/name แทน email/ชื่อ)
    const submit = handleSubmit(async (values) => {
        setFormError("");
        try {
            await onSubmit(values);
        } catch (err) {
            applyServerErrors(setError, err, { username: "email", name: "firstName" });
            setFormError(getErrorMessage(err, "เพิ่มสมาชิกไม่สำเร็จ"));
        }
    });

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogContent
                locked={isSubmitting}
                overlayClassName="bg-[#26313C]/75 backdrop-blur-sm"
                className="max-h-[calc(100dvh-48px)] max-w-[520px] overflow-y-auto rounded-[14px] bg-white p-5 shadow-2xl sm:p-8"
            >
                <DialogClose aria-label="ปิด" disabled={isSubmitting} className="absolute right-6 top-6 text-[#061D36] disabled:opacity-60">
                    <LuX size={22} />
                </DialogClose>

                <DialogTitle className="text-[24px] font-bold text-[#061D36]">เพิ่มสมาชิก</DialogTitle>
                <DialogDescription className="mt-1 text-[14px] text-[#6B7280]">กรอกข้อมูลสมาชิกใหม่</DialogDescription>

                <form noValidate onSubmit={(event) => void submit(event)}>
                    <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-3">
                            <input {...register("firstName")} placeholder="ระบุชื่อ" aria-invalid={Boolean(errors.firstName)} className={inputClass} />
                            <FieldError message={errors.firstName?.message} className="-mt-2" />
                        </div>

                        <div className="flex flex-col gap-3">
                            <input {...register("lastName")} placeholder="ระบุนามสกุล" aria-invalid={Boolean(errors.lastName)} className={inputClass} />
                            <FieldError message={errors.lastName?.message} className="-mt-2" />
                        </div>

                        <input {...register("email")} type="email" placeholder="example@gridlock.com" aria-invalid={Boolean(errors.email)} className={`${inputClass} sm:col-span-2`} />
                        <FieldError message={errors.email?.message} className="-mt-2 sm:col-span-2" />

                        <input {...register("password")} type="password" placeholder="example1234567890" aria-invalid={Boolean(errors.password)} className={`${inputClass} sm:col-span-2`} />
                        <FieldError message={errors.password?.message} className="-mt-2 sm:col-span-2" />

                        <input {...register("phone")} placeholder="08X-XXX-XXXX" aria-invalid={Boolean(errors.phone)} className={`${inputClass} sm:col-span-2`} />
                        <FieldError message={errors.phone?.message} className="-mt-2 sm:col-span-2" />

                        <Controller
                            control={control}
                            name="role"
                            render={({ field }) => (
                                <SelectField
                                    aria-label="ตำแหน่ง"
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    placeholder="เลือกตำแหน่ง"
                                    options={ROLE_OPTIONS}
                                    className="h-11 rounded-md border border-[#E5E7EB] px-4 sm:col-span-2"
                                />
                            )}
                        />
                        <FieldError message={errors.role?.message} className="-mt-2 sm:col-span-2" />
                    </div>

                    {formError ? (
                        <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
                            {formError}
                        </div>
                    ) : null}

                    <div className="mt-9 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-4">
                        <button type="button" onClick={onClose} disabled={isSubmitting} className="h-11 min-w-[110px] rounded-full bg-[#9CA3AF] px-6 text-[14px] font-bold text-white disabled:opacity-60">
                            ยกเลิก
                        </button>

                        <button type="submit" disabled={isSubmitting} className="h-11 min-w-[110px] rounded-full bg-[#061D36] px-6 text-[14px] font-bold text-white disabled:opacity-60">
                            {isSubmitting ? "กำลังบันทึก..." : "ตกลง"}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export { AddMemberModal };
