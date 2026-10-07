"use client";
// Import Library
import { useEffect, useMemo, useState, type JSX } from "react";
import type { DateRange } from "react-day-picker";
import { LuCircleAlert, LuDownload, LuRefreshCw } from "react-icons/lu";
// Import Components
import { DateRangeFilter } from "@/src/app/components/shared/DateRangeFilter";
// Import Api
import { getEdcReconciliation } from "@/src/app/lib/api/payments";
// Import Types
import type { EdcReconciliation, EdcReconciliationPayment, EdcReconciliationQuery } from "@/src/app/type/api/payments";
// Import Shared
import { getErrorMessage } from "@/src/app/lib/shared/http";
import { formatCount, formatMoney } from "@/src/app/lib/shared/format";

/* -------------------------------------- Config -------------------------------------- */

// Config ชื่อที่แสดงของช่องทางชำระ
const CHANNEL_LABELS: Record<string, string> = {
    cashier: "แคชเชียร์",
    kiosk: "Kiosk",
    gate: "ประตูทางออก",
    mobile: "Mobile",
};

/* -------------------------------------- Helpers -------------------------------------- */

// Function แปลงวันที่เป็น YYYY-MM-DD
function toDateParam(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

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
        second: "2-digit",
        timeZone: "Asia/Bangkok",
    }).format(date);
}

// Function แปลงวันที่เป็นข้อความไทย
function formatDateOnly(value?: string): string {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("th-TH", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Bangkok",
    }).format(date);
}

// Function สร้าง query จากช่วงวันที่ (วันเดียว = date, ช่วง = start_date/end_date)
function buildQuery(range?: DateRange): EdcReconciliationQuery {
    if (!range?.from) return {};
    const start = toDateParam(range.from);
    const end = toDateParam(range.to ?? range.from);

    if (start === end) return { date: start };

    return { start_date: start, end_date: end };
}

