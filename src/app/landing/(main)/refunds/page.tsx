"use client";
// Import Library
import { useCallback, useEffect, useState, type JSX } from "react";
import { LuCircleAlert, LuRefreshCw, LuX } from "react-icons/lu";
// Import Providers
import { useRefundAlerts } from "@/src/app/providers/RefundAlertsProvider";
// Import Api
import { getRefunds, resolveRefund } from "@/src/app/lib/api/payments";
// Import Landing
import { REFUND_REASON_LABELS } from "@/src/app/lib/landing/checkPayment";
// Import Types
import type { GatewayCharge, RefundListResponse, RefundStatusFilter } from "@/src/app/type/api/payments";
// Import Shared
import { ApiError, getErrorMessage } from "@/src/app/lib/shared/http";
import { formatMoney, satangToBaht } from "@/src/app/lib/shared/format";

/* -------------------------------------- Config -------------------------------------- */

// Config ชื่อที่แสดงของช่องทางชำระ
const CHANNEL_LABELS: Record<string, string> = {
    cashier: "แคชเชียร์",
    kiosk: "Kiosk",
    gate: "ประตูทางออก",
    mobile: "Mobile",
};

/* -------------------------------------- Helpers -------------------------------------- */

// Function แปลงวันเวลาเป็นข้อความไทย (ไม่มีค่า = -)
function formatDateTime(value: string | null): string {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("th-TH", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

// Function แปลงสตางค์เป็นข้อความบาท
function formatSatang(value: number | null): string {
    return `${formatMoney(satangToBaht(value))} ฿`;
}

/* -------------------------------------- Component -------------------------------------- */

// Function หน้ารายการรอคืนเงิน บันทึกว่าคืนเงินแล้ว
function RefundsPage(): JSX.Element {
    const [status, setStatus] = useState<RefundStatusFilter>("pending");
    const [data, setData] = useState<RefundListResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const [resolving, setResolving] = useState<GatewayCharge | null>(null);
    const [note, setNote] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [modalError, setModalError] = useState("");

    const fetchRefunds = useCallback(async (nextStatus: RefundStatusFilter) => {
        try {
            setLoading(true);
            setError("");

            setData(await getRefunds(nextStatus));
        } catch (err) {
            setError(getErrorMessage(err, "โหลดรายการรอคืนเงินไม่สำเร็จ"));
        } finally {
            setLoading(false);
        }
    }, []);

    // โหลดใหม่เมื่อ stream แจ้งรายการใหม่หรือคืนเงินแล้ว
    const { version } = useRefundAlerts();

    useEffect(() => {
        void fetchRefunds(status);
    }, [fetchRefunds, status, version]);

    function openResolve(item: GatewayCharge) {
        setResolving(item);
        setNote("");
        setModalError("");
    }

    async function handleResolve() {
        if (!resolving || submitting) return;
        const item = resolving;
        const trimmed = note.trim();

        try {
            setSubmitting(true);
            setModalError("");

            await resolveRefund(item.chargeId, trimmed ? { note: trimmed } : {});

            setMessage(`บันทึกการคืนเงินทะเบียน ${item.plateNo ?? item.chargeId} แล้ว`);
            setResolving(null);
            await fetchRefunds(status);
        } catch (err) {
            const plate = item.plateNo ?? item.chargeId;

            // 409 มีคนบันทึกไปแล้ว ไม่ใช่ error ให้ปิดเงียบ ๆ
            if (err instanceof ApiError && err.code === "REFUND_ALREADY_RESOLVED") {
                setResolving(null);
                setMessage(`ทะเบียน ${plate} มีผู้บันทึกการคืนเงินไปแล้ว`);
                await fetchRefunds(status);
                return;
            }

            if (
                err instanceof ApiError &&
                (err.code === "REFUND_NOT_REQUIRED" || err.code === "GATEWAY_CHARGE_NOT_FOUND")
            ) {
                setResolving(null);
                setError(err.message);
                await fetchRefunds(status);
                return;
            }

            setModalError(getErrorMessage(err, "บันทึกการคืนเงินไม่สำเร็จ"));
        } finally {
            setSubmitting(false);
        }
    }

    const items = data?.data ?? [];
    const summary = data?.summary;

    return (
        <>
            <section className="min-h-screen bg-[#EFEFEF] px-4 py-6 text-[#1F2933] md:px-8 md:py-8">
                <div className="mx-auto max-w-[1400px]">
                    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h1 className="text-[28px] font-extrabold leading-none text-[#2B3640] sm:text-[34px]">
                                รายการรอคืนเงิน
                            </h1>
                            <p className="mt-3 text-[15px] text-[#67727E]">
                                • เงินที่ลูกค้าจ่ายผ่าน QR PromptPay ซ้ำหรือเกินยอด
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => void fetchRefunds(status)}
                            className="inline-flex h-10 items-center gap-2 rounded-full border border-[#D8DADF] bg-white px-4 text-[13px] font-semibold text-[#1F2933] transition hover:bg-[#F4F4F4]"
                        >
                            <LuRefreshCw size={15} />
                            โหลดใหม่
                        </button>
                    </div>

                    <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-[14px] text-amber-900">
                        <LuCircleAlert size={20} className="mt-0.5 shrink-0" />
                        <div className="space-y-1">
                            <p>
                                PromptPay คืนเงินผ่านระบบไม่ได้ กรุณาคืนเงินสดหรือโอนคืน แล้วกด
                                &quot;บันทึกว่าคืนเงินเองแล้ว&quot; (เป็นการบันทึกเท่านั้น ไม่ได้โอนเงินให้)
                            </p>
                            <p className="text-[13px] text-amber-800">
                                การชำระด้วยบัตรรับผ่านเครื่อง EDC ทั้งหมดและไม่อยู่ในหน้านี้ ถ้าต้องคืนให้ void/refund
                                ที่เครื่อง EDC โดยใช้เลขอ้างอิงจากสลิป
                            </p>
                        </div>
                    </div>

                    {summary ? (
                        <div className="mb-5 grid gap-4 sm:grid-cols-2">
                            <div className="rounded-2xl border border-[#D8DADF] bg-white px-5 py-4">
                                <p className="text-[13px] text-[#67727E]">รอคืนเงิน</p>
                                <p className="mt-1 text-[26px] font-extrabold">{summary.pendingCount} รายการ</p>
                            </div>
                            <div className="rounded-2xl border border-[#D8DADF] bg-white px-5 py-4">
                                <p className="text-[13px] text-[#67727E]">ยอดที่ต้องคืนทั้งหมด</p>
                                <p className="mt-1 text-[26px] font-extrabold text-[#DC2626]">
                                    {formatSatang(summary.pendingAmount)}
                                </p>
                            </div>
                        </div>
                    ) : null}

                    {message ? (
                        <div className="mb-4 rounded-2xl border border-green-200 bg-green-50 px-5 py-3 text-[14px] text-green-700">
                            {message}
                        </div>
                    ) : null}

                    <div className="overflow-hidden rounded-[20px] border border-[#BAC0C8] bg-white shadow-sm">
                        <div className="flex flex-wrap items-center gap-2 bg-[#031C36] px-6 py-4">
                            {(["pending", "resolved"] as const).map((value) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => {
                                        setMessage("");
                                        setStatus(value);
                                    }}
                                    className={`rounded-full px-5 py-2 text-[14px] font-semibold transition ${status === value
                                        ? "bg-white text-[#1F2933]"
                                        : "text-white hover:bg-white/10"
                                        }`}
                                >
                                    {value === "pending" ? "รอคืนเงิน" : "คืนแล้ว"}
                                </button>
                            ))}
                        </div>

                        {error ? (
                            <div className="px-6 py-4 text-[14px] text-red-600">{error}</div>
                        ) : null}

                        {loading && !data ? (
                            <div className="px-6 py-10 text-center text-[#64748B]">กำลังโหลดข้อมูล...</div>
                        ) : items.length === 0 ? (
                            <div className="px-6 py-10 text-center text-[#64748B]">
                                {status === "pending" ? "ไม่มีรายการรอคืนเงิน" : "ยังไม่มีประวัติการคืนเงิน"}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[960px] text-left text-[14px]">
                                    <thead className="border-b border-[#E5E7EB] bg-[#F8FAFC] text-[13px] text-[#67727E]">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold">ทะเบียน</th>
                                            <th className="px-4 py-3 font-semibold">วันเวลาที่จ่าย</th>
                                            <th className="px-4 py-3 font-semibold">ช่องทาง</th>
                                            <th className="px-4 py-3 text-right font-semibold">ยอดที่ลูกค้าจ่าย</th>
                                            <th className="px-4 py-3 text-right font-semibold">ยอดที่ต้องคืน</th>
                                            <th className="px-4 py-3 font-semibold">เหตุผล</th>
                                            <th className="px-6 py-3 font-semibold">
                                                {status === "pending" ? "" : "บันทึกการคืน"}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item) => (
                                            <tr key={item.chargeId} className="border-b border-[#F1F2F4] align-top">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold">{item.plateNo ?? "-"}</div>
                                                    <div className="mt-1 break-all text-[12px] text-[#98A2B3]">
                                                        {item.chargeId}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">{formatDateTime(item.paidAt)}</td>
                                                <td className="px-4 py-4">
                                                    {CHANNEL_LABELS[item.channel] ?? item.channel}
                                                    <div className="text-[12px] text-[#98A2B3]">{item.method}</div>
                                                </td>
                                                <td className="px-4 py-4 text-right">{formatSatang(item.amount)}</td>
                                                <td className="px-4 py-4 text-right font-bold text-[#DC2626]">
                                                    {formatSatang(item.refundAmount)}
                                                </td>
                                                <td className="px-4 py-4">
                                                    {item.refundReason ? REFUND_REASON_LABELS[item.refundReason] ?? item.refundReason : "-"}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {status === "pending" ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => openResolve(item)}
                                                            className="whitespace-nowrap rounded-full bg-[#061D36] px-4 py-2 text-[13px] font-bold text-white transition hover:opacity-90"
                                                        >
                                                            บันทึกว่าคืนเงินเองแล้ว
                                                        </button>
                                                    ) : (
                                                        <div className="text-[13px]">
                                                            <div className="font-semibold">
                                                                คืนเงินเอง
                                                                {item.refundResolvedBy ? ` โดย ${item.refundResolvedBy}` : ""}
                                                            </div>
                                                            <div className="text-[#67727E]">
                                                                {formatDateTime(item.refundResolvedAt)}
                                                            </div>
                                                            {item.refundNote ? (
                                                                <div className="mt-1 text-[#67727E]">{item.refundNote}</div>
                                                            ) : null}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {resolving ? (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#26313C]/75 px-4 py-6 backdrop-blur-sm">
                    <div className="relative w-full max-w-[480px] rounded-[14px] bg-white p-6 shadow-2xl sm:p-8">
                        <button
                            type="button"
                            onClick={() => setResolving(null)}
                            disabled={submitting}
                            aria-label="ปิด"
                            className="absolute right-6 top-6 text-[#061D36] disabled:opacity-50"
                        >
                            <LuX size={22} />
                        </button>

                        <h2 className="text-[22px] font-bold text-[#061D36]">บันทึกว่าคืนเงินเองแล้ว</h2>

                        <dl className="mt-4 grid grid-cols-[110px_1fr] gap-y-2 text-[14px]">
                            <dt className="text-[#667085]">ทะเบียน</dt>
                            <dd className="font-bold">{resolving.plateNo ?? "-"}</dd>
                            <dt className="text-[#667085]">ช่องทาง</dt>
                            <dd>{CHANNEL_LABELS[resolving.channel] ?? resolving.channel}</dd>
                            <dt className="text-[#667085]">ยอดคืน</dt>
                            <dd className="font-bold text-[#DC2626]">{formatSatang(resolving.refundAmount)}</dd>
                        </dl>

                        <p className="mt-3 text-[13px] text-[#667085]">
                            ยืนยันเมื่อคืนเงินสดหรือโอนคืนให้ลูกค้าแล้วเท่านั้น
                        </p>

                        <label htmlFor="refund-note" className="mt-5 block text-[13px] font-semibold text-[#1F2937]">
                            หมายเหตุ (ไม่บังคับ)
                        </label>
                        <textarea
                            id="refund-note"
                            value={note}
                            onChange={(event) => setNote(event.target.value)}
                            rows={3}
                            placeholder="เช่น คืนเงินสดที่เคาน์เตอร์ หรือ โอนคืนบัญชี xxx"
                            className="mt-2 w-full rounded-md border border-[#E5E7EB] px-4 py-3 text-[14px] outline-none"
                        />

                        {modalError ? (
                            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
                                {modalError}
                            </div>
                        ) : null}

                        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setResolving(null)}
                                disabled={submitting}
                                className="h-11 min-w-[110px] rounded-full bg-[#9CA3AF] px-6 text-[14px] font-bold text-white disabled:opacity-60"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleResolve()}
                                disabled={submitting}
                                className="h-11 min-w-[110px] rounded-full bg-[#061D36] px-6 text-[14px] font-bold text-white disabled:opacity-60"
                            >
                                {submitting ? "กำลังบันทึก..." : "บันทึกว่าคืนเงินเองแล้ว"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}

export default RefundsPage;
