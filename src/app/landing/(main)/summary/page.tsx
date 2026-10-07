"use client";
// Import Library
import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import type { DateRange } from "react-day-picker";
import { LuArrowDownToLine, LuCircleDollarSign, LuClock3, LuQrCode, LuTicket, LuUserRound } from "react-icons/lu";
// Import Components
import { LoadingScreen } from "@/src/app/components/shared/LoadingScreen";
import { RevenueGroupCard, SummaryCard } from "@/src/app/components/shared/StatCards";
import { DateRangeFilter } from "@/src/app/components/shared/DateRangeFilter";
import { UsageChartCard } from "@/src/app/components/summary/UsageChartCard";
import { ServiceSummaryCard } from "@/src/app/components/summary/ServiceSummaryCard";
// Import Api
import { getOverview, subscribeOverviewEvents } from "@/src/app/lib/api/overview";
// Import Types
import type { SseStatus } from "@/src/app/type/api/common";
// Import Shared
import { getErrorMessage } from "@/src/app/lib/shared/http";

/* -------------------------------------- Config -------------------------------------- */

// Config รอ snapshot แรกจาก SSE ก่อนโหลดผ่าน API แทน
const FIRST_SNAPSHOT_TIMEOUT_MS = 8000;
import { formatBaht, formatCount, formatMoney } from "@/src/app/lib/shared/format";

import type { OverviewQuery, OverviewRevenueGroup, OverviewSummary } from "@/src/app/type/api/overview";

/* -------------------------------------- Helpers -------------------------------------- */

