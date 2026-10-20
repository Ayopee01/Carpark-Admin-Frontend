"use client";
// Import Library
import type { JSX } from "react";
import { LuX } from "react-icons/lu";
// Import Components
import { FieldError } from "@/src/app/components/shared/FieldError";
// Import Landing
import { ROLE_OPTIONS } from "@/src/app/lib/landing/member";
// Import Types
import type { MemberRole } from "@/src/app/type/api/members";
import type { AddMemberModalProps } from "@/src/app/type/ui/member";

// Function dialog เพิ่มสมาชิกใหม่
function AddMemberModal({
    open,
    form,
    error = "",
    fieldErrors = {},
    submitting,
    onClose,
    onChange,
    onSubmit,
}: AddMemberModalProps): JSX.Element | null {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#26313C]/75 px-4 py-6 backdrop-blur-sm">
            <div className="relative max-h-[calc(100dvh-48px)] w-full max-w-[520px] overflow-y-auto rounded-[14px] bg-white p-5 shadow-2xl sm:p-8">
                <button type="button" onClick={onClose} className="absolute right-6 top-6 text-[#061D36]">
                    <LuX size={22} />
                </button>

                <h2 className="text-[24px] font-bold text-[#061D36]">เพิ่มสมาชิก</h2>
                <p className="mt-1 text-[14px] text-[#6B7280]">กรอกข้อมูลสมาชิกใหม่</p>

                <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-3">
                        <input
                            value={form.firstName}
                            onChange={(e) => onChange((p) => ({ ...p, firstName: e.target.value }))}
                            placeholder="ระบุชื่อ"
                            className="h-11 rounded-md border border-[#E5E7EB] px-4 outline-none"
                        />
                        <FieldError message={fieldErrors.firstName} className="-mt-2" />
                    </div>

                    <div className="flex flex-col gap-3">
                        <input
                            value={form.lastName}
                            onChange={(e) => onChange((p) => ({ ...p, lastName: e.target.value }))}
                            placeholder="ระบุนามสกุล"
                            className="h-11 rounded-md border border-[#E5E7EB] px-4 outline-none"
                        />
                        <FieldError message={fieldErrors.lastName} className="-mt-2" />
                    </div>

                    <input
                        value={form.email}
                        onChange={(e) => onChange((p) => ({ ...p, email: e.target.value }))}
                        placeholder="example@gridlock.com"
                        className="h-11 rounded-md border border-[#E5E7EB] px-4 outline-none sm:col-span-2"
                    />
                    <FieldError message={fieldErrors.email} className="-mt-2 sm:col-span-2" />

                    <input
                        type="password"
                        value={form.password}
                        onChange={(e) => onChange((p) => ({ ...p, password: e.target.value }))}
                        placeholder="example1234567890"
                        className="h-11 rounded-md border border-[#E5E7EB] px-4 outline-none sm:col-span-2"
                    />
                    <FieldError message={fieldErrors.password} className="-mt-2 sm:col-span-2" />

                    <input
                        value={form.phone}
                        onChange={(e) => onChange((p) => ({ ...p, phone: e.target.value }))}
                        placeholder="08X-XXX-XXXX"
                        className="h-11 rounded-md border border-[#E5E7EB] px-4 outline-none sm:col-span-2"
                    />
                    <FieldError message={fieldErrors.phone} className="-mt-2 sm:col-span-2" />

                    <select
                        value={form.role}
                        onChange={(e) => onChange((p) => ({ ...p, role: e.target.value as MemberRole }))}
                        className="h-11 rounded-md border border-[#E5E7EB] px-4 outline-none sm:col-span-2"
                    >
                        <option value="">เลือกตำแหน่ง</option>
                        {ROLE_OPTIONS.map((role) => (
                            <option key={role.value} value={role.value}>
                                {role.label}
                            </option>
                        ))}
                    </select>
                    <FieldError message={fieldErrors.role} className="-mt-2 sm:col-span-2" />
                </div>

                {error ? (
                    <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
                        {error}
                    </div>
                ) : null}

                <div className="mt-9 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-4">
                    <button type="button" onClick={onClose} className="h-11 min-w-[110px] rounded-full bg-[#9CA3AF] px-6 text-[14px] font-bold text-white">
                        ยกเลิก
                    </button>

                    <button type="button" onClick={onSubmit} disabled={submitting} className="h-11 min-w-[110px] rounded-full bg-[#061D36] px-6 text-[14px] font-bold text-white disabled:opacity-60">
                        ตกลง
                    </button>
                </div>
            </div>
        </div>
    );
}

export { AddMemberModal };
