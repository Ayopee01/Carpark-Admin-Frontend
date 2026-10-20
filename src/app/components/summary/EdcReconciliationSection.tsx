"use client";
// Import Library
import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import { LuCircleAlert, LuDownload, LuRefreshCw } from "react-icons/lu";
// Import Client
import { getOverview } from "@/src/app/lib/client/queries";
// Import Landing
import { CHANNEL_LABELS } from "@/src/app/lib/landing/checkPayment";
// Import Types
import type { OverviewQuery } from "@/src/app/type/api/overview";
import type { EdcReconciliation, EdcReconciliationPayment, EdcReconciliationTerminal, EdcVerificationStatus } from "@/src/app/type/api/payments";
// Import Shared
import { getErrorMessage } from "@/src/app/lib/shared/http";
import { formatCount, formatMoney, formatDateTime } from "@/src/app/lib/shared/format";

/* -------------------------------------- Config -------------------------------------- */

// Config ช่วงสูงสุดที่ขอรายการบัตรทีละรายการได้ (ตรงกับ backend: endDate - startDate ไม่เกิน 31 วัน)
const MAX_PAYMENT_RANGE_MS = 31 * 24 * 60 * 60 * 1000;

// Config รอให้ยอดจาก SSE นิ่งก่อนโหลดรายการบัตรใหม่
const REFETCH_DEBOUNCE_MS = 1500;

// Config ข้อความผลตรวจ approval code ที่ต้องแสดง (verified ไม่ต้องแสดง)
const VERIFICATION_LABELS: Partial<Record<EdcVerificationStatus, string>> = {
    unverified: "ยังไม่ยืนยัน",
    rejected: "ไม่ผ่านการตรวจ",
};

/* -------------------------------------- Helpers -------------------------------------- */

// Function key ของ terminal (terminalId เป็น null ได้ = รายการที่ไม่มี terminal)
function terminalKey(terminal: Pick<EdcReconciliationTerminal, "terminalId">): string {
    return terminal.terminalId ?? "";
}

