"use client";
// Import Library
import { useMemo, useState, type JSX } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LuBuilding2, LuCheck, LuCreditCard, LuLandmark, LuQrCode, LuUser, LuWallet } from "react-icons/lu";
import { toast } from "sonner";
// Import Components
import { ChannelMappingModal } from "@/src/app/components/device/channels/ChannelMappingModal";
import { Toggle } from "@/src/app/components/ui/toggle";
// Import Actions
import { updatePaymentChannelSetting, updatePaymentMethodSetting } from "@/src/app/lib/actions/payment-settings";
// Import Client
import { paymentChannelSettingsQuery, paymentMethodSettingsQuery } from "@/src/app/lib/client/queries";
import { unwrap } from "@/src/app/lib/client/http";
// Import Types
import type { PaymentMethodId } from "@/src/app/type/api/payments";
import type { PaymentChannelSetting, PaymentMethodSetting } from "@/src/app/type/api/payment-settings";
// Import Shared
import { getErrorMessage } from "@/src/app/lib/shared/http";

// Config prefix ของ cache วิธีชำระและช่องทาง (invalidate ทั้งสองชุดพร้อมกัน)
const PAYMENT_SETTINGS_KEY = ["payment-settings"];

// Config รายการว่างก่อนโหลดเสร็จ (อ้างอิงเดิมทุก render)
const EMPTY_METHODS: PaymentMethodSetting[] = [];
const EMPTY_CHANNELS: PaymentChannelSetting[] = [];

// Function เลือกไอคอนของวิธีชำระ
function getPaymentMethodIcon(icon?: string | null): JSX.Element {
    switch (icon) {
        case "cash":
            return <LuUser size={18} />;
        case "bank":
            return <LuLandmark size={18} />;
        case "qr":
            return <LuQrCode size={18} />;
        case "wallet":
            return <LuWallet size={18} />;
        default:
            return <LuCreditCard size={18} />;
    }
}

// Function เลือกไอคอนของช่องทาง
function getChannelIcon(icon?: string): JSX.Element {
    switch (icon) {
        case "user":
            return <LuUser size={18} />;
        case "vending":
            return <LuBuilding2 size={18} />;
        case "qr":
            return <LuQrCode size={18} />;
        case "gate":
            return <LuCreditCard size={18} />;
        default:
            return <LuCreditCard size={18} />;
    }
}

