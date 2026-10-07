"use client";
// Import Library
import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import { LuCamera, LuCreditCard, LuMonitor, LuPencil, LuPlus, LuPrinter, LuRefreshCw, LuTrash2, LuWarehouse } from "react-icons/lu";
// Import Components
import { DeviceModal } from "@/src/app/components/device/devices/DeviceModal";
import { EdcDeviceModal } from "@/src/app/components/device/devices/EdcDeviceModal";
// Import Api
import { createDevice, deleteDevice, getDevices, issueActivationCode, mapCamera, mapPrinter, subscribeDeviceEvents, unmapCamera, unmapPrinter, updateDevice } from "@/src/app/lib/api/devices";
// Import Landing
import { parseIpLines } from "@/src/app/lib/landing/device";
// Import Types
import type { CameraAssignment, CreateActivationDeviceRequest, Device, DeviceEvent, DeviceListResponse, DeviceUpdateRequest, DevicesConfigUpdatedEvent, Direction } from "@/src/app/type/api/devices";
import type { DeviceActivationResult, DeviceMasterItem, DevicePayload, EdcDevicePayload } from "@/src/app/type/ui/device";
// Import Shared
import { ApiError, getErrorMessage, getFieldErrors, isApiErrorCode } from "@/src/app/lib/shared/http";

/* -------------------------------------- Config -------------------------------------- */

// Config deviceType ของ kiosk
const KIOSK_DEVICE_TYPE = "kiosk";

// Config deviceType ของ barrier gate
const BARRIER_GATE_DEVICE_TYPE = "barrier_gate";

// Config deviceType ของกล้อง
const CAMERA_DEVICE_TYPE = "camera";

// Config deviceType ของ printer
const PRINTER_DEVICE_TYPE = "printer";

// Config deviceType ของเครื่อง EDC
const EDC_DEVICE_TYPE = "edc";

// Config รอ snapshot แรกจาก SSE ก่อนโหลดผ่าน API แทน
const FIRST_SNAPSHOT_TIMEOUT_MS = 8000;

// Config ประเภทอุปกรณ์และชื่อที่แสดง
const DEVICE_TYPES: DeviceMasterItem[] = [
    { code: "kiosk", label: "ตู้ Kiosk" },
    { code: "barrier_gate", label: "Barrier Gate" },
    { code: "camera", label: "LPR Camera" },
    { code: "printer", label: "Printer" },
    { code: "edc", label: "เครื่อง EDC" },
];

// Config ค่าเริ่มต้นของฟอร์มเครื่อง EDC
const EMPTY_EDC_FORM: EdcDevicePayload = {
    deviceName: "",
    terminalId: "",
    merchantId: "",
    provider: "",
    serialNo: "",
    location: "",
    usage: "cashier",
    status: "active",
    note: "",
};

// Config ข้อความและสีของสถานะเครื่อง EDC
const EDC_STATUS_LABELS: Record<string, { label: string; className: string }> = {
    active: { label: "ใช้งาน", className: "text-[#16A34A]" },
    maintenance: { label: "ส่งซ่อม", className: "text-[#D97706]" },
    inactive: { label: "ปิดใช้งาน", className: "text-[#EF4444]" },
};

// Config ประเภทที่สร้างด้วย activation code (kiosk / barrier gate)
const ACTIVATION_DEVICE_TYPES = DEVICE_TYPES.filter(
    (item) =>
        item.code === KIOSK_DEVICE_TYPE ||
        item.code === BARRIER_GATE_DEVICE_TYPE
);

// Config ตัวเลือกประเภทการเชื่อมต่อ
const CONNECTION_TYPES: DeviceMasterItem[] = [
    { code: "lan", label: "LAN" },
    { code: "network", label: "Network" },
    { code: "usb", label: "USB" },
    { code: "serial", label: "Serial" },
];

// Config ค่าเริ่มต้นของฟอร์ม kiosk / barrier gate
const DEFAULT_FORM: DevicePayload = {
    deviceCode: "",
    deviceName: "",
    deviceType: "",
    connectionType: "",
    ipAddress: null,
    status: "active",
    isOnline: true,
    note: "",
    location: "",
    edcDeviceId: "",
    allowedIps: [],
};

/* -------------------------------------- Helpers -------------------------------------- */

// Function รวม error allowedIps.<index> ทุกแถวเป็นข้อความเดียวใต้ช่อง allowedIps
function groupIpFieldErrors(fields: Record<string, string>): Record<string, string> {
    const result: Record<string, string> = {};
    Object.entries(fields).forEach(([field, message]) => {
        const key = field.startsWith("allowedIps.") ? "allowedIps" : field;
        if (!result[key]) result[key] = message;
    });
    return result;
}

// Function แปลงค่าจากฟอร์มเป็นทิศทาง IN/OUT (อื่น = null)
function toDirection(value: string | null | undefined): Direction | null {
    return value === "IN" || value === "OUT" ? value : null;
}

// Function ตรวจว่าเป็น kiosk
function isKioskType(type: string): boolean {
    return type.toLowerCase() === KIOSK_DEVICE_TYPE;
}

// Function ตรวจว่าเป็น barrier gate
function isBarrierGateType(type: string): boolean {
    const normalizedType = type.toLowerCase();

    return (
        normalizedType === BARRIER_GATE_DEVICE_TYPE ||
        normalizedType === "barrier"
    );
}

// Function ตรวจว่าเป็นกล้อง
function isCameraType(type: string): boolean {
    return type.toLowerCase() === CAMERA_DEVICE_TYPE;
}

// Function ตรวจว่าเป็น printer
function isPrinterType(type: string): boolean {
    return type.toLowerCase() === PRINTER_DEVICE_TYPE;
}

// Function ตรวจว่าเป็นเครื่อง EDC
function isEdcType(type: string): boolean {
    return type.toLowerCase() === EDC_DEVICE_TYPE;
}

// Function สร้างชื่อที่แสดงของเครื่อง EDC พร้อม TID
function getEdcLabel(device: Device): string {
    return `${device.deviceName}${device.terminalId ? ` (${device.terminalId})` : ""}`;
}

