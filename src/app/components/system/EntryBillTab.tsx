"use client";
// Import Library
import { useEffect, useState, type JSX } from "react";
import type { ReactNode } from "react";
import { LuCalendarDays, LuClock3, LuQrCode, LuReceiptText } from "react-icons/lu";
// Import Api
import { getSystemSettings, updateReceiptSettings } from "@/src/app/lib/api/system-settings";
// Import Landing
import { DEFAULT_RECEIPT_SETTINGS, toReceiptForm } from "@/src/app/lib/landing/system";
// Import Types
import type { SystemSettings } from "@/src/app/type/api/system-settings";
import type { ReceiptSettingsForm } from "@/src/app/type/ui/system";

// Function แถวเปิดปิดการแสดงผลหนึ่งรายการ
function RowItem({
    icon,
    label,
    checked,
    onChange,
}: {
    icon: ReactNode;
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}): JSX.Element {
    return (
        <label className="flex w-full cursor-pointer items-center justify-between rounded-xl bg-[#E8EBEF] px-5 py-4 transition hover:bg-[#DDE2E8]">
            <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[#1F2933]">
                    {icon}
                </div>

                <span className="text-[16px] text-[#1F2933]">{label}</span>
            </div>

            <input
                type="checkbox"
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
                className="h-5 w-5 accent-[#061D36]"
            />
        </label>
    );
}

// Function แท็บตั้งค่าใบเสร็จขาเข้า
function EntryBillTab(): JSX.Element {
    const [receipt, setReceipt] = useState<ReceiptSettingsForm>(DEFAULT_RECEIPT_SETTINGS);
    const [draft, setDraft] = useState<ReceiptSettingsForm>(DEFAULT_RECEIPT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // ใส่การตั้งค่าใบเสร็จที่โหลดมาลง state (อยู่ใน GET /system-settings .receipt)
    function applyReceipt(result: SystemSettings): ReceiptSettingsForm {
        const nextReceipt = toReceiptForm(result.receipt);
        setReceipt(nextReceipt);
        setDraft(nextReceipt);
        return nextReceipt;
    }

    async function fetchReceiptSettings(showLoading = true) {
        try {
            if (showLoading) {
                setLoading(true);
            }
            setError("");
            setSuccess("");

            return applyReceipt(await getSystemSettings());
        } catch (err) {
            setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
            return null;
        } finally {
            if (showLoading) {
                setLoading(false);
            }
        }
    }

    // โหลดครั้งแรก (loading เริ่มเป็น true อยู่แล้ว) set state ใน callback เท่านั้น
    useEffect(() => {
        getSystemSettings()
            .then(applyReceipt)
            .catch((err: unknown) => setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด"))
            .finally(() => setLoading(false));
    }, []);

    function updateEntryBill(key: keyof ReceiptSettingsForm["entryBill"], value: boolean) {
        setDraft((prev) => ({
            ...prev,
            entryBill: {
                ...prev.entryBill,
                [key]: value,
            },
        }));
    }

    function handleCancel() {
        setDraft(receipt);
        setError("");
        setSuccess("");
    }

    async function handleSubmit() {
        try {
            setSubmitting(true);
            setError("");
            setSuccess("");

            // PUT /system-settings merge ทีละ field แล้วโหลดใหม่
            await updateReceiptSettings({
                entryBill: draft.entryBill,
                footerText: draft.footerText,
            });

            await fetchReceiptSettings(false);
            setSuccess("บันทึกข้อมูลใบเข้าใช้บริการเรียบร้อยแล้ว");
        } catch (err) {
            setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="grid min-w-0 max-w-full grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="h-[430px] animate-pulse rounded-2xl bg-white" />
                <div className="h-[520px] animate-pulse rounded-2xl bg-[#D9DDE4]" />
            </div>
        );
    }

    return (
        <div className="grid min-w-0 max-w-full grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 rounded-2xl border-t-4 border-[#0D1B2A] bg-white p-4 shadow-sm sm:p-6">
                <h2 className="flex items-center gap-3 text-[22px] font-extrabold text-[#1F2933]">
                    <span className="h-6 w-1 rounded-full bg-[#1F2933]" />
                    กำหนดข้อมูลในใบเข้าใช้บริการ
                </h2>

                {error ? (
                    <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
                        {error}
                    </div>
                ) : null}

                {success ? (
                    <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-[13px] text-green-700">
                        {success}
                    </div>
                ) : null}

                <div className="mt-8 space-y-4">
                    <RowItem
                        icon={<LuCalendarDays size={18} />}
                        label="วัน เดือน ปี"
                        checked={draft.entryBill.showDate}
                        onChange={(checked) => updateEntryBill("showDate", checked)}
                    />
                    <RowItem
                        icon={<LuClock3 size={18} />}
                        label="เวลาเข้า"
                        checked={draft.entryBill.showEntryTime}
                        onChange={(checked) => updateEntryBill("showEntryTime", checked)}
                    />
                    <RowItem
                        icon={<LuQrCode size={18} />}
                        label="QR Code"
                        checked={draft.entryBill.showQrCode}
                        onChange={(checked) => updateEntryBill("showQrCode", checked)}
                    />
                    <RowItem
                        icon={<LuReceiptText size={18} />}
                        label="รหัสบิล"
                        checked={draft.entryBill.showBillNo}
                        onChange={(checked) => updateEntryBill("showBillNo", checked)}
                    />
                </div>

                <div className="mt-10 flex justify-center gap-4 border-t border-[#E5E7EB] pt-6">
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="rounded-full bg-[#061D36] px-8 py-3 text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {submitting ? "กำลังบันทึก..." : "บันทึก"}
                    </button>
                    <button
                        type="button"
                        onClick={handleCancel}
                        disabled={submitting}
                        className="rounded-full bg-[#E5E7EB] px-8 py-3 text-[14px] font-semibold text-[#1F2933] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        ยกเลิก
                    </button>
                </div>
            </div>

            <div className="rounded-2xl bg-[#D9DDE4] p-5 shadow-sm">
                <div className="mb-4 text-[18px] font-bold text-[#1F2933]">ตัวอย่าง</div>

                <div className="mx-auto w-full max-w-[260px] rounded-xl bg-white p-6 shadow-md">
                    <div className="text-center text-[28px] font-extrabold text-[#1F2933]">
                        Smart Carpark
                    </div>
                    <div className="mt-1 text-center text-[10px] text-[#6B7280]">
                        ระบบจอดรถอัจฉริยะ | อาคาร A-12
                    </div>

                    <div className="mt-8 grid grid-cols-2 gap-y-2 text-[13px]">
                        {draft.entryBill.showDate ? (
                            <>
                                <div>วันที่ :</div>
                                <div className="text-right">25/10/2023</div>
                            </>
                        ) : null}

                        {draft.entryBill.showEntryTime ? (
                            <>
                                <div>เวลาเข้า :</div>
                                <div className="text-right">14:30:22</div>
                            </>
                        ) : null}

                        {draft.entryBill.showBillNo ? (
                            <>
                                <div>รหัสบิล :</div>
                                <div className="text-right">#GP-09941</div>
                            </>
                        ) : null}
                    </div>

                    {draft.entryBill.showQrCode ? (
                        <div className="mx-auto mt-8 flex h-32 w-32 items-center justify-center bg-[#F3F4F6]">
                            QR
                        </div>
                    ) : null}

                    <div className="mt-8 border-t border-dashed border-[#D1D5DB] pt-6 text-center">
                        <div className="text-[18px] font-bold">{draft.footerText}</div>
                        <div className="mt-1 text-[11px] text-[#6B7280]">
                            โปรดเก็บใบเสร็จนี้เพื่อใช้อ้างอิงภายหลัง
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export { EntryBillTab };