// Function แปลงวันที่เป็น YYYY-MM-DD
function formatDateParam(date?: Date): string {
    if (!date) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// Function สร้าง start_date/end_date จากช่วงวันที่ที่เลือก
function getDateRangeParams(range?: DateRange): { startDate: string; endDate: string } {
    if (!range?.from) {
        return {
            startDate: "",
            endDate: "",
        };
    }

    const startDate = formatDateParam(range.from);
    const endDate = formatDateParam(range.to ?? range.from);

    return {
        startDate,
        endDate,
    };
}

/* -------------------------------------- Component -------------------------------------- */

// Function หน้าภาพรวมตามช่วงวันที่แบบ realtime
function SummaryPage(): JSX.Element {
    const [data, setData] = useState<OverviewSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState("");
    const [streamStatus, setStreamStatus] = useState<SseStatus>("connecting");
    // แยกโหลดครั้งแรก (เต็มหน้า) กับเปลี่ยนช่วงวันที่ (ตัวบอกเล็ก)
    const hasDataRef = useRef(false);
    useEffect(() => {
        hasDataRef.current = Boolean(data);
    }, [data]);

    const [selectedRange, setSelectedRange] = useState<DateRange | undefined>();

    const { startDate: selectedStartDate, endDate: selectedEndDate } = useMemo(
        () => getDateRangeParams(selectedRange),
        [selectedRange]
    );

    const rangeQuery = useMemo<OverviewQuery>(
        () => ({
            ...(selectedStartDate ? { start_date: selectedStartDate } : {}),
            ...(selectedEndDate ? { end_date: selectedEndDate } : {}),
        }),
        [selectedEndDate, selectedStartDate]
    );

    // ข้อมูลมาจาก stream แต่ละช่วงวันที่เปิด stream ของตัวเองและได้ snapshot ตอนต่อ
    useEffect(() => {

        let received = false;
        const isInitialLoad = !hasDataRef.current;
        if (isInitialLoad) {
            setLoading(true);
            setProgress(30);
        } else {
            setRefreshing(true);
        }
        setError("");

        function finishFirstLoad() {
            if (received) return;
            received = true;
            setRefreshing(false);
            setProgress(100);
            setLoading(false);
        }

        // สำรองเท่านั้น ไม่ได้ snapshot ตามเวลาให้โหลดช่วงนี้ผ่าน API ครั้งเดียว
        const fallbackTimer = window.setTimeout(async () => {
            if (received) return;
            try {
                const result = await getOverview(rangeQuery);
                if (!received) setData(result);
            } catch (err) {
                if (!received) setError(getErrorMessage(err, "เกิดข้อผิดพลาดในการโหลดข้อมูล"));
            } finally {
                finishFirstLoad();
            }
        }, FIRST_SNAPSHOT_TIMEOUT_MS);

        const unsubscribe = subscribeOverviewEvents(rangeQuery, {
            onStatusChange: setStreamStatus,
            // เช่น 400 INVALID_DATE_RANGE แสดงข้อความและคงข้อมูลเดิม
            onFatalError: (err) => {
                setError(err.message);
                finishFirstLoad();
            },
            onEvent: (event) => {
                if (event.type === "overview_snapshot" || event.type === "overview_updated") {
                    setData(event.data);
                    setError("");
                    finishFirstLoad();
                    return;
                }
                if (event.type === "overview_error" && !received) {
                    setError(event.message);
                    finishFirstLoad();
                }
            },
        });

        return () => {
            unsubscribe();
            window.clearTimeout(fallbackTimer);
        };
    }, [rangeQuery]);

    const isRealtime = streamStatus === "open";
    const formatNumber = formatCount;
    const formatCurrency = formatBaht;

    function getRevenueDescription(group: OverviewRevenueGroup) {
        if (group.id === "staff") {
            return "การชำระเงินสด ผ่านคนงานช่วยเหลือ";
        }

        if (group.id === "scan") {
            return "สแกนจ่าย (แอป / คิวอาร์โค้ด)";
        }

        return "ข้อมูลรายได้";
    }

    function handleDownloadJson() {
        if (!data) return;

        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "overview-summary.json";
        link.click();

        URL.revokeObjectURL(url);
    }

    const realtimeBadge = useMemo(
        () => (
            <div
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold ${isRealtime
                    ? "border-[#49C85B] bg-[#F5FFF6] text-[#38B449]"
                    : "border-[#D8DADF] bg-white text-[#6B7280]"
                    }`}
            >
                <span
                    className={`h-2 w-2 rounded-full ${isRealtime ? "bg-[#38B449]" : "bg-[#9CA3AF]"
                        }`}
                />
                <span>{isRealtime ? "Realtime" : "Online"}</span>
            </div>
        ),
        [isRealtime]
    );

    if (loading) {
        return (
            <LoadingScreen
                open
                progress={progress}
                message="กำลังโหลดข้อมูล..."
                detail="กำลังโหลดข้อมูลยอดรวมทั้งหมด"
                fullscreen={false}
            />
        );
    }

    if (!data) {
        return (
            <section className="min-h-screen bg-[#F3F4F6] px-5 py-6 md:px-8 md:py-8">
                <div className="mx-auto max-w-[1320px] rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-600">
                    {error || "ไม่พบข้อมูลภาพรวม"}
                </div>
            </section>
        );
    }

    return (
        <section className="min-h-screen bg-[#F3F4F6] px-4 py-6 text-[#1F2937] md:px-8 md:py-8">
            <div className="mx-auto max-w-[1320px]">
                <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-[30px] font-extrabold leading-none text-[#1F2937] sm:text-[36px]">
                            ยอดรวมทั้งหมด
                        </h1>
                        <p className="mt-2 text-[14px] text-[#6B7280]">
                            สรุปยอดการใช้บริการและการชำระเงิน
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {realtimeBadge}

                        <button
                            type="button"
                            onClick={handleDownloadJson}
                            className="inline-flex items-center gap-2 rounded-full bg-[#061D36] px-5 py-2.5 text-[13px] font-semibold text-white transition hover:opacity-95"
                        >
                            <LuArrowDownToLine size={16} />
                            ดาวน์โหลด
                        </button>
                    </div>
                </div>

                <div className="mb-5">
                    <DateRangeFilter value={selectedRange} onChange={setSelectedRange} />

                    {error ? (
                        <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-[14px] text-red-600">
                            {error}
                        </div>
                    ) : refreshing ? (
                        <p className="mt-3 text-[13px] text-[#6B7280]">กำลังอัปเดตข้อมูล...</p>
                    ) : null}
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <SummaryCard
                        title="บัตรทั้งหมด"
                        value={formatNumber(data.summaryCards.totalTickets)}
                        suffix="tickets"
                        note="↗ Total"
                        icon={<LuTicket size={16} />}
                    />

                    <SummaryCard
                        title="ชำระเงินแล้ว"
                        value={formatNumber(data.summaryCards.paidCount)}
                        note={`฿ ${formatMoney(data.summaryCards.paidRevenue)} Total`}
                        icon={<LuCircleDollarSign size={16} />}
                    />

                    <SummaryCard
                        title="บิลค้างชำระ"
                        value={formatNumber(data.summaryCards.pendingCount)}
                        suffix="pending"
                        note=""
                        icon={<LuClock3 size={16} />}
                    />
                </div>

                <div className="mt-10">
                    <h2 className="text-[26px] font-extrabold leading-none text-[#1F2937] sm:text-[32px]">
                        ยอดรวมทั้งหมด
                    </h2>
                    <p className="mt-2 text-[14px] text-[#6B7280]">
                        สรุปยอดการใช้บริการและการชำระเงิน
                    </p>

                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        {data.revenueGroups.map((group) => (
                            <RevenueGroupCard
                                key={group.id}
                                title={group.label}
                                description={getRevenueDescription(group)}
                                amountText={formatCurrency(group.amount)}
                                percent={group.percent}
                                icon={
                                    group.id === "staff" ? (
                                        <LuUserRound size={16} />
                                    ) : (
                                        <LuQrCode size={16} />
                                    )
                                }
                            />
                        ))}
                    </div>
                </div>

                <div className="mt-4 grid min-w-0 max-w-full gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <UsageChartCard
                        title="สถิติการใช้งานของผู้ใช้"
                        description={`ข้อมูลแสดงจำนวนผู้เข้าใช้บริการ (${data.usageChartLabel ?? "รายวัน"})`}
                        badgeLabel={data.usageChartLabel ?? "รายวัน"}
                        mode={data.usageChartMode}
                        items={data.usageChart}
                    />

                    <ServiceSummaryCard
                        items={data.serviceSummary}
                        totalAmount={data.totalSummaryCalculated}
                    />
                </div>
            </div>
        </section>
    );
}

export default SummaryPage;
