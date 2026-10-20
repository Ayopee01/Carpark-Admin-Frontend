"use client";
// Import Library
import { useState, type JSX } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LuX } from "react-icons/lu";
// Import Components
import { FieldError } from "@/src/app/components/shared/FieldError";
import { SelectField } from "@/src/app/components/shared/SelectField";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/src/app/components/ui/dialog";
import { Checkbox } from "@/src/app/components/ui/checkbox";
// Import Client
import { applyFieldErrors } from "@/src/app/lib/client/forms";
// Import Landing
import { groupIpFieldErrors } from "@/src/app/lib/landing/device";
// Import Shared
import { getErrorMessage, getFieldErrors } from "@/src/app/lib/shared/http";
import { deviceSchema } from "@/src/app/lib/shared/schemas/device";
// Import Types
import type { FieldErrors } from "@/src/app/type/api/common";
import type { DeviceModalProps, DevicePayload } from "@/src/app/type/ui/device";
import type { PeripheralDevice } from "@/src/app/type/api/devices";

/* -------------------------------------- Component -------------------------------------- */

// Function dialog สร้าง/แก้ไข kiosk และ barrier gate พร้อมเลือกกล้อง printer และ EDC
// (หน้าแม่ใส่ key ใหม่ทุกครั้งที่เปิด ฟอร์มเริ่มจาก defaultValues)
function DeviceModal({
    open,
    mode,
    defaultValues,
    cameraDevices,
    printerDevices,
    deviceTypes,
    edcDevices = [],
    edcOwnerById = new Map(),
    editingId,
    activationResult,
    cameraOwnerById,
    printerOwnersById,
    onClose,
    onSubmit,
    getActivationCode,
    formatDateTime,
}: DeviceModalProps): JSX.Element {
    const [formError, setFormError] = useState("");
    // schema ตรวจแค่ชื่อและประเภท (looseObject ส่ง field อื่นผ่าน) จึงบอก type ของค่าที่ได้เอง
    const { control, register, getValues, setValue, handleSubmit, setError, formState } = useForm<DevicePayload>({
        resolver: zodResolver(deviceSchema) as unknown as Resolver<DevicePayload>,
        defaultValues,
    });
    // ค่าทั้งฟอร์มใช้คำนวณส่วนที่แสดง (ประเภท ทิศทาง กล้อง printer)
    const form = useWatch({ control }) as DevicePayload;
    const submitting = formState.isSubmitting;
    const fieldErrors: FieldErrors = Object.fromEntries(
        Object.entries(formState.errors).map(([field, value]) => [field, value.message as string | undefined])
    );

    // แก้หลายช่องพร้อมกันจากค่าเดิม (เปลี่ยนประเภท, ติ๊กกล้อง/printer) ใส่เฉพาะช่องที่เปลี่ยน
    function onChange(update: (prev: DevicePayload) => DevicePayload) {
        const prev = getValues();
        const next = update(prev);
        (Object.keys(next) as (keyof DevicePayload)[]).forEach((key) => {
            if (next[key] !== prev[key]) setValue(key, next[key] as never, { shouldDirty: true });
        });
    }

    // ตรวจ schema ก่อนส่ง แล้วใส่ error ของ backend เข้าช่อง (allowedIps.N รวมเป็นช่องเดียว)
    const submit = handleSubmit(async (values) => {
        setFormError("");
        try {
            await onSubmit(values);
        } catch (err) {
            applyFieldErrors(setError, groupIpFieldErrors(getFieldErrors(err)));
            setFormError(getErrorMessage(err, "เกิดข้อผิดพลาด"));
        }
    });

    const normalizedDeviceType = form.deviceType.toLowerCase();
    const isKiosk = normalizedDeviceType === "kiosk";
    const isBarrierGate =
        normalizedDeviceType === "barrier_gate" || normalizedDeviceType === "barrier";
    const isActivationCreateFlow = mode === "create" && (isKiosk || isBarrierGate);
    const selectedCameraIds = form.cameraIds ?? [];
    const selectedPrinterIds = form.printerIds ?? [];
    const activationCode = getActivationCode(activationResult ?? null);
    const isRecoveryCode = Boolean(activationResult?.recovery);
    const activationExpiresAt =
        activationResult?.expiresAt ?? form.expiresAt ?? null;
    const statusLabel =
        form.status === "pending_activation"
            ? "Pending activation"
            : form.status === "active"
              ? "Active"
              : form.status === "offline"
                ? "Offline"
                : form.status;
    const statusClassName =
        form.status === "pending_activation"
            ? "text-[#D97706]"
            : form.isOnline
              ? "text-[#16A34A]"
              : "text-[#EF4444]";

    const directionMatchedCameras = cameraDevices.filter((camera) => {

        if (!form.direction || !camera.direction) return true;

        return camera.direction === form.direction;
    });
    const hiddenCameraCount = cameraDevices.length - directionMatchedCameras.length;
    const offlineCameraCount = directionMatchedCameras.filter(
        (camera) => !camera.isOnline
    ).length;

    const getCameraLabel = (camera: PeripheralDevice) => {
        const cameraId = camera.id;
        const direction = camera.direction ? ` / ${camera.direction}` : "";
        const gate = camera.gateId ? ` / ${camera.gateId}` : "";

        return `${camera.deviceName} (${cameraId}${direction}${gate})`;
    };

    const getPrinterLabel = (printer: PeripheralDevice) => {
        const printerId = printer.id;
        const role = printer.printerRole ? ` / ${printer.printerRole}` : "";
        const location = printer.location ? ` / ${printer.location}` : "";

        return `${printer.deviceName} (${printerId}${role}${location})`;
    };

    const getCameraOwnerLabel = (cameraId: string) => {
        const owner = cameraOwnerById.get(cameraId);
        const currentDeviceId = form.deviceId ?? form.deviceCode;

        if (!owner) return "";
        if (owner.deviceId === currentDeviceId || owner.id === currentDeviceId) return "";

        return owner.deviceName;
    };

    const getPrinterOwnerLabels = (printerId: string) => {
        const currentDeviceId = form.deviceId ?? form.deviceCode;

        return (printerOwnersById.get(printerId) ?? [])
            .filter((owner) => owner.deviceId !== currentDeviceId && owner.id !== currentDeviceId)
            .map((owner) => owner.deviceName);
    };

    const handleDeviceTypeChange = (value: string) => {
        const nextIsBarrierGate = value === "barrier_gate" || value === "barrier";

        onChange((prev) => ({
            ...prev,
            deviceType: value,
            connectionType: "",
            ipAddress: null,
            status: "pending_activation",
            isOnline: false,
            gateId: nextIsBarrierGate ? prev.gateId ?? "" : null,
            direction: nextIsBarrierGate ? prev.direction ?? "IN" : null,
            cameraRole: null,
            printerRole: null,
            cameraIds: nextIsBarrierGate ? prev.cameraIds ?? [] : [],
            printerIds: value === "kiosk" || nextIsBarrierGate ? prev.printerIds ?? [] : [],
        }));
    };

    const toggleCameraId = (cameraId: string) => {
        onChange((prev) => {
            const currentCameraIds = prev.cameraIds ?? [];
            const nextCameraIds = currentCameraIds.includes(cameraId)
                ? currentCameraIds.filter((item) => item !== cameraId)
                : [...currentCameraIds, cameraId];

            return {
                ...prev,
                cameraIds: nextCameraIds,
            };
        });
    };

    const togglePrinterId = (printerId: string) => {
        onChange((prev) => {
            const currentPrinterIds = prev.printerIds ?? [];
            const nextPrinterIds = currentPrinterIds.includes(printerId)
                ? currentPrinterIds.filter((item) => item !== printerId)
                : [...currentPrinterIds, printerId];

            return {
                ...prev,
                printerIds: nextPrinterIds,
            };
        });
    };

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogContent
                locked={submitting}
                overlayClassName="bg-[#26313C]/75 backdrop-blur-sm"
                className="max-h-[calc(100dvh-48px)] max-w-[520px] overflow-y-auto rounded-[14px] bg-white p-5 shadow-2xl sm:p-8"
            >
                <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    aria-label="ปิด"
                    className="absolute right-6 top-6 text-[#061D36] disabled:opacity-60"
                >
                    <LuX size={22} />
                </button>

                <DialogTitle className="text-[24px] font-bold text-[#061D36]">
                    {mode === "create" ? "Add device" : "Edit device mapping"}
                </DialogTitle>

                <DialogDescription className="mt-1 text-[14px] text-[#6B7280]">
                    {isActivationCreateFlow
                        ? "Create an activation code for Kiosk or Barrier Gate."
                        : "Update camera and printer mapping by deviceId."}
                </DialogDescription>

                {activationCode ? (
                    <div className="mt-7 rounded-[14px] border border-[#BBF7D0] bg-[#F0FDF4] p-5">
                        <p className="text-[18px] font-bold text-[#166534]">
                            {isRecoveryCode ? "Activation code refreshed" : "Activation code created"}
                        </p>
                        {activationResult?.message ? (
                            <p className="mt-1 text-[13px] text-[#15803D]">
                                {activationResult.message}
                            </p>
                        ) : null}

                        <div className="mt-5 rounded-[12px] bg-white p-4">
                            <p className="text-[12px] font-medium text-[#64748B]">
                                Activation Code
                            </p>
                            <p className="mt-2 break-all text-[28px] font-black leading-none tracking-[4px] text-[#061D36] sm:text-[36px] sm:tracking-[6px]">
                                {activationCode}
                            </p>
                        </div>

                        {isRecoveryCode ? (
                            <div className="mt-4 rounded-[12px] border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 text-[13px] font-medium leading-relaxed text-[#1D4ED8]">
                                Use this code on the existing Kiosk or Barrier Gate. The device will receive a new device token after activation, while the same deviceId and existing camera/printer mappings remain unchanged. You do not need to create a new device.
                            </div>
                        ) : null}

                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-[10px] bg-white p-3">
                                <p className="text-[12px] text-[#64748B]">
                                    Device ID
                                </p>
                                <p className="mt-1 text-[14px] font-bold text-[#061D36]">
                                    {activationResult?.deviceId ?? "Waiting for activation"}
                                </p>
                            </div>

                            <div className="rounded-[10px] bg-white p-3">
                                <p className="text-[12px] text-[#64748B]">
                                    Expires At
                                </p>
                                <p className="mt-1 text-[14px] font-bold text-[#061D36]">
                                    {formatDateTime(activationExpiresAt)}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label className="mb-2 block text-[13px] text-[#6B7280]">
                                Device Name
                            </label>
                            <input
                                {...register("deviceName")}
                                placeholder="Kiosk A"
                                className="h-11 w-full rounded-md border border-[#E5E7EB] bg-[#F1F2F3] px-4 text-[14px] outline-none"
                            />
                            <FieldError message={fieldErrors.deviceName} />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="mb-2 block text-[13px] text-[#6B7280]">
                                Device Type
                            </label>
                            <SelectField
                                aria-label="Device Type"
                                value={form.deviceType}
                                onValueChange={handleDeviceTypeChange}
                                disabled={mode === "edit"}
                                placeholder="Select type"
                                options={deviceTypes.map((item) => ({ value: item.code, label: item.label }))}
                                className="h-11 w-full rounded-md border border-[#E5E7EB] bg-[#F1F2F3] px-4 text-[14px]"
                            />
                            <FieldError message={fieldErrors.deviceType} />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="mb-2 block text-[13px] text-[#6B7280]">
                                Location
                            </label>
                            <input
                                {...register("location")}
                                placeholder="Zone A"
                                className="h-11 w-full rounded-md border border-[#E5E7EB] bg-[#F1F2F3] px-4 text-[14px] outline-none"
                            />
                            <FieldError message={fieldErrors.location} />
                        </div>

                        {isBarrierGate ? (
                            <>
                                <div>
                                    <label className="mb-2 block text-[13px] text-[#6B7280]">
                                        Gate ID
                                    </label>
                                    <input
                                        {...register("gateId")}
                                        placeholder="GATE-A"
                                        className="h-11 w-full rounded-md border border-[#E5E7EB] bg-[#F1F2F3] px-4 text-[14px] outline-none"
                                    />
                                    <FieldError message={fieldErrors.gateId} />
                                </div>

                                <div>
                                    <label className="mb-2 block text-[13px] text-[#6B7280]">
                                        Direction
                                    </label>
                                    <SelectField
                                        aria-label="Direction"
                                        value={form.direction ?? "IN"}
                                        onValueChange={(value) =>
                                            onChange((prev) => ({
                                                ...prev,
                                                direction: value === "OUT" ? "OUT" : "IN",
                                                cameraIds: [],
                                            }))
                                        }
                                        options={[
                                            { value: "IN", label: "IN" },
                                            { value: "OUT", label: "OUT" },
                                        ]}
                                        className="h-11 w-full rounded-md border border-[#E5E7EB] bg-[#F1F2F3] px-4 text-[14px]"
                                    />
                                    <FieldError message={fieldErrors.direction} />
                                </div>

                                <div className="sm:col-span-2">
                                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                        <label className="block text-[13px] text-[#6B7280]">
                                            Cameras
                                        </label>
                                        <FieldError message={fieldErrors.cameraIds} className="order-last basis-full" />
                                        {hiddenCameraCount > 0 ? (
                                            <span className="text-[12px] font-medium text-[#D97706]">
                                                Hidden {hiddenCameraCount} camera(s) with different direction
                                            </span>
                                        ) : null}
                                    </div>

                                    {offlineCameraCount > 0 ? (
                                        <p className="mb-2 rounded-md border border-[#FED7AA] bg-[#FFF7ED] px-3 py-2 text-[12px] font-medium leading-relaxed text-[#C2410C]">
                                            {offlineCameraCount} camera(s) are offline. Mapping is allowed, but LPR will work after check-in.
                                        </p>
                                    ) : null}

                                    <div className="max-h-[190px] space-y-2 overflow-y-auto rounded-md border border-[#E5E7EB] bg-[#F8FAFC] p-3">
                                        {directionMatchedCameras.length === 0 ? (
                                            <p className="text-[13px] text-[#EF4444]">
                                                No camera matches this direction.
                                            </p>
                                        ) : (
                                            directionMatchedCameras.map((camera) => {
                                                const cameraId = camera.id;
                                                const ownerLabel = getCameraOwnerLabel(cameraId);

                                                return (
                                                    <label
                                                        key={cameraId}
                                                        className="flex items-start gap-3 rounded-md bg-white px-3 py-2 text-[13px] text-[#061D36]"
                                                    >
                                                        <Checkbox
                                                            checked={selectedCameraIds.includes(cameraId)}
                                                            onCheckedChange={() => toggleCameraId(cameraId)}
                                                            className="mt-0.5"
                                                        />
                                                        <span className="min-w-0 break-words">
                                                            {getCameraLabel(camera)}
                                                            {!camera.isOnline ? (
                                                                <span className="ml-2 font-bold text-[#C2410C]">
                                                                    Offline
                                                                </span>
                                                            ) : null}
                                                            {ownerLabel ? (
                                                                <span className="ml-2 font-bold text-[#D97706]">
                                                                    Linked to {ownerLabel}
                                                                </span>
                                                            ) : null}
                                                        </span>
                                                    </label>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : null}

                        {(isKiosk || isBarrierGate) ? (
                            <div className="sm:col-span-2">
                                <label htmlFor="device-edc" className="mb-2 block text-[13px] text-[#6B7280]">
                                    เครื่อง EDC ที่ติดกับอุปกรณ์นี้
                                </label>
                                <SelectField
                                    id="device-edc"
                                    value={form.edcDeviceId ?? ""}
                                    onValueChange={(value) =>
                                        onChange((prev) => ({
                                            ...prev,
                                            edcDeviceId: value,
                                        }))
                                    }
                                    options={[
                                        { value: "", label: "ไม่ผูก" },
                                        ...edcDevices
                                            .filter((edc) => {
                                                if (edc.usage !== "device") return false;
                                                // เครื่องที่ว่าง และเครื่องที่อุปกรณ์นี้ผูกอยู่แล้ว
                                                const owner = edcOwnerById.get(edc.id);
                                                return !owner || owner.id === editingId;
                                            })
                                            .map((edc) => ({
                                                value: edc.id,
                                                label: `${edc.deviceName} (${edc.terminalId})${edc.status !== "active" ? ` - ${edc.status}` : ""}`,
                                            })),
                                    ]}
                                    className={`h-11 w-full rounded-md border bg-[#F1F2F3] px-4 text-[14px] ${fieldErrors.edcDeviceId ? "border-red-400" : "border-[#E5E7EB]"}`}
                                />
                                <p className="mt-1 text-[12px] text-[#6B7280]">
                                    แสดงเฉพาะเครื่อง EDC แบบ &quot;ติดกับ Kiosk / Barrier Gate&quot; ที่ยังไม่ถูกผูก
                                    {isKiosk ? " ถ้าไม่ผูก Kiosk จะรับบัตรไม่ได้" : ""}
                                </p>
                                <FieldError message={fieldErrors.edcDeviceId} />
                            </div>
                        ) : null}

                        <div className="sm:col-span-2">
                            <label htmlFor="device-allowed-ips" className="mb-2 block text-[13px] text-[#6B7280]">
                                IP ที่อนุญาต (ไม่บังคับ บรรทัดละ 1 IP)
                            </label>
                            <textarea
                                id="device-allowed-ips"
                                rows={2}
                                value={(form.allowedIps ?? []).join("\n")}
                                onChange={(event) =>
                                    onChange((prev) => ({
                                        ...prev,
                                        allowedIps: event.target.value.split("\n"),
                                    }))
                                }
                                placeholder="เช่น 10.0.0.21"
                                aria-invalid={Boolean(fieldErrors.allowedIps)}
                                className={`w-full rounded-md border bg-[#F1F2F3] px-4 py-2 text-[14px] outline-none ${fieldErrors.allowedIps ? "border-red-400" : "border-[#E5E7EB]"}`}
                            />
                            <p className="mt-1 text-[12px] text-[#B45309]">
                                ปล่อยว่าง = ไม่จำกัด ถ้า IP ของเครื่องเปลี่ยน เครื่องจะใช้งานไม่ได้จนกว่าจะแก้ค่านี้
                            </p>
                            <FieldError message={fieldErrors.allowedIps} />
                        </div>

                        {(isKiosk || isBarrierGate) ? (
                            <div className="sm:col-span-2">
                                <label className="mb-2 block text-[13px] text-[#6B7280]">
                                    Printers
                                </label>
                                <FieldError message={fieldErrors.printerIds} className="-mt-1 mb-2" />

                                <div className="max-h-[190px] space-y-2 overflow-y-auto rounded-md border border-[#E5E7EB] bg-[#F8FAFC] p-3">
                                    {printerDevices.length === 0 ? (
                                        <p className="text-[13px] text-[#EF4444]">
                                            No printer is available.
                                        </p>
                                    ) : (
                                        printerDevices.map((printer) => {
                                            const printerId = printer.id;
                                            const ownerLabels = getPrinterOwnerLabels(printerId);

                                            return (
                                                <label
                                                    key={printerId}
                                                    className="flex items-start gap-3 rounded-md bg-white px-3 py-2 text-[13px] text-[#061D36]"
                                                >
                                                    <Checkbox
                                                        checked={selectedPrinterIds.includes(printerId)}
                                                        onCheckedChange={() => togglePrinterId(printerId)}
                                                        className="mt-0.5"
                                                    />
                                                    <span className="min-w-0 break-words">
                                                        {getPrinterLabel(printer)}
                                                        {!printer.isOnline ? (
                                                            <span className="ml-2 font-bold text-[#C2410C]">
                                                                Offline
                                                            </span>
                                                        ) : null}
                                                        {ownerLabels.length ? (
                                                            <span className="ml-2 font-bold text-[#D97706]">
                                                                Linked to {ownerLabels.join(", ")}
                                                            </span>
                                                        ) : null}
                                                    </span>
                                                </label>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        ) : null}

                        {mode === "edit" ? (
                            <div className="grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-2">
                                <div className="rounded-[10px] border border-[#E5E7EB] bg-[#F8FAFC] p-3">
                                    <p className="text-[12px] text-[#64748B]">
                                        Device ID
                                    </p>
                                    <p className="mt-1 text-[14px] font-bold text-[#061D36]">
                                        {form.deviceId ?? "Waiting for activation"}
                                    </p>
                                </div>

                                <div className="rounded-[10px] border border-[#E5E7EB] bg-[#F8FAFC] p-3">
                                    <p className="text-[12px] text-[#64748B]">
                                        Status
                                    </p>
                                    <p className={`mt-1 text-[14px] font-bold ${statusClassName}`}>
                                        {statusLabel}
                                    </p>
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}

                {formError ? (
                    <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
                        {formError}
                    </div>
                ) : null}

                <div className="mt-9 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-11 min-w-[110px] rounded-full bg-[#9CA3AF] px-6 text-[14px] font-bold text-white"
                    >
                        {activationCode ? "Close" : "Cancel"}
                    </button>

                    {!activationCode ? (
                        <button
                            type="button"
                            onClick={() => void submit()}
                            disabled={submitting}
                            className="h-11 min-w-[110px] rounded-full bg-[#061D36] px-6 text-[14px] font-bold text-white disabled:opacity-60"
                        >
                            {submitting
                                ? "Saving..."
                                : isActivationCreateFlow
                                  ? "Create Code"
                                  : "Save"}
                        </button>
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    );
}

export { DeviceModal };