// Function แท็บวิธีชำระเงินและช่องทางบริการ
function ChannelsTab(): JSX.Element {
    const queryClient = useQueryClient();
    const methodsResult = useQuery(paymentMethodSettingsQuery());
    const channelsResult = useQuery(paymentChannelSettingsQuery());
    const methods = methodsResult.data?.data ?? EMPTY_METHODS;
    const channels = channelsResult.data?.data ?? EMPTY_CHANNELS;
    const loading = methodsResult.isPending || channelsResult.isPending;
    const loadError = methodsResult.error ?? channelsResult.error;

    const [openMapping, setOpenMapping] = useState(false);
    const [selectedChannel, setSelectedChannel] = useState<PaymentChannelSetting | null>(null);
    // เปลี่ยนทุกครั้งที่เปิด dialog ให้ฟอร์มเริ่มจากค่าของช่องทางที่เลือก
    const [mappingKey, setMappingKey] = useState(0);

    const activeMethods = useMemo(
        () => methods.filter((method) => method.isActive),
        [methods]
    );

    // PATCH ได้แค่ success/message ต้องโหลดวิธีชำระและช่องทางใหม่
    function invalidatePaymentSettings() {
        return queryClient.invalidateQueries({ queryKey: PAYMENT_SETTINGS_KEY });
    }

    const toggleMethod = useMutation({
        mutationFn: (method: PaymentMethodSetting) => unwrap(updatePaymentMethodSetting(method.id, { isActive: !method.isActive })),
        onSuccess: invalidatePaymentSettings,
        onError: (err) => toast.error(getErrorMessage(err, "เกิดข้อผิดพลาด")),
    });

    const saveMapping = useMutation({
        mutationFn: ({ channelId, allowedMethods }: { channelId: PaymentChannelSetting["id"]; allowedMethods: PaymentMethodId[] }) =>
            unwrap(updatePaymentChannelSetting(channelId, { allowedMethods })),
        onSuccess: invalidatePaymentSettings,
    });

    function handleOpenMapping(channel: PaymentChannelSetting) {
        setSelectedChannel(channel);
        setMappingKey((value) => value + 1);
        setOpenMapping(true);
    }

    function handleCloseMapping() {
        setOpenMapping(false);
        setSelectedChannel(null);
    }

    // บันทึกไม่สำเร็จ throw ต่อให้ dialog คงเปิดไว้
    async function handleSaveMapping(allowedMethods: PaymentMethodId[]) {
        if (!selectedChannel) return;

        try {
            await saveMapping.mutateAsync({ channelId: selectedChannel.id, allowedMethods });
            handleCloseMapping();
        } catch (err) {
            toast.error(getErrorMessage(err, "เกิดข้อผิดพลาด"));
            throw err;
        }
    }

    return (
        <>
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3 sm:mb-6">
                <h2 className="flex min-w-0 items-center gap-3 text-[18px] font-extrabold text-[#2B3640] sm:text-[20px]">
                    <span className="h-5 w-1 shrink-0 rounded-full bg-[#1F2933] sm:h-6" />
                    <span className="min-w-0 break-words">
                        การกำหนดช่องทางการชำระค่าบริการ
                    </span>
                </h2>
            </div>

            {loadError ? (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {getErrorMessage(loadError, "เกิดข้อผิดพลาด")}
                </div>
            ) : null}

            <div className="min-w-0 rounded-2xl bg-[#D9D9D9] p-4 sm:p-6">
                <div className="text-[16px] font-extrabold text-[#2B3640] sm:text-[18px]">
                    วิธีการชำระเงิน
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-5 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
                    {loading
                        ? Array.from({ length: 6 }).map((_, index) => (
                            <div
                                key={index}
                                className="h-[86px] animate-pulse rounded-xl bg-[#ECECEC] sm:h-[104px]"
                            />
                        ))
                        : methods.map((method) => (
                            <Toggle
                                key={method.id}
                                pressed={method.isActive}
                                onPressedChange={() => toggleMethod.mutate(method)}
                                disabled={toggleMethod.isPending}
                                className={`rounded-xl p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md sm:p-4 ${
                                    method.isActive
                                        ? "bg-[#ECECEC] text-[#1F2937]"
                                        : "bg-[#C6CBD1] text-[#667085] opacity-70"
                                }`}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#061D36] sm:h-9 sm:w-9">
                                        {getPaymentMethodIcon(method.icon)}
                                    </div>

                                    {/* สถานะของการ์ด (ภาพเท่านั้น การ์ดทั้งใบเป็นปุ่มเปิด/ปิด) */}
                                    <span
                                        aria-hidden
                                        className={`flex size-4 items-center justify-center rounded-[4px] border ${method.isActive ? "border-[#061D36] bg-[#061D36] text-white" : "border-[#9CA3AF] bg-white"}`}
                                    >
                                        {method.isActive ? <LuCheck size={12} strokeWidth={3} /> : null}
                                    </span>
                                </div>

                                <div className="mt-3 truncate text-[14px] font-bold sm:text-[15px]">
                                    {method.label}
                                </div>
                                <div className="mt-1 text-[11px] text-[#667085] sm:text-[12px]">
                                    {method.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                                </div>
                            </Toggle>
                        ))}
                </div>

                <div className="mt-6 min-w-0 rounded-2xl bg-[#EFEFEF] p-4 sm:mt-8 sm:p-5">
                    <div className="mb-4 text-[16px] font-extrabold text-[#2B3640] sm:text-[18px]">
                        การตั้งค่าช่องทางบริการ
                    </div>

                    <div className="space-y-3 sm:space-y-4">
                        {loading
                            ? Array.from({ length: 4 }).map((_, index) => (
                                <div
                                    key={index}
                                    className="h-[86px] animate-pulse rounded-xl bg-white sm:h-[72px]"
                                />
                            ))
                            : channels.map((channel) => {
                                const channelMethods = channel.allowedMethods
                                    .map(
                                        (id) =>
                                            methods.find((method) => method.id === id)?.label
                                    )
                                    .filter(Boolean)
                                    .join(", ");

                                return (
                                    <div
                                        key={channel.id}
                                        className="flex min-w-0 flex-col gap-4 rounded-xl border border-[#E0E2E6] bg-white px-4 py-4 transition hover:bg-[#F8FAFC] sm:flex-row sm:items-center sm:justify-between sm:px-5"
                                    >
                                        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EEF1F4] text-[#061D36] sm:h-10 sm:w-10">
                                                {getChannelIcon(channel.icon)}
                                            </div>

                                            <div className="min-w-0">
                                                <div className="truncate text-[14px] font-bold text-[#1F2937] sm:text-base">
                                                    {channel.name}
                                                </div>
                                                <div className="mt-1 truncate text-[12px] text-[#667085] sm:max-w-[560px]">
                                                    {channelMethods || "ยังไม่ได้กำหนดวิธีชำระเงิน"}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleOpenMapping(channel)}
                                            className="h-10 shrink-0 rounded-full border border-[#FF4D3A] px-5 text-[13px] font-semibold text-[#FF4D3A] transition hover:bg-[#FFF1EF] sm:h-auto sm:py-2"
                                        >
                                            แก้ไข
                                        </button>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            </div>

            <ChannelMappingModal
                key={mappingKey}
                open={openMapping}
                channel={selectedChannel}
                methods={activeMethods}
                onClose={handleCloseMapping}
                onSubmit={handleSaveMapping}
            />
        </>
    );
}

export { ChannelsTab };
