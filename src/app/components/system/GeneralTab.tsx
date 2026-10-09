"use client";
// Import Library
import { useEffect, useState, type JSX } from "react";
// Import Api
import { getSystemSettings, updateSystemSettings } from "@/src/app/lib/api/system-settings";
// Import Landing
import { DEFAULT_SYSTEM_SETTINGS, toSystemSettingsForm } from "@/src/app/lib/landing/system";
// Import Types
import type { SystemLanguage, SystemSettingsUpdateRequest, SystemSettings } from "@/src/app/type/api/system-settings";
import type { SystemSettingsForm } from "@/src/app/type/ui/system";

// Function แท็บตั้งค่าทั่วไปของระบบ
function GeneralTab(): JSX.Element {
    const [settings, setSettings] = useState<SystemSettingsForm>(DEFAULT_SYSTEM_SETTINGS);
    const [draft, setDraft] = useState<SystemSettingsForm>(DEFAULT_SYSTEM_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // ใส่การตั้งค่าระบบที่โหลดมาลง state
    function applySettings(result: SystemSettings): SystemSettingsForm {
        const nextSettings = toSystemSettingsForm(result);
        setSettings(nextSettings);
        setDraft(nextSettings);
        return nextSettings;
    }

    async function fetchSystemSettings(showLoading = true) {
        try {
            if (showLoading) {
                setLoading(true);
            }
            setError("");
            setSuccess("");

            return applySettings(await getSystemSettings());
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
            .then(applySettings)
            .catch((err: unknown) => setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด"))
            .finally(() => setLoading(false));
    }, []);

    function handleCancel() {
        setDraft(settings);
        setError("");
        setSuccess("");
    }

    async function handleSubmit() {
        try {
            setSubmitting(true);
            setError("");
            setSuccess("");

            const payload: SystemSettingsUpdateRequest = {
                general: draft.general,
                billing: draft.billing,
                receipt: {
                    printer: { paperWidth: draft.receipt.paperWidth },
                    footerText: draft.receipt.footerText,
                },
            };

            // ได้แค่ success/message ต้องโหลดใหม่ด้านล่าง
            await updateSystemSettings(payload);

            await fetchSystemSettings(false);
            setSuccess("บันทึกข้อมูลตั้งค่าระบบเรียบร้อยแล้ว");
        } catch (err) {
            setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="grid min-w-0 max-w-full grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="h-[520px] animate-pulse rounded-2xl bg-white" />
                <div className="h-[420px] animate-pulse rounded-2xl bg-[#D9DDE4]" />
            </div>
        );
    }

    return (
        <div className="grid min-w-0 max-w-full grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 rounded-2xl border-t-4 border-[#0D1B2A] bg-white p-4 shadow-sm sm:p-6">
                <h2 className="flex items-center gap-3 text-[22px] font-extrabold text-[#1F2933]">
                    <span className="h-6 w-1 rounded-full bg-[#1F2933]" />
                    ตั้งค่าระบบทั่วไป
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

                <div className="mt-8 space-y-6">
                    <div>
                        <label className="mb-2 block text-[14px] text-[#667085]">
                            ชื่อระบบ
                        </label>
                        <input
                            value={draft.general.systemName}
                            onChange={(event) =>
                                setDraft((prev) => ({
                                    ...prev,
                                    general: {
                                        ...prev.general,
                                        systemName: event.target.value,
                                    },
                                }))
                            }
                            className="w-full rounded-xl bg-[#E5E7EB] px-4 py-4 text-[18px] font-bold text-[#1F2933] outline-none"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-[14px] text-[#667085]">
                            สถานที่
                        </label>
                        <input
                            value={draft.general.location}
                            onChange={(event) =>
                                setDraft((prev) => ({
                                    ...prev,
                                    general: {
                                        ...prev.general,
                                        location: event.target.value,
                                    },
                                }))
                            }
                            className="w-full rounded-xl bg-[#E5E7EB] px-4 py-4 text-[18px] font-bold text-[#1F2933] outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-[14px] text-[#667085]">
                                ภาษา
                            </label>
                            <select
                                value={draft.general.language}
                                onChange={(event) =>
                                    setDraft((prev) => ({
                                        ...prev,
                                        general: {
                                            ...prev.general,
                                            language: event.target.value as SystemLanguage,
                                        },
                                    }))
                                }
                                className="w-full rounded-xl bg-[#E5E7EB] px-4 py-4 text-[16px] font-bold text-[#1F2933] outline-none"
                            >
                                <option value="th">ไทย</option>
                                <option value="en">English</option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block text-[14px] text-[#667085]">
                                Timezone
                            </label>
                            {/* backend คิดเวลาไทยเสมอ แก้ไม่ได้ */}
                            <div className="w-full rounded-xl bg-[#E5E7EB] px-4 py-4 text-[16px] font-bold text-[#1F2933]">
                                {draft.general.timezone}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-[14px] text-[#667085]">
                                ขนาดกระดาษ
                            </label>
                            <select
                                value={draft.receipt.paperWidth}
                                onChange={(event) =>
                                    setDraft((prev) => ({
                                        ...prev,
                                        receipt: {
                                            ...prev.receipt,
                                            paperWidth: Number(event.target.value),
                                        },
                                    }))
                                }
                                className="w-full rounded-xl bg-[#E5E7EB] px-4 py-4 text-[16px] font-bold text-[#1F2933] outline-none"
                            >
                                <option value={58}>58 mm</option>
                                <option value={80}>80 mm</option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block text-[14px] text-[#667085]">
                                สกุลเงิน
                            </label>
                            {/* backend รองรับแค่ THB */}
                            <div className="w-full rounded-xl bg-[#E5E7EB] px-4 py-4 text-[16px] font-bold text-[#1F2933]">
                                {draft.billing.currency}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-[14px] text-[#667085]">
                            ข้อความท้ายใบเสร็จ
                        </label>
                        <textarea
                            value={draft.receipt.footerText}
                            onChange={(event) =>
                                setDraft((prev) => ({
                                    ...prev,
                                    receipt: {
                                        ...prev.receipt,
                                        footerText: event.target.value,
                                    },
                                }))
                            }
                            rows={3}
                            className="w-full resize-none rounded-xl bg-[#E5E7EB] px-4 py-4 text-[16px] font-bold text-[#1F2933] outline-none"
                        />
                    </div>

                    <label className="flex items-center justify-between rounded-xl bg-[#E8EBEF] px-5 py-4">
                        <span className="text-[15px] font-semibold text-[#1F2933]">
                            เปิดใช้งานภาษี
                        </span>
                        <input
                            type="checkbox"
                            checked={draft.billing.taxEnabled}
                            onChange={(event) =>
                                setDraft((prev) => ({
                                    ...prev,
                                    billing: {
                                        ...prev.billing,
                                        taxEnabled: event.target.checked,
                                    },
                                }))
                            }
                            className="h-5 w-5 accent-[#061D36]"
                        />
                    </label>
                </div>

                <div className="mt-10 flex justify-end gap-4 border-t border-[#E5E7EB] pt-6">
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

            <div className="space-y-4">
                <div className="rounded-2xl bg-[#D9DDE4] p-5 shadow-sm">
                    <div className="text-[18px] font-bold text-[#1F2933]">
                        ข้อมูลปัจจุบัน
                    </div>

                    <div className="mt-4 space-y-3 text-[14px] text-[#667085]">
                        <div>
                            <span className="font-bold text-[#1F2933]">ระบบ:</span>{" "}
                            {draft.general.systemName}
                        </div>
                        <div>
                            <span className="font-bold text-[#1F2933]">สถานที่:</span>{" "}
                            {draft.general.location}
                        </div>
                        <div>
                            <span className="font-bold text-[#1F2933]">ภาษา:</span>{" "}
                            {draft.general.language}
                        </div>
                        <div>
                            <span className="font-bold text-[#1F2933]">Timezone:</span>{" "}
                            {draft.general.timezone}
                        </div>
                        <div>
                            <span className="font-bold text-[#1F2933]">กระดาษ:</span>{" "}
                            {draft.receipt.paperWidth} mm
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl bg-[#D9DDE4] p-5 shadow-sm">
                    <div className="mb-4 text-[18px] font-bold text-[#1F2933]">
                        Live Preview
                    </div>

                    <div className="mx-auto max-w-[220px] rounded-xl bg-white p-5 shadow-sm">
                        <div className="text-center text-[18px] font-extrabold text-[#1F2933]">
                            {draft.general.systemName}
                        </div>
                        <div className="mt-1 text-center text-[10px] text-[#667085]">
                            {draft.general.location}
                        </div>

                        <div className="mt-6 space-y-2 text-[11px] text-[#374151]">
                            <div>วันที่ : 25/10/2023</div>
                            <div>เวลาเข้า : 14:30:22</div>
                            <div>รหัสบิล : #A8902</div>
                        </div>

                        <div className="mx-auto mt-8 h-20 w-20 rounded bg-[#F3F4F6]" />

                        <div className="mt-6 border-t border-dashed border-[#D1D5DB] pt-4 text-center text-[10px] text-[#6B7280]">
                            {draft.receipt.footerText}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export { GeneralTab };