// Function ตรวจว่าเป็นประเภทที่ใช้ activation code
function isActivationDeviceType(type: string): boolean {
    return isKioskType(type) || isBarrierGateType(type);
}

// Function เลือกไอคอนตามประเภทอุปกรณ์
function getDeviceIcon(type: string): JSX.Element {
    if (isKioskType(type)) {
        return <LuMonitor className="text-[20px]" />;
    }

    if (type === "lpr" || isCameraType(type)) {
        return <LuCamera className="text-[20px]" />;
    }

    if (isBarrierGateType(type)) {
        return <LuWarehouse className="text-[20px]" />;
    }

    if (isEdcType(type)) {
        return <LuCreditCard className="text-[20px]" />;
    }

    return <LuPrinter className="text-[20px]" />;
}

// Function แปลงฟอร์มเป็น body ของ PUT /devices/:deviceId (ไม่รวม cameraIds/printerIds)
function toDevicePayload(form: DevicePayload): DeviceUpdateRequest {
    const payload: DeviceUpdateRequest = {
        deviceName: form.deviceName,
        connectionType: form.connectionType,
        ipAddress: form.ipAddress,
        status: form.status,
        isOnline: form.isOnline,
        note: form.note,
    };

    if (form.deviceCode.trim()) {
        payload.deviceCode = form.deviceCode.trim();
    }

    if (isActivationDeviceType(form.deviceType)) {
        payload.location = form.location?.trim() || null;
    }

    if (isBarrierGateType(form.deviceType)) {
        payload.gateId = form.gateId?.trim() || null;
        payload.direction = toDirection(form.direction);
    }

    // cameraIds / printerIds ผูกทีละตัวใน saveMappings
    if (isKioskType(form.deviceType) || isBarrierGateType(form.deviceType)) {
        // "" = ไม่ผูก
        payload.edcDeviceId = form.edcDeviceId || null;
    }

    payload.allowedIps = parseIpLines(form.allowedIps);

    return payload;
}

// Function ดึง id ที่ใช้อ้างอิงอุปกรณ์ (deviceId, deviceCode หรือ id)
function getDeviceIdentity(device: Device): string {
    return device.deviceId ?? device.deviceCode ?? device.id ?? "";
}

// Function ตรวจว่า event เป็นของอุปกรณ์นี้
function matchesDeviceEvent(device: Device, event: DeviceEvent): boolean {
    return device.id === event.id || (Boolean(event.deviceId) && device.deviceId === event.deviceId);
}

// Function อัปเดตสถานะของอุปกรณ์จาก event
function applyDeviceEvent(device: Device, event: DeviceEvent): Device {
    if (!matchesDeviceEvent(device, event)) {
        return device;
    }

    return {
        ...device,
        status: event.status ?? device.status,
        isOnline: typeof event.isOnline === "boolean" ? event.isOnline : device.isOnline,
        lastSeen: event.lastSeen !== undefined ? event.lastSeen : device.lastSeen,
    };
}

// Function นับจำนวนอุปกรณ์ทั้งหมด online offline และ maintenance
function summarizeDevices(devices: Device[]): { total: number; online: number; offline: number; maintenance: number } {
    return {
        total: devices.length,
        online: devices.filter((device) => device.isOnline).length,
        offline: devices.filter((device) => !device.isOnline).length,
        maintenance: devices.filter((device) => device.status === "maintenance").length,
    };
}

// Function ดึง activation code ที่จะแสดง
function getActivationCode(result: DeviceActivationResult | null): string {
    return result?.CodeActivate ?? "";
}

// Function แปลงวันเวลาเป็นข้อความไทย (ไม่มีค่า = -)
function formatDateTime(value?: string | null): string {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
}

/* -------------------------------------- Component -------------------------------------- */

