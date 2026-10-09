"use client";
// Import Library
import type { JSX } from "react";
import { LuX } from "react-icons/lu";
// Import Types
import type { PermissionModalProps } from "@/src/app/type/ui/member";

// Function dialog เลือก permission ของสมาชิก แสดงเฉพาะที่ผู้ใช้ปัจจุบันให้ได้
function PermissionModal({
    open,
    permissions,
    selectedPermissions,
    isGrantable = () => true,
    submitting,
    onClose,
    onToggle,
    onSubmit,
}: PermissionModalProps): JSX.Element | null {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#111827]/80 px-4 py-6 backdrop-blur-sm">
            <div className="relative max-h-[calc(100dvh-48px)] w-full max-w-[460px] overflow-y-auto rounded-[14px] bg-white shadow-2xl">
                <div className="bg-[#E9EAEC] px-7 py-5">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="absolute right-6 top-6 text-[#061D36] disabled:opacity-60"
                    >
                        <LuX size={22} />
                    </button>

                    <h2 className="text-[24px] font-bold text-[#061D36]">
                        ตั้งค่าสิทธิ์
                    </h2>
                    <p className="text-[13px] text-[#6B7280]">การอนุญาตสิทธิ์</p>
                </div>

                <div className="px-5 py-6 sm:px-8 sm:py-7">
                    <div className="space-y-5">
                        {permissions.map((permission) => {
                            const grantable = isGrantable(permission.key);

                            return (
                            <label
                                key={permission.key}
                                title={grantable ? undefined : "บัญชีของคุณไม่มีสิทธิ์นี้ จึงให้ผู้อื่นไม่ได้"}
                                className={`flex items-center justify-between ${grantable ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
                            >
                                <span className="flex items-center gap-4 text-[14px] text-[#111827]">
                                    <span className="text-[18px]">{permission.icon}</span>
                                    {permission.label}
                                    {grantable ? null : (
                                        <span className="text-[11px] text-[#9CA3AF]">(คุณไม่มีสิทธิ์นี้)</span>
                                    )}
                                </span>

                                <input
                                    type="checkbox"
                                    checked={selectedPermissions.includes(permission.key)}
                                    onChange={() => onToggle(permission.key)}
                                    disabled={submitting || !grantable}
                                    className="h-4 w-4 accent-[#061D36] disabled:cursor-not-allowed disabled:opacity-60"
                                />
                            </label>
                            );
                        })}
                    </div>

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
                            {submitting ? "กำลังบันทึก..." : "ตกลง"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export { PermissionModal };