// Function ทำค่าให้ปลอดภัยสำหรับช่อง CSV
function csvCell(value: string | number | null | undefined): string {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// Function ดาวน์โหลดผลกระทบยอดเป็นไฟล์ CSV
function downloadCsv(data: EdcReconciliation): void {
    const header = [
        "terminalId",
        "edcDeviceName",
        "paidAt",
        "plateNo",
        "billNo",
        "reference",
        "amount",
        "channel",
        "deviceId",
        "processedBy",
        "paymentId",
        "transactionId",
    ];
    const rows = data.terminals.flatMap((terminal) =>
        terminal.payments.map((payment) => [
            payment.terminalId ?? terminal.terminalId,
            terminal.edcDevice?.deviceName ?? "ไม่ตรงกับเครื่องที่ลงทะเบียน",
            formatDateTime(payment.paidAt),
            payment.plateNo,
            payment.billNo,
            payment.reference ?? "",
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
    link.download = `edc-reconciliation_${data.range.startDate.slice(0, 10)}_${data.range.endDate.slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

/* -------------------------------------- Component -------------------------------------- */

// Function แถวรายการชำระด้วยบัตรหนึ่งรายการ
function PaymentRow({ payment }: { payment: EdcReconciliationPayment }): JSX.Element {
    return (
        <tr className="border-b border-[#F1F2F4]">
            <td className="px-6 py-3">{formatDateTime(payment.paidAt)}</td>
            <td className="px-4 py-3 font-bold">{payment.plateNo}</td>
            <td className="px-4 py-3">{payment.billNo}</td>
            <td className="px-4 py-3 font-mono">
                {payment.reference ?? <span className="font-sans font-semibold text-amber-700">ไม่มีเลขอ้างอิง</span>}
            </td>
            <td className="px-4 py-3">
                {CHANNEL_LABELS[payment.channel] ?? payment.channel}
                {payment.deviceId ? <div className="text-[12px] text-[#98A2B3]">{payment.deviceId}</div> : null}
            </td>
            <td className="px-4 py-3 text-[13px] text-[#67727E]">{payment.processedBy ?? "-"}</td>
            <td className="px-6 py-3 text-right font-semibold">{formatMoney(payment.amount)}</td>
        </tr>
    );
}

// Function หน้ากระทบยอด EDC แยกตาม TID พร้อมส่งออก CSV
function EdcReconciliationPage(): JSX.Element {
    const [range, setRange] = useState<DateRange | undefined>();
    const [data, setData] = useState<EdcReconciliation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [reloadKey, setReloadKey] = useState(0);

    const query = useMemo(() => buildQuery(range), [range]);

    useEffect(() => {
        let ignore = false;

        async function load() {
            try {
                setLoading(true);
                setError("");
                // 400 INVALID_DATE_RANGE วันที่ผิดหรือเกิน 31 วัน
                const result = await getEdcReconciliation(query);
                if (!ignore) setData(result);
            } catch (err) {
                if (!ignore) setError(getErrorMessage(err, "โหลดข้อมูลกระทบยอดไม่สำเร็จ"));
            } finally {
                if (!ignore) setLoading(false);
            }
        }

        void load();
        return () => {
            ignore = true;
        };
    }, [query, reloadKey]);

    const rangeLabel = data
        ? (() => {
            const start = formatDateOnly(data.range.startDate);
            const end = formatDateOnly(data.range.endDate);
            return start === end ? start : `${start} - ${end}`;
        })()
        : "";

    return (
        <section className="min-h-screen bg-[#EFEFEF] px-4 py-6 text-[#1F2933] md:px-8 md:py-8">
            <div className="mx-auto max-w-[1400px]">
                <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-[28px] font-extrabold leading-none text-[#2B3640] sm:text-[34px]">
                            กระทบยอด EDC
                        </h1>
                        <p className="mt-3 text-[15px] text-[#67727E]">
                            • เทียบยอดและเลขอ้างอิงกับรายงานสรุปของเครื่อง EDC ทุกวัน
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setReloadKey((value) => value + 1)}
                            className="inline-flex h-10 items-center gap-2 rounded-full border border-[#D8DADF] bg-white px-4 text-[13px] font-semibold transition hover:bg-[#F4F4F4]"
                        >
                            <LuRefreshCw size={15} />
                            โหลดใหม่
                        </button>
                        <button
                            type="button"
                            onClick={() => data && downloadCsv(data)}
                            disabled={!data || data.total.count === 0}
                            className="inline-flex h-10 items-center gap-2 rounded-full bg-[#061D36] px-5 text-[13px] font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <LuDownload size={15} />
                            ส่งออก CSV
                        </button>
                    </div>
                </div>

                <div className="mb-5 max-w-[420px]">
                    <DateRangeFilter value={range} onChange={setRange} />
                    <p className="mt-2 text-[12px] text-[#67727E]">
                        ไม่เลือกวันที่ = วันนี้ (เวลาไทย)
                    </p>
                </div>

                {error ? (
                    <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-[14px] text-red-600">
                        {error}
                    </div>
                ) : null}

                {data && data.missingReferenceCount > 0 ? (
                    <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-[14px] text-amber-900">
                        <LuCircleAlert size={20} className="mt-0.5 shrink-0" />
                        <p>
                            มี {formatCount(data.missingReferenceCount)} รายการที่ไม่มีเลขอ้างอิง (รายการเก่า)
                            ต้องตรวจกับสลิปหรือรายงานของเครื่อง EDC ด้วยมือ
                        </p>
                    </div>
                ) : null}

                {loading && !data ? (
                    <div className="rounded-[20px] bg-white px-6 py-10 text-center text-[#64748B]">กำลังโหลดข้อมูล...</div>
                ) : data ? (
                    <>
                        <div className="mb-6 grid gap-4 sm:grid-cols-3">
                            <div className="rounded-2xl border border-[#D8DADF] bg-white px-5 py-4">
                                <p className="text-[13px] text-[#67727E]">ช่วงวันที่</p>
                                <p className="mt-1 text-[18px] font-extrabold">{rangeLabel}</p>
                            </div>
                            <div className="rounded-2xl border border-[#D8DADF] bg-white px-5 py-4">
                                <p className="text-[13px] text-[#67727E]">จำนวนรายการบัตร</p>
                                <p className="mt-1 text-[26px] font-extrabold">{formatCount(data.total.count)} รายการ</p>
                            </div>
                            <div className="rounded-2xl border border-[#D8DADF] bg-white px-5 py-4">
                                <p className="text-[13px] text-[#67727E]">ยอดรวม</p>
                                <p className="mt-1 text-[26px] font-extrabold">{formatMoney(data.total.amount)} ฿</p>
                            </div>
                        </div>

                        {data.terminals.length === 0 ? (
                            <div className="rounded-[20px] bg-white px-6 py-10 text-center text-[#64748B]">
                                ไม่มีรายการรับบัตรในช่วงนี้
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {data.terminals.map((terminal) => {
                                    // ไม่มีเครื่อง EDC ที่ลงทะเบียนของ TID นี้ ไฮไลต์ให้ตรวจ
                                    const unknownTerminal = !terminal.edcDevice;

                                    return (
                                    <article
                                        key={terminal.terminalId}
                                        className={`overflow-hidden rounded-[20px] border bg-white shadow-sm ${unknownTerminal ? "border-red-400 ring-2 ring-red-200" : "border-[#BAC0C8]"}`}
                                    >
                                        <div className={`flex flex-wrap items-center justify-between gap-3 px-6 py-4 text-white ${unknownTerminal ? "bg-[#991B1B]" : "bg-[#031C36]"}`}>
                                            <div>
                                                <h2 className="text-[18px] font-extrabold">
                                                    {terminal.edcDevice?.deviceName ?? "เครื่องที่ไม่ได้ลงทะเบียน"}{" "}
                                                    <span className="font-mono text-[14px] font-semibold text-white/80">
                                                        TID {terminal.terminalId}
                                                    </span>
                                                </h2>
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
                                                    {terminal.channels.map((channel) => CHANNEL_LABELS[channel] ?? channel).join(", ")}
                                                    {terminal.deviceIds.length ? ` • ${terminal.deviceIds.join(", ")}` : ""}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[13px] text-white/80">{formatCount(terminal.count)} รายการ</div>
                                                <div className="text-[20px] font-extrabold">{formatMoney(terminal.amount)} ฿</div>
                                            </div>
                                        </div>

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
                                                    {terminal.payments.map((payment) => (
                                                        <PaymentRow key={payment.paymentId} payment={payment} />
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </article>
                                    );
                                })}
                            </div>
                        )}
                    </>
                ) : null}
            </div>
        </section>
    );
}

export default EdcReconciliationPage;
