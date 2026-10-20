"use client";
// Import Library
import type { JSX } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LuX } from "react-icons/lu";
// Import Components
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/src/app/components/ui/dialog";
import { Checkbox } from "@/src/app/components/ui/checkbox";
// Import Shared
import { permissionFormSchema } from "@/src/app/lib/shared/schemas/member";
// Import Types
import type { PermissionForm, PermissionModalProps } from "@/src/app/type/ui/member";

// Function dialog เลือก permission ของสมาชิก แสดงเฉพาะที่ผู้ใช้ปัจจุบันให้ได้ (หน้าแม่ใส่ key ใหม่ทุกครั้งที่เปิด)
function PermissionModal({
    open,
    permissions,
    defaultPermissions,
    isGrantable = () => true,
    onClose,
    onSubmit,
}: PermissionModalProps): JSX.Element {
    const { control, handleSubmit, formState: { isSubmitting: submitting } } = useForm<PermissionForm>({
        resolver: zodResolver(permissionFormSchema),
        defaultValues: { permissions: defaultPermissions },
    });

    // เรียงตามลำดับของรายการสิทธิ์เสมอ
    const submit = handleSubmit(async (values) => {
        try {
            await onSubmit(permissions.map((item) => item.key).filter((key) => values.permissions.includes(key)));
        } catch {
            // หน้าแม่แจ้ง error แล้ว คง dialog ไว้
        }
    });

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogContent
                locked={submitting}
                overlayClassName="bg-[#111827]/80 backdrop-blur-sm"
                className="max-h-[calc(100dvh-48px)] max-w-[460px] overflow-y-auto rounded-[14px] bg-white shadow-2xl"
            >
                <div className="bg-[#E9EAEC] px-7 py-5">
                    <DialogClose
                        disabled={submitting}
                        aria-label="ปิด"
                        className="absolute right-6 top-6 text-[#061D36] disabled:opacity-60"
                    >
                        <LuX size={22} />
                    </DialogClose>

                    <DialogTitle className="text-[24px] font-bold text-[#061D36]">
                        ตั้งค่าสิทธิ์
                    </DialogTitle>
                    <DialogDescription className="text-[13px] text-[#6B7280]">การอนุญาตสิทธิ์</DialogDescription>
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

                                <Controller
                                    control={control}
                                    name="permissions"
                                    render={({ field }) => (
                                        <Checkbox
                                            checked={field.value.includes(permission.key)}
                                            onCheckedChange={(checked) =>
                                                field.onChange(
                                                    checked
                                                        ? [...field.value, permission.key]
                                                        : field.value.filter((key) => key !== permission.key)
                                                )
                                            }
                                            disabled={submitting || !grantable}
                                        />
                                    )}
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
                            onClick={() => void submit()}
                            disabled={submitting}
                            className="h-11 min-w-[110px] rounded-full bg-[#061D36] px-6 text-[14px] font-bold text-white disabled:opacity-60"
                        >
                            {submitting ? "กำลังบันทึก..." : "ตกลง"}
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export { PermissionModal };
