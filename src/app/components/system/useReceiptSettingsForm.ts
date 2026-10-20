"use client";
// Import Library
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
// Import Actions
import { updateReceiptSettings } from "@/src/app/lib/actions/system-settings";
// Import Client
import { queryKeys, systemSettingsQuery } from "@/src/app/lib/client/queries";
import { unwrap } from "@/src/app/lib/client/http";
// Import Landing
import { DEFAULT_RECEIPT_SETTINGS, toReceiptForm } from "@/src/app/lib/landing/system";
// Import Types
import type { SystemSettingsUpdateRequest } from "@/src/app/type/api/system-settings";
import type { ReceiptSettingsForm } from "@/src/app/type/ui/system";
// Import Shared
import { getErrorMessage } from "@/src/app/lib/shared/http";
import { receiptSettingsSchema } from "@/src/app/lib/shared/schemas/system";

// Type ส่วนของใบเสร็จที่แต่ละแท็บบันทึก (PUT /system-settings merge ทีละ field)
type ReceiptPatch = NonNullable<SystemSettingsUpdateRequest["receipt"]>;

// Type ผลของ hook ฟอร์มใบเสร็จ
type ReceiptSettingsFormState = {
  form: UseFormReturn<ReceiptSettingsForm>;
  isPending: boolean;
  error: string;
  submit: () => Promise<void>;
  cancel: () => void;
};

// Function hook ฟอร์มใบเสร็จของแท็บใบเข้า/ใบหลังชำระ ใช้ cache เดียวกับ GET /system-settings
function useReceiptSettingsForm(toPatch: (values: ReceiptSettingsForm) => ReceiptPatch, successMessage: string): ReceiptSettingsFormState {
  const queryClient = useQueryClient();
  const { data, isPending, error } = useQuery(systemSettingsQuery());
  const receipt = useMemo(() => (data ? toReceiptForm(data.receipt) : DEFAULT_RECEIPT_SETTINGS), [data]);

  // ค่าจาก backend เข้าฟอร์มทุกครั้งที่โหลดใหม่ ช่องที่กำลังแก้อยู่ไม่ถูกทับ
  const form = useForm<ReceiptSettingsForm>({
    resolver: zodResolver(receiptSettingsSchema),
    values: receipt,
    resetOptions: { keepDirtyValues: true },
  });

  // ได้แค่ success/message ต้องโหลดใหม่
  const save = useMutation({
    mutationFn: (values: ReceiptSettingsForm) => unwrap(updateReceiptSettings(toPatch(values))),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.systemSettings }),
  });

  const submit = form.handleSubmit(
    async (values) => {
      try {
        await save.mutateAsync(values);
        form.reset(values);
        toast.success(successMessage);
      } catch (err) {
        toast.error(getErrorMessage(err, "เกิดข้อผิดพลาด"));
      }
    },
    () => toast.error("ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง")
  );

  return {
    form,
    isPending,
    error: error ? getErrorMessage(error, "เกิดข้อผิดพลาด") : "",
    submit: () => submit(),
    cancel: () => form.reset(receipt),
  };
}

export { useReceiptSettingsForm };