// Function ทำค่าให้ปลอดภัยสำหรับช่อง CSV
function csvCell(value: string | number | null | undefined): string {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// Function ดาวน์โหลดผลกระทบยอดเป็นไฟล์ CSV (ต้องเป็นข้อมูลที่โหลดด้วย include=edc_payments)
function downloadCsv(data: EdcReconciliation, filters: { startDate: string; endDate: string }): void {
    const header = [
        "terminalId",
        "edcDeviceName",
        "paidAt",
        "plateNo",
        "billNo",
        "reference",
        "edcVerification",
        "amount",
        "channel",
        "deviceId",
        "processedBy",
        "paymentId",
        "transactionId",
    ];
    const rows = data.terminals.flatMap((terminal) =>
        (terminal.payments ?? []).map((payment) => [
            payment.terminalId ?? terminal.terminalId,
            terminal.edcDevice?.deviceName ?? "ไม่ตรงกับเครื่องที่ลงทะเบียน",
            formatDateTime(payment.paidAt, { seconds: true }),
            payment.plateNo,
            payment.billNo,
            payment.reference ?? "",
            payment.edcVerification ?? "",
            payment.amount.toFixed(2),
            payment.channel,
            payment.deviceId ?? "",
            payment.processedBy ?? "",
            payment.paymentId,
            payment.transactionId,
        ])
    );

    // ใส่ BOM ให้ Excel เปิดภาษาไทยได้ถูก
    const csv = "﻿" + [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `edc-reconciliation_${filters.startDate.slice(0, 10)}_${filters.endDate.slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

/* -------------------------------------- Component -------------------------------------- */

// Function แถวรายการชำระด้วยบัตรหนึ่งรายการ
function PaymentRow({ payment }: { payment: EdcReconciliationPayment }): JSX.Element {
    const verificationLabel = payment.edcVerification ? VERIFICATION_LABELS[payment.edcVerification] : undefined;

    return (
        <tr className="border-b border-[#F1F2F4]">
            <td className="px-6 py-3">{formatDateTime(payment.paidAt, { seconds: true })}</td>
            <td className="px-4 py-3 font-bold">{payment.plateNo}</td>
            <td className="px-4 py-3">{payment.billNo}</td>
            <td className="px-4 py-3 font-mono">
                {payment.reference ?? <span className="font-sans font-semibold text-amber-700">ไม่มีเลขอ้างอิง</span>}
                {verificationLabel ? (
                    <div className={`font-sans text-[12px] font-semibold ${payment.edcVerification === "rejected" ? "text-red-600" : "text-amber-700"}`}>
                        {verificationLabel}
                    </div>
                ) : null}
            </td>
            <td className="px-4 py-3">
                {CHANNEL_LABELS[payment.channel]}
                {payment.deviceId ? <div className="text-[12px] text-[#98A2B3]">{payment.deviceId}</div> : null}
            </td>
            <td className="px-4 py-3 text-[13px] text-[#67727E]">{payment.processedBy ?? "-"}</td>
            <td className="px-6 py-3 text-right font-semibold">{formatMoney(payment.amount)}</td>
        </tr>
    );
}

// Function tab กระทบยอด EDC ในหน้ายอดรวม ยอดสรุปมาจาก SSE ของ overview ส่วนรายการบัตรโหลดด้วย include=edc_payments
function EdcReconciliationSection({
    summary,
    filters,
    query,
}: {
    summary: EdcReconciliation; // ไม่มี payments (มาจาก overview_snapshot/overview_updated)
    filters: { startDate: string; endDate: string }; // ช่วงจริงที่ backend ใช้
    query: OverviewQuery; // ช่วงวันที่ที่เลือกในหน้า
}): JSX.Element {
    const paymentsAllowed = !(Date.parse(filters.endDate) - Date.parse(filters.startDate) > MAX_PAYMENT_RANGE_MS);
    const queryKey = JSON.stringify(query);

    // รายการบัตรเก็บแยกจากข้อมูล SSE ไม่ให้ overview_updated ทับจนรายการหาย
    const [detail, setDetail] = useState<{ key: string; data: EdcReconciliation } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [reloadKey, setReloadKey] = useState(0);

    // ยอดจาก SSE เปลี่ยนแต่รายการที่โหลดไว้ยังไม่ตรง ให้โหลดใหม่หลังยอดนิ่ง
    const [staleKey, setStaleKey] = useState(0);
    const loaded = detail?.key === queryKey ? detail.data : null;
    const outdated = Boolean(
        loaded &&
        (loaded.total.count !== summary.total.count || Math.abs(loaded.total.amount - summary.total.amount) > 0.005)
    );

    // โหลดใหม่ครั้งเดียวต่อยอดหนึ่งชุด กันวนโหลดถ้ายอดยังไม่ตรง
    const refetchedForRef = useRef<string | null>(null);

    useEffect(() => {
        const summaryKey = `${queryKey}:${summary.total.count}:${summary.total.amount}`;
        if (!outdated || refetchedForRef.current === summaryKey) return;
        const timer = window.setTimeout(() => {
            refetchedForRef.current = summaryKey;
            setStaleKey((value) => value + 1);
        }, REFETCH_DEBOUNCE_MS);
        return () => window.clearTimeout(timer);
    }, [outdated, queryKey, summary.total.amount, summary.total.count]);

    useEffect(() => {
        if (!paymentsAllowed) return;
        let ignore = false;

        async function load() {
            try {
                setLoading(true);
                setError("");
                // 400 INVALID_DATE_RANGE ช่วงเกิน 31 วัน
                const result = await getOverview({ ...(JSON.parse(queryKey) as OverviewQuery), include: "edc_payments" });
                if (!ignore && result.edcReconciliation) setDetail({ key: queryKey, data: result.edcReconciliation });
            } catch (err) {
                if (!ignore) setError(getErrorMessage(err, "โหลดรายการบัตรไม่สำเร็จ"));
            } finally {
                if (!ignore) setLoading(false);
            }
        }

        void load();
        return () => {
            ignore = true;
        };
    }, [paymentsAllowed, queryKey, reloadKey, staleKey]);

    const paymentsByTerminal = useMemo(
        () => new Map((loaded?.terminals ?? []).map((terminal) => [terminalKey(terminal), terminal.payments ?? []])),
        [loaded]
    );

    return (
        <div>
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-[22px] font-extrabold leading-none text-[#1F2937] sm:text-[26px]">
                        กระทบยอด EDC
                    </h2>
                    <p className="mt-2 text-[14px] text-[#6B7280]">
                        • เทียบยอดและเลขอ้างอิงกับรายงานสรุปของเครื่อง EDC ทุกวัน (ใช้ช่วงวันที่ด้านบน รายการทีละรายการดูได้ไม่เกิน 31 วัน)
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setReloadKey((value) => value + 1)}
                        disabled={!paymentsAllowed || loading}
                        className="inline-flex h-10 items-center gap-2 rounded-full border border-[#D8DADF] bg-white px-4 text-[13px] font-semibold transition hover:bg-[#F4F4F4] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <LuRefreshCw size={15} />
                        โหลดใหม่
                    </button>
                    <button
                        type="button"
                        onClick={() => loaded && downloadCsv(loaded, filters)}
                        disabled={!loaded || loaded.total.count === 0}
                        className="inline-flex h-10 items-center gap-2 rounded-full bg-[#061D36] px-5 text-[13px] font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <LuDownload size={15} />
                        ส่งออก CSV
                    </button>
                </div>
            </div>

            {!paymentsAllowed ? (
                <div className="mb-5 rounded-2xl border border-[#D8DADF] bg-white px-5 py-3 text-[14px] text-[#475467]">
                    ช่วงวันที่เกิน 31 วัน แสดงได้เฉพาะยอดสรุปของแต่ละเครื่อง เลือกช่วงให้สั้นลงเพื่อดูรายการและส่งออก CSV
                </div>
            ) : null}

            {error ? (
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-[14px] text-red-600">
                    {error}
                </div>
            ) : null}

            {summary.missingReferenceCount > 0 || summary.unverifiedCount > 0 ? (
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-[14px] text-amber-900">
                    <LuCircleAlert size={20} className="mt-0.5 shrink-0" />
                    <div className="space-y-1">
                        {summary.missingReferenceCount > 0 ? (
                            <p>
                                มี {formatCount(summary.missingReferenceCount)} รายการที่ไม่มีเลขอ้างอิง (รายการเก่า)
                                ต้องตรวจกับสลิปหรือรายงานของเครื่อง EDC ด้วยมือ
                            </p>
                        ) : null}
                        {summary.unverifiedCount > 0 ? (
                            <p>มี {formatCount(summary.unverifiedCount)} รายการที่ยังไม่ได้ยืนยัน approval code กับเครื่อง EDC</p>
                        ) : null}
                    </div>
                </div>
            ) : null}

            <div className="mb-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#D8DADF] bg-white px-5 py-4">
                    <p className="text-[13px] text-[#67727E]">จำนวนรายการบัตร</p>
                    <p className="mt-1 text-[26px] font-extrabold">{formatCount(summary.total.count)} รายการ</p>
                </div>
                <div className="rounded-2xl border border-[#D8DADF] bg-white px-5 py-4">
                    <p className="text-[13px] text-[#67727E]">ยอดรวม</p>
                    <p className="mt-1 text-[26px] font-extrabold">{formatMoney(summary.total.amount)} ฿</p>
                </div>
            </div>

            {summary.terminals.length === 0 ? (
                <div className="rounded-[20px] bg-white px-6 py-10 text-center text-[#64748B]">
                    ไม่มีรายการรับบัตรในช่วงนี้
                </div>
            ) : (
                <div className="space-y-6">
                    {summary.terminals.map((terminal) => {
                        // ไม่มีเครื่อง EDC ที่ลงทะเบียนของ TID นี้ ไฮไลต์ให้ตรวจ
                        const unknownTerminal = !terminal.edcDevice;
                        const payments = paymentsByTerminal.get(terminalKey(terminal));

                        return (
                            <article
                                key={terminalKey(terminal)}
                                className={`overflow-hidden rounded-[20px] border bg-white shadow-sm ${unknownTerminal ? "border-red-400 ring-2 ring-red-200" : "border-[#BAC0C8]"}`}
                            >
                                <div className={`flex flex-wrap items-center justify-between gap-3 px-6 py-4 text-white ${unknownTerminal ? "bg-[#991B1B]" : "bg-[#031C36]"}`}>
                                    <div>
                                        <h3 className="text-[18px] font-extrabold">
                                            {terminal.edcDevice?.deviceName ?? (terminal.terminalId ? "เครื่องที่ไม่ได้ลงทะเบียน" : "ไม่มี Terminal ID")}{" "}
                                            {terminal.terminalId ? (
                                                <span className="font-mono text-[14px] font-semibold text-white/80">
                                                    TID {terminal.terminalId}
                                                </span>
                                            ) : null}
                                        </h3>
                                        <p className="mt-1 text-[13px] text-white/80">
                                            {unknownTerminal
                                                ? "TID นี้ไม่ตรงกับเครื่อง EDC ที่ลงทะเบียนไว้ ต้องตรวจสอบ • "
                                                : [
                                                    terminal.edcDevice?.usage === "device" ? "ติดกับ Kiosk/Gate" : "เคาน์เตอร์ Admin",
                                                    terminal.edcDevice?.location,
                                                    terminal.edcDevice?.provider,
                                                ]
                                                    .filter(Boolean)
                                                    .join(" • ") + " • "}
                                            {terminal.channels.map((channel) => CHANNEL_LABELS[channel]).join(", ")}
                                            {terminal.deviceIds.length ? ` • ${terminal.deviceIds.join(", ")}` : ""}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[13px] text-white/80">{formatCount(terminal.count)} รายการ</div>
                                        <div className="text-[20px] font-extrabold">{formatMoney(terminal.amount)} ฿</div>
                                    </div>
                                </div>

                                {!paymentsAllowed ? null : payments ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[900px] text-left text-[14px]">
                                            <thead className="border-b border-[#E5E7EB] bg-[#F8FAFC] text-[13px] text-[#67727E]">
                                                <tr>
                                                    <th className="px-6 py-3 font-semibold">เวลาที่จ่าย</th>
                                                    <th className="px-4 py-3 font-semibold">ทะเบียน</th>
                                                    <th className="px-4 py-3 font-semibold">เลขบิล</th>
                                                    <th className="px-4 py-3 font-semibold">เลขอ้างอิง (สลิป)</th>
                                                    <th className="px-4 py-3 font-semibold">ช่องทาง</th>
                                                    <th className="px-4 py-3 font-semibold">ผู้บันทึก</th>
                                                    <th className="px-6 py-3 text-right font-semibold">ยอด (บาท)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {payments.map((payment) => (
                                                    <PaymentRow key={payment.paymentId} payment={payment} />
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="px-6 py-6 text-center text-[14px] text-[#64748B]">
                                        {loading ? "กำลังโหลดรายการ..." : "ยังไม่มีรายการของเครื่องนี้ กด โหลดใหม่"}
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export { EdcReconciliationSection };