// Function แท็บอุปกรณ์ รายการ สร้าง แก้ไข ผูกกล้อง/printer และสถานะ realtime
function DevicesTab(): JSX.Element {
    const [config, setConfig] = useState<DeviceListResponse | null>(null);
    const [cameraDevices, setCameraDevices] = useState<Device[]>([]);
    const [printerDevices, setPrinterDevices] = useState<Device[]>([]);
    const [edcDevices, setEdcDevices] = useState<Device[]>([]);
    // dialog ลงทะเบียน/แก้ไขเครื่อง EDC
    const [edcModalOpen, setEdcModalOpen] = useState(false);
    const [edcModalMode, setEdcModalMode] = useState<"create" | "edit">("create");
    const [edcEditingId, setEdcEditingId] = useState<string | null>(null);
    const [edcForm, setEdcForm] = useState<EdcDevicePayload>(EMPTY_EDC_FORM);
    const [edcFieldErrors, setEdcFieldErrors] = useState<Record<string, string>>({});
    const [edcError, setEdcError] = useState("");
    const [edcSubmitting, setEdcSubmitting] = useState(false);
    const [deviceTypeFilter, setDeviceTypeFilter] = useState("all");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [modalError, setModalError] = useState("");
    const [modalFieldErrors, setModalFieldErrors] = useState<Record<string, string>>({});
    const [message, setMessage] = useState("");

    const [openModal, setOpenModal] = useState(false);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<DevicePayload>(DEFAULT_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [reissuingId, setReissuingId] = useState<string | null>(null);
    const [activationResult, setActivationResult] =
        useState<DeviceActivationResult | null>(null);
    const openModalRef = useRef(openModal);
    const modalModeRef = useRef(modalMode);
    const formRef = useRef(form);
    const activationResultRef = useRef(activationResult);

    useEffect(() => {
        openModalRef.current = openModal;
        modalModeRef.current = modalMode;
        formRef.current = form;
        activationResultRef.current = activationResult;
    }, [activationResult, form, modalMode, openModal]);

    async function fetchConfig(showLoading = true) {
        try {
            if (showLoading) {
                setLoading(true);
            }
            setError("");

            // รายการไม่กรอง (เหมือน snapshot ของ stream) แยกประเภทที่นี่
            const normalizedConfig = await getDevices();
            applyDevicesSnapshot(normalizedConfig);
            return normalizedConfig;
        } catch (err) {
            setError(getErrorMessage(err, "โหลดข้อมูลอุปกรณ์ไม่สำเร็จ"));
            return null;
        } finally {
            if (showLoading) {
                setLoading(false);
            }
        }
    }

    function applyDeviceEventToState(data: DeviceEvent) {
        setConfig((currentConfig) => {
            if (!currentConfig?.devices.some((device) => matchesDeviceEvent(device, data))) {
                return currentConfig;
            }

            const devices = currentConfig.devices.map((device) =>
                applyDeviceEvent(device, data)
            );

            return {
                ...currentConfig,
                ...summarizeDevices(devices),
                devices,
            };
        });

        setCameraDevices((devices) =>
            devices.map((device) => applyDeviceEvent(device, data))
        );
        setPrinterDevices((devices) =>
            devices.map((device) => applyDeviceEvent(device, data))
        );
    }

    // stream ส่ง devices_snapshot ทุกครั้งที่ต่อ จึงใช้ stream เป็นหลัก ไม่ต้อง GET ตอนเปิดหน้า
    function applyDevicesSnapshot(snapshot: DeviceListResponse) {
        const all = snapshot.devices ?? [];
        setConfig(snapshot);
        setCameraDevices(all.filter((device) => isCameraType(device.deviceType)));
        setPrinterDevices(all.filter((device) => isPrinterType(device.deviceType)));
        setEdcDevices(all.filter((device) => isEdcType(device.deviceType)));
        setLoading(false);
    }

    useEffect(() => {
        let receivedSnapshot = false;
        setLoading(true);

        // สำรองเท่านั้น ไม่ได้ snapshot ตามเวลาให้โหลดผ่าน API ครั้งเดียว
        const fallbackTimer = window.setTimeout(() => {
            if (!receivedSnapshot) void fetchConfig();
        }, FIRST_SNAPSHOT_TIMEOUT_MS);

        const handleDeviceEvent = async (data: DeviceEvent | DevicesConfigUpdatedEvent) => {
            try {
                if (data.type === "devices_config_updated") {
                    await fetchConfig(false);
                    return;
                }

                // เปลี่ยนแค่สถานะ แก้แถวเดียวไม่ต้องโหลดใหม่
                if (data.type === "device_status_changed") {
                    applyDeviceEventToState(data);
                    return;
                }

                if (data.type === "device_activated") {
                    applyDeviceEventToState(data);
                }

                await fetchConfig(false);

                if (data.type === "device_activation_expired") {
                    setMessage("Activation Code หมดอายุ ระบบลบรายการรอ Activate แล้ว");
                    return;
                }

                // ปิด dialog activation code เมื่ออุปกรณ์ใหม่ (ชื่อเดียวกับฟอร์ม) activate แล้ว
                const currentForm = formRef.current;
                if (
                    data.type === "device_activated" &&
                    openModalRef.current &&
                    modalModeRef.current === "create" &&
                    getActivationCode(activationResultRef.current) &&
                    data.deviceName === currentForm.deviceName
                ) {
                    setOpenModal(false);
                    setActivationResult(null);
                    setMessage(`${data.deviceName} Activate สำเร็จแล้ว`);
                }
            } catch {
                void fetchConfig(false);
            }
        };

        // subscribeSse ต่อใหม่เอง ตรวจ ping และไปหน้า login เมื่อได้ session_revoked
        const unsubscribe = subscribeDeviceEvents({
            onEvent: (event) => {
                if (event.type === "connected" || event.type === "ping") return;
                if (event.type === "devices_snapshot") {
                    if (event.data) {
                        receivedSnapshot = true;
                        applyDevicesSnapshot(event.data);
                    }
                    return;
                }
                void handleDeviceEvent(event);
            },
        });

        return () => {
            unsubscribe();
            window.clearTimeout(fallbackTimer);
        };
    }, []);

    const devices = useMemo(() => config?.devices ?? [], [config]);
    const cameraOwnerById = useMemo(() => {
        const ownerById = new Map<string, Device>();

        devices
            .filter((device) => isBarrierGateType(device.deviceType))
            .forEach((device) => {
                (device.cameraIds ?? []).forEach((cameraId) => {
                    if (cameraId) {
                        ownerById.set(cameraId, device);
                    }
                });
            });

        return ownerById;
    }, [devices]);
    const printerOwnersById = useMemo(() => {
        const ownersById = new Map<string, Device[]>();

        devices
            .filter((device) => isKioskType(device.deviceType) || isBarrierGateType(device.deviceType))
            .forEach((device) => {
                (device.printerIds ?? []).forEach((printerId) => {
                    if (!printerId) return;
                    ownersById.set(printerId, [...(ownersById.get(printerId) ?? []), device]);
                });
            });

        return ownersById;
    }, [devices]);
    const edcOwnerById = useMemo(() => {
        const ownerById = new Map<string, Device>();
        devices
            .filter((device) => isActivationDeviceType(device.deviceType) && device.edcDeviceId)
            .forEach((device) => ownerById.set(device.edcDeviceId as string, device));
        return ownerById;
    }, [devices]);

    const edcById = useMemo(() => {
        const byId = new Map<string, Device>();
        [...edcDevices, ...devices.filter((device) => isEdcType(device.deviceType))].forEach((device) => {
            if (device.deviceId) byId.set(device.deviceId, device);
        });
        return byId;
    }, [devices, edcDevices]);

    const displayedDevices = useMemo(() => {
        if (deviceTypeFilter === "all") {
            return devices;
        }

        return devices.filter((device) => {
            if (deviceTypeFilter === BARRIER_GATE_DEVICE_TYPE) {
                return isBarrierGateType(device.deviceType);
            }

            return device.deviceType === deviceTypeFilter;
        });
    }, [deviceTypeFilter, devices]);

    const deviceFilterOptions = useMemo(() => {
        return [
            { code: "all", label: "All" },
            ...DEVICE_TYPES.filter((item) =>
                item.code === CAMERA_DEVICE_TYPE
                    ? devices.some((device) => isCameraType(device.deviceType)) ||
                      cameraDevices.length > 0
                    : true
            ),
        ];
    }, [cameraDevices.length, devices]);

    const deviceTypes = useMemo(() => {
        return DEVICE_TYPES;
    }, []);

    const modalDeviceTypes = useMemo(() => {
        if (modalMode === "create") {
            return ACTIVATION_DEVICE_TYPES;
        }

        return ACTIVATION_DEVICE_TYPES;
    }, [form.deviceType, modalMode]);

    function getDeviceTypeLabel(code: string) {
        const masterLabel =
            DEVICE_TYPES.find((item) => item.code === code)
                ?.label ?? null;

        if (masterLabel) {
            return masterLabel;
        }

        if (isKioskType(code)) {
            return "ตู้ Kiosk";
        }

        if (isBarrierGateType(code)) {
            return "Barrier Gate";
        }

        return code;
    }

    function getConnectionLabel(code: string) {
        return (
            CONNECTION_TYPES.find((item) => item.code === code)
                ?.label ?? code
        );
    }

    function getDeviceTypeCount(code: string) {
        if (code === "all") {
            return devices.length;
        }

        return devices.filter((device) =>
            code === BARRIER_GATE_DEVICE_TYPE
                ? isBarrierGateType(device.deviceType)
                : device.deviceType === code
        ).length;
    }

    function handleCloseModal() {
        setOpenModal(false);
        setActivationResult(null);
        setModalError("");
        setModalFieldErrors({});
    }

    function handleOpenCreate() {
        setMessage("");
        setModalMode("create");
        setEditingId(null);
        setActivationResult(null);

        setForm({
            ...DEFAULT_FORM,
            deviceType: ACTIVATION_DEVICE_TYPES[0]?.code ?? "",
            connectionType: "",
            direction: "IN",
            cameraIds: [],
            printerIds: [],
        });

        setOpenModal(true);
    }

    async function handleOpenEdit(device: Device) {
        if (!isKioskType(device.deviceType) && !isBarrierGateType(device.deviceType)) {
            return;
        }

        setMessage("");
        setModalMode("edit");
        setActivationResult(null);

        const latestConfig = await fetchConfig(false);
        const latestDevice =
            latestConfig?.devices.find((item) =>
                item.deviceId === device.deviceId || item.id === device.id
            ) ??
            device;

        setEditingId(latestDevice.deviceId ?? latestDevice.id ?? null);
        setForm({
            deviceId: latestDevice.deviceId ?? null,
            activationCode: latestDevice.activationCode ?? null,
            expiresAt:
                latestDevice.activationExpiresAt ?? null,
            activationExpiresAt: latestDevice.activationExpiresAt ?? null,
            deviceCode: latestDevice.deviceCode ?? "",
            deviceName: latestDevice.deviceName,
            deviceType: latestDevice.deviceType,
            connectionType: latestDevice.connectionType ?? "",
            ipAddress: latestDevice.ipAddress ?? null,
            status: latestDevice.status,
            isOnline: latestDevice.isOnline,
            note: latestDevice.note ?? "",
            location: latestDevice.location ?? "",
            gateId: latestDevice.gateId ?? "",
            direction: latestDevice.direction ?? "IN",
            cameraRole: latestDevice.cameraRole ?? "lpr",
            printerRole: latestDevice.printerRole ?? "receipt",
            cameraIds: latestDevice.cameraIds ?? [],
            printerIds: latestDevice.printerIds ?? [],
            edcDeviceId: latestDevice.edcDeviceId ?? "",
            allowedIps: latestDevice.allowedIps ?? [],
        });

        setOpenModal(true);
    }

    function handleOpenEdcCreate() {
        setMessage("");
        setEdcModalMode("create");
        setEdcEditingId(null);
        setEdcForm(EMPTY_EDC_FORM);
        setEdcFieldErrors({});
        setEdcError("");
        setEdcModalOpen(true);
    }

    function handleOpenEdcEdit(device: Device) {
        setMessage("");
        setEdcModalMode("edit");
        setEdcEditingId(device.deviceId ?? device.id ?? null);
        setEdcForm({
            deviceName: device.deviceName ?? "",
            terminalId: device.terminalId ?? "",
            merchantId: device.merchantId ?? "",
            provider: device.provider ?? "",
            serialNo: device.serialNo ?? "",
            location: device.location ?? "",
            usage: device.usage === "device" ? "device" : "cashier",
            status: device.status || "active",
            note: device.note ?? "",
        });
        setEdcFieldErrors({});
        setEdcError("");
        setEdcModalOpen(true);
    }

    function handleChangeEdcForm(patch: Partial<EdcDevicePayload>) {
        setEdcForm((prev) => ({ ...prev, ...patch }));
        setEdcFieldErrors((prev) => {
            const next = { ...prev };
            Object.keys(patch).forEach((key) => delete next[key]);
            return next;
        });
        setEdcError("");
    }

    async function handleSubmitEdc() {
        const errors: Record<string, string> = {};
        if (!edcForm.deviceName.trim()) errors.deviceName = "กรุณากรอกชื่อเครื่อง";
        if (!edcForm.terminalId.trim()) errors.terminalId = "กรุณากรอก Terminal ID";
        if (Object.keys(errors).length > 0) {
            setEdcFieldErrors(errors);
            return;
        }

        const optional = (value?: string | null) => value?.trim() || null;
        const payload: EdcDevicePayload = {
            deviceName: edcForm.deviceName.trim(),
            terminalId: edcForm.terminalId.trim(),
            merchantId: optional(edcForm.merchantId),
            provider: optional(edcForm.provider),
            serialNo: optional(edcForm.serialNo),
            location: optional(edcForm.location),
            usage: edcForm.usage,
            ...(edcModalMode === "edit" ? { status: edcForm.status, note: edcForm.note ?? "" } : {}),
        };

        try {
            setEdcSubmitting(true);
            setEdcError("");

            const isEdit = edcModalMode === "edit" && edcEditingId;
            if (isEdit) {
                await updateDevice(edcEditingId, payload);
            } else {
                // POST /devices ด้วย deviceType edc (ไม่มี token)
                await createDevice({ ...payload, deviceType: "edc" });
            }

            setEdcModalOpen(false);
            setMessage(isEdit ? "บันทึกเครื่อง EDC เรียบร้อยแล้ว" : "ลงทะเบียนเครื่อง EDC เรียบร้อยแล้ว");
            await fetchConfig(false);
        } catch (err) {
            const fields = getFieldErrors(err);
            // แสดง error ที่รู้จักใต้ช่องที่เกี่ยวข้อง
            if (err instanceof ApiError && err.code === "EDC_TERMINAL_ID_EXISTS") {
                fields.terminalId = err.message;
            }
            if (err instanceof ApiError && err.code === "EDC_DEVICE_IN_USE") {
                fields.usage = err.message;
            }
            setEdcFieldErrors(fields);
            setEdcError(err instanceof Error ? err.message : "บันทึกเครื่อง EDC ไม่สำเร็จ");
        } finally {
            setEdcSubmitting(false);
        }
    }

    async function handleSubmitDevice() {
        try {
            setSubmitting(true);
            setError("");
            setModalError("");
            setModalFieldErrors({});

            setMessage("");

            if (
                modalMode === "create" &&
                isActivationDeviceType(form.deviceType)
            ) {
                const name = form.deviceName.trim();
                const location = form.location?.trim() ?? "";
                const activationPayload: CreateActivationDeviceRequest = isBarrierGateType(form.deviceType)
                      ? {
                            deviceName: name,
                            deviceType: "barrier_gate",
                            location,
                            gateId: form.gateId?.trim(),
                            direction: toDirection(form.direction),
                            cameraIds: (form.cameraIds ?? []).filter(Boolean),
                            printerIds: (form.printerIds ?? []).filter(Boolean),
                            edcDeviceId: form.edcDeviceId || null,
                            allowedIps: parseIpLines(form.allowedIps),
                        }
                      : {
                            deviceName: name,
                            deviceType: "kiosk",
                            location,
                            printerIds: (form.printerIds ?? []).filter(Boolean),
                            connectionType: form.connectionType || undefined,
                            note: form.note || undefined,
                            edcDeviceId: form.edcDeviceId || null,
                            allowedIps: parseIpLines(form.allowedIps),
                        };

                // kiosk / barrier gate ได้ CodeActivate กลับมา
                const result = await createDevice(activationPayload);

                setActivationResult({ CodeActivate: result.CodeActivate });
                await fetchConfig();
                return;
            }

            if (modalMode !== "edit" || !editingId) {
                throw new Error("หน้านี้สร้างได้เฉพาะ Kiosk และ Barrier Gate");
            }

            await updateDevice(editingId, toDevicePayload(form));
            await saveMappings(editingId);

            setOpenModal(false);
            setForm(DEFAULT_FORM);
            setActivationResult(null);
            await fetchConfig();
            setMessage("บันทึกข้อมูลอุปกรณ์เรียบร้อยแล้ว");
        } catch (err) {
            // คง dialog ไว้และแสดง error ในนั้น
            setModalFieldErrors(groupIpFieldErrors(getFieldErrors(err)));
            setModalError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
            // mapping บันทึกทีละตัว โหลดใหม่ให้เห็นส่วนที่บันทึกแล้ว
            if (modalMode === "edit") await fetchConfig(false);
        } finally {
            setSubmitting(false);
        }
    }

    async function handleReissueActivationCode(device: Device) {
        const deviceId = device.deviceId ?? device.id ?? "";

        if (!deviceId) {
            setError("Device ID is required to refresh activation code");
            return;
        }

        if (!isKioskType(device.deviceType) && !isBarrierGateType(device.deviceType)) {
            setError("Refresh Code is only available for Kiosk and Barrier Gate");
            return;
        }

        const confirmed = window.confirm(
            "This will invalidate the old device token and generate a new activation code for this existing device."
        );

        if (!confirmed) return;

        try {
            setError("");
            setMessage("");
            setReissuingId(deviceId);

            const result = await issueActivationCode(deviceId);

            setModalMode("edit");
            setEditingId(deviceId);
            setForm({
                deviceId: result.device?.deviceId ?? result.deviceId,
                activationCode: result.activationCode,
                expiresAt: result.expiresAt,
                activationExpiresAt: result.expiresAt,
                deviceCode: device.deviceCode ?? "",
                deviceName: result.device?.deviceName ?? result.deviceName,
                deviceType: result.device?.deviceType ?? result.deviceType,
                connectionType: device.connectionType ?? "",
                ipAddress: device.ipAddress ?? null,
                status: result.device?.status ?? device.status,
                isOnline: result.device?.isOnline ?? device.isOnline,
                note: device.note ?? "",
                location: device.location ?? "",
                gateId: result.device?.gateId ?? device.gateId ?? "",
                direction: result.device?.direction ?? device.direction ?? "IN",
                cameraRole: device.cameraRole ?? null,
                printerRole: device.printerRole ?? null,
                cameraIds: result.device?.cameraIds ?? device.cameraIds ?? [],
                printerIds: result.device?.printerIds ?? device.printerIds ?? [],
            });
            setActivationResult({
                CodeActivate: result.activationCode,
                message: result.message,
                deviceId: result.deviceId,
                expiresAt: result.expiresAt,
                recovery: true,
            });
            setOpenModal(true);
            await fetchConfig(false);
        } catch (err) {
            setError(getErrorMessage(err, "สร้าง Activation Code ใหม่ไม่สำเร็จ"));
        } finally {
            setReissuingId(null);
        }
    }

    // ผูก/ถอดเฉพาะที่เปลี่ยนทีละตัว (ถอดก่อน) กล้องที่ผูกกับ gate อื่นจะย้ายเมื่อแอดมินยืนยันเท่านั้น
    async function saveMappings(deviceId: string) {
        const saved = devices.find((device) => getDeviceIdentity(device) === deviceId);
        const savedCameraIds = saved?.cameraIds ?? [];
        const savedPrinterIds = saved?.printerIds ?? [];
        const cameraIds = isBarrierGateType(form.deviceType) ? (form.cameraIds ?? []).filter(Boolean) : savedCameraIds;
        const printerIds =
            isKioskType(form.deviceType) || isBarrierGateType(form.deviceType)
                ? (form.printerIds ?? []).filter(Boolean)
                : savedPrinterIds;

        for (const id of savedCameraIds.filter((item) => !cameraIds.includes(item))) {
            await unmapCamera(deviceId, id);
        }
        for (const id of savedPrinterIds.filter((item) => !printerIds.includes(item))) {
            await unmapPrinter(deviceId, id);
        }
        for (const id of cameraIds.filter((item) => !savedCameraIds.includes(item))) {
            await mapCameraOrMove(deviceId, id);
        }
        for (const id of printerIds.filter((item) => !savedPrinterIds.includes(item))) {
            await mapPrinter(deviceId, id);
        }
    }

    async function mapCameraOrMove(deviceId: string, cameraId: string) {
        try {
            await mapCamera(deviceId, cameraId);
        } catch (err) {
            if (!isApiErrorCode(err, "CAMERA_IN_USE")) throw err;
            const assignedTo = (err.detail("assignedTo") as CameraAssignment[] | undefined) ?? [];
            const owner = assignedTo.find((item) => item.cameraId === cameraId)?.deviceId;
            if (!owner) throw err;
            const ownerName = devices.find((device) => getDeviceIdentity(device) === owner)?.deviceName ?? owner;
            const cameraName = devices.find((device) => getDeviceIdentity(device) === cameraId)?.deviceName ?? cameraId;
            if (!window.confirm(`กล้อง ${cameraName} ผูกกับ ${ownerName} อยู่ ต้องการย้ายมาที่อุปกรณ์นี้หรือไม่`)) {
                throw new Error(`กล้อง ${cameraName} ผูกกับ ${ownerName} อยู่ ยังไม่ได้ย้าย`);
            }
            await unmapCamera(owner, cameraId);
            await mapCamera(deviceId, cameraId);
        }
    }

    async function handleDeleteDevice(id: string) {
        try {
            setError("");
            setMessage("");

            await deleteDevice(id);

            await fetchConfig();
            setMessage("ลบอุปกรณ์เรียบร้อยแล้ว");
        } catch (err) {
            setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
        }
    }

    async function handleRefreshConfig() {
        setMessage("");
        await fetchConfig();
    }

    return (
        <>
            <section className="">
                <div className="mx-auto max-w-7xl">
                    {error ? (
                        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-600">
                            {error}
                        </div>
                    ) : null}

                    {message ? (
                        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-700">
                            {message}
                        </div>
                    ) : null}

                    <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                        <h2 className="border-l-[6px] border-[#061D36] pl-3 text-[24px] font-bold text-[#1F2937] sm:border-l-[8px] sm:pl-4 sm:text-[32px]">
                            การตั้งค่าอุปกรณ์
                        </h2>

                        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                            <div className="h-16 w-px bg-[#061D36]" />

                            <button
                                type="button"
                                onClick={handleRefreshConfig}
                                disabled={loading}
                                className="flex h-12 w-12 items-center justify-center rounded-full text-[#061D36] transition hover:bg-[#E5E7EB] disabled:opacity-50"
                                title="Refresh"
                            >
                                <LuRefreshCw
                                    size={26}
                                    className={loading ? "animate-spin" : ""}
                                />
                            </button>

                            <button
                                type="button"
                                onClick={handleOpenEdcCreate}
                                className="inline-flex h-12 items-center gap-3 rounded-full border border-[#061D36] px-6 text-[14px] font-bold text-[#061D36] transition hover:bg-[#E5E7EB] active:scale-[0.98]"
                            >
                                <LuCreditCard size={20} />
                                ลงทะเบียน EDC
                            </button>

                            <button
                                type="button"
                                onClick={handleOpenCreate}
                                className="inline-flex h-12 items-center gap-3 rounded-full bg-[#061D36] px-7 text-[14px] font-bold text-white transition hover:bg-[#0B2A4A] active:scale-[0.98]"
                            >
                                <LuPlus size={22} />
                                เพิ่มอุปกรณ์
                            </button>
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 md:mt-8 md:grid-cols-3 md:gap-6">
                        <article className="min-h-[112px] rounded-[14px] bg-[#D9D9D9] px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:px-5 sm:py-5 md:min-h-[138px] md:px-7 md:py-7">
                            <p className="text-[14px] text-[#475467] sm:text-[15px] md:text-[16px]">อุปกรณ์ทั้งหมด</p>
                            <p className="mt-5 text-[36px] font-bold leading-none text-[#061D36] sm:text-[42px] md:mt-8 md:text-[48px]">
                                {loading ? "-" : config?.total ?? 0}
                            </p>
                        </article>

                        <article className="min-h-[112px] rounded-[14px] bg-[#D9D9D9] px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:px-5 sm:py-5 md:min-h-[138px] md:px-7 md:py-7">
                            <p className="text-[14px] text-[#475467] sm:text-[15px] md:text-[16px]">เชื่อมต่อปกติ</p>
                            <p className="mt-5 text-[36px] font-bold leading-none text-[#061D36] sm:text-[42px] md:mt-8 md:text-[48px]">
                                {loading ? "-" : config?.online ?? 0}
                            </p>
                        </article>

                        <article className="min-h-[112px] rounded-[14px] bg-[#D9D9D9] px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:col-span-2 sm:px-5 sm:py-5 md:col-span-1 md:min-h-[138px] md:px-7 md:py-7">
                            <p className="text-[14px] text-[#475467] sm:text-[15px] md:text-[16px]">ขาดการเชื่อมต่อ</p>
                            <p className="mt-5 text-[36px] font-bold leading-none text-[#061D36] sm:text-[42px] md:mt-8 md:text-[48px]">
                                {loading
                                    ? "-"
                                    : String(config?.offline ?? 0).padStart(2, "0")}
                            </p>
                        </article>
                    </div>

                    <div className="mt-10 grid min-w-0 max-w-full grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                        <article className="min-w-0 overflow-hidden rounded-[18px] border border-[#D0D5DD] bg-white shadow-sm">
                            <div className="bg-[#061D36] px-4 py-5 sm:px-8 sm:py-6">
                                <h3 className="text-[22px] font-bold text-white sm:text-[26px]">
                                    อุปกรณ์ที่มีอยู่ในระบบ
                                </h3>
                            </div>

                            <div className="flex gap-2 overflow-x-auto border-b border-[#E5E7EB] px-4 py-3 sm:px-8">
                                {deviceFilterOptions.map((item) => (
                                    <button
                                        key={item.code}
                                        type="button"
                                        onClick={() => setDeviceTypeFilter(item.code)}
                                        className={`shrink-0 rounded-full border px-4 py-2 text-[13px] font-bold transition ${
                                            deviceTypeFilter === item.code
                                                ? "border-[#061D36] bg-[#061D36] text-white"
                                                : "border-[#D0D5DD] bg-white text-[#475467] hover:border-[#061D36]"
                                        }`}
                                    >
                                        {item.label} ({getDeviceTypeCount(item.code)})
                                    </button>
                                ))}
                            </div>

                            <div className="px-4 py-5 sm:px-8 sm:py-7">
                                {loading ? (
                                    <div className="space-y-5">
                                        {[1, 2, 3].map((item) => (
                                            <div
                                                key={item}
                                                className="h-14 animate-pulse rounded-xl bg-[#E5E7EB]"
                                            />
                                        ))}
                                    </div>
                                ) : displayedDevices.length === 0 ? (
                                    <div className="py-12 text-center text-[#6B7280]">
                                        ไม่พบอุปกรณ์
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {displayedDevices.map((device) => {
                                            const isEdc = isEdcType(device.deviceType);
                                            const edcStatus =
                                                EDC_STATUS_LABELS[device.status] ?? {
                                                    label: device.status,
                                                    className: "text-[#64748B]",
                                                };
                                            const edcOwner =
                                                isEdc && device.deviceId ? edcOwnerById.get(device.deviceId) : null;
                                            const attachedEdc =
                                                !isEdc && device.edcDeviceId ? edcById.get(device.edcDeviceId) : null;
                                            const deviceDetail = isEdc
                                                ? `TID ${device.terminalId ?? "-"}`
                                                : device.deviceId ??
                                                device.ipAddress ??
                                                device.activationCode ??
                                                device.deviceCode ??
                                                "-";

                                            const connectionLabel = isEdc
                                                ? `${device.usage === "device" ? "ติดกับ Kiosk/Gate" : "เคาน์เตอร์ Admin"}${device.location ? ` • ${device.location}` : ""}`
                                                : isActivationDeviceType(device.deviceType)
                                                    ? device.location ?? "Activation Code"
                                                    : getConnectionLabel(device.connectionType ?? "");
                                            const isPendingActivation =
                                                device.status ===
                                                "pending_activation";
                                            const deviceIdentity = getDeviceIdentity(device);
                                            const cameraOwner =
                                                isCameraType(device.deviceType) && deviceIdentity
                                                    ? cameraOwnerById.get(deviceIdentity)
                                                    : null;
                                            const printerOwners =
                                                isPrinterType(device.deviceType) && deviceIdentity
                                                    ? printerOwnersById.get(deviceIdentity) ?? []
                                                    : [];
                                            const gateDetails = [
                                                device.gateId ? `Gate: ${device.gateId}` : null,
                                                device.direction ? `Direction: ${device.direction}` : null,
                                                isCameraType(device.deviceType) && device.cameraRole
                                                    ? `Role: ${device.cameraRole}`
                                                    : null,
                                                isPrinterType(device.deviceType) && device.printerRole
                                                    ? `Role: ${device.printerRole}`
                                                    : null,
                                                isBarrierGateType(device.deviceType) &&
                                                device.cameraIds?.length
                                                    ? `Cameras: ${device.cameraIds.join(", ")}`
                                                    : null,
                                                (isKioskType(device.deviceType) ||
                                                    isBarrierGateType(device.deviceType)) &&
                                                device.printerIds?.length
                                                    ? `Printers: ${device.printerIds.join(", ")}`
                                                    : null,
                                                cameraOwner
                                                    ? `Linked to: ${cameraOwner.deviceName}`
                                                    : null,
                                                printerOwners.length
                                                    ? `Linked to: ${printerOwners.map((owner) => owner.deviceName).join(", ")}`
                                                    : null,
                                                (isCameraType(device.deviceType) || isPrinterType(device.deviceType)) &&
                                                !cameraOwner &&
                                                printerOwners.length === 0
                                                    ? "Unlinked"
                                                    : null,
                                                attachedEdc
                                                    ? `EDC: ${getEdcLabel(attachedEdc)}`
                                                    : device.edcDeviceId
                                                        ? `EDC: ${device.edcDeviceId}`
                                                        : null,
                                                isEdc && device.usage === "device"
                                                    ? edcOwner
                                                        ? `ผูกกับ: ${edcOwner.deviceName}`
                                                        : "ยังไม่ได้ผูกกับ Kiosk/Gate"
                                                    : null,
                                                isEdc && device.provider ? `ผู้ให้บริการ: ${device.provider}` : null,
                                                isEdc && device.merchantId ? `MID: ${device.merchantId}` : null,
                                                device.allowedIps?.length
                                                    ? `IP ที่อนุญาต: ${device.allowedIps.join(", ")}`
                                                    : null,
                                            ].filter(Boolean);
                                            const missingEdc =
                                                (isKioskType(device.deviceType) ||
                                                    isBarrierGateType(device.deviceType)) &&
                                                !device.edcDeviceId;

                                            return (
                                                <div
                                                    key={device.id ?? device.deviceId ?? device.deviceName}
                                                    className="flex min-w-0 flex-col gap-4 rounded-2xl px-3 py-3 transition hover:bg-[#F8FAFC] sm:flex-row sm:items-center sm:justify-between sm:gap-5"
                                                >
                                                    <div className="flex min-w-0 items-center gap-4">
                                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F3F4F6] text-[#061D36] transition group-hover:bg-[#E5E7EB]">
                                                            {getDeviceIcon(device.deviceType)}
                                                        </div>

                                                        <div className="min-w-0">
                                                            <p className="truncate text-[18px] font-bold text-[#061D36] sm:text-[20px]">
                                                                {device.deviceName}
                                                            </p>
                                                            <p className="mt-1 break-words text-[14px] text-[#64748B] sm:text-[15px]">
                                                                {deviceDetail} • {connectionLabel} •{" "}
                                                                {isEdc ? (
                                                                    // EDC ไม่มีสถานะ online แสดงแค่สถานะ
                                                                    <span className={edcStatus.className}>
                                                                        {edcStatus.label}
                                                                    </span>
                                                                ) : (
                                                                <span
                                                                    className={
                                                                        isPendingActivation
                                                                            ? "text-[#D97706]"
                                                                            : device.isOnline
                                                                                ? "text-[#16A34A]"
                                                                                : "text-[#EF4444]"
                                                                    }
                                                                >
                                                                    {isPendingActivation
                                                                        ? "รอ Activate"
                                                                        : device.isOnline
                                                                            ? "เชื่อมต่อปกติ"
                                                                            : "ขาดการเชื่อมต่อ"}
                                                                </span>
                                                                )}
                                                            </p>
                                                            {gateDetails.length > 0 ? (
                                                            <p className="mt-1 break-words text-[13px] font-medium text-[#475467]">
                                                                {gateDetails.join(" / ")}
                                                            </p>
                                                            ) : null}
                                                        </div>
                                                    </div>

                                                    <div className="flex shrink-0 flex-wrap items-center gap-3">
                                                        {missingEdc ? (
                                                            <span
                                                                className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[12px] font-bold text-amber-800"
                                                                title="Kiosk รับบัตรไม่ได้จนกว่าจะกรอกเลขเครื่อง EDC"
                                                            >
                                                                ยังไม่ผูกเครื่อง EDC
                                                            </span>
                                                        ) : null}

                                                        <span className="rounded-full border border-[#D0D5DD] bg-white px-3 py-1 text-[12px] font-bold text-[#475467]">
                                                            {getDeviceTypeLabel(device.deviceType)}
                                                        </span>

                                                        {(isKioskType(device.deviceType) || isBarrierGateType(device.deviceType)) &&
                                                        !device.isOnline ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleReissueActivationCode(device)}
                                                                disabled={reissuingId === (device.deviceId ?? device.id)}
                                                                className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#D0D5DD] px-3 text-[12px] font-bold text-[#061D36] transition hover:bg-[#E5E7EB] disabled:opacity-60"
                                                            >
                                                                <LuRefreshCw
                                                                    size={15}
                                                                    className={
                                                                        reissuingId === (device.deviceId ?? device.id)
                                                                            ? "animate-spin"
                                                                            : ""
                                                                    }
                                                                />
                                                                Refresh Code
                                                            </button>
                                                        ) : null}

                                                        {isKioskType(device.deviceType) ||
                                                        isBarrierGateType(device.deviceType) ||
                                                        isEdc ? (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    isEdc ? handleOpenEdcEdit(device) : handleOpenEdit(device)
                                                                }
                                                                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#061D36] transition hover:bg-[#E5E7EB]"
                                                            >
                                                                <LuPencil size={18} />
                                                            </button>
                                                        ) : null}

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleDeleteDevice(device.deviceId ?? device.id ?? "")
                                                            }
                                                            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#FF2F2F] transition hover:bg-[#FFF1F1]"
                                                        >
                                                            <LuTrash2 size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </article>

                        <article className="min-w-0 rounded-[18px] bg-[#D9D9D9] p-4 shadow-sm sm:p-6">
                            <h3 className="text-[22px] font-bold text-[#061D36] sm:text-[26px]">
                                กิจกรรมล่าสุด
                            </h3>

                            <div className="mt-6 rounded-[18px] bg-white px-5 py-8 text-center text-[15px] text-[#64748B]">
                                ยังไม่มีกิจกรรมล่าสุด
                            </div>

                            <button
                                type="button"
                                className="mt-6 h-12 w-full rounded-xl border border-[#061D36] text-[16px] font-bold text-[#061D36] transition hover:bg-[#061D36] hover:text-white"
                            >
                                ดูทั้งหมด
                            </button>
                        </article>
                    </div>
                </div>
            </section>

            <EdcDeviceModal
                open={edcModalOpen}
                mode={edcModalMode}
                form={edcForm}
                fieldErrors={edcFieldErrors}
                error={edcError}
                submitting={edcSubmitting}
                onClose={() => setEdcModalOpen(false)}
                onChange={handleChangeEdcForm}
                onSubmit={handleSubmitEdc}
            />

            <DeviceModal
                open={openModal}
                edcDevices={edcDevices}
                edcOwnerById={edcOwnerById}
                mode={modalMode}
                form={form}
                cameraDevices={cameraDevices}
                printerDevices={printerDevices}
                deviceTypes={modalDeviceTypes}
                submitting={submitting}
                error={modalError}
                fieldErrors={modalFieldErrors}
                activationResult={activationResult}
                cameraOwnerById={cameraOwnerById}
                printerOwnersById={printerOwnersById}
                onClose={handleCloseModal}
                onChange={setForm}
                onSubmit={handleSubmitDevice}
                getActivationCode={getActivationCode}
                formatDateTime={formatDateTime}
            />
        </>
    );
}

export { DevicesTab };
