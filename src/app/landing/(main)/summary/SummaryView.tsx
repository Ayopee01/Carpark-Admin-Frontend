"use client";
// Import Library
import { useEffect, useMemo, useState, type JSX } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DateRange } from "react-day-picker";
import { LuArrowDownToLine, LuCircleDollarSign, LuClock3, LuQrCode, LuTicket, LuUserRound } from "react-icons/lu";
// Import Components
import { LoadingScreen } from "@/src/app/components/shared/LoadingScreen";
import { RevenueGroupCard, SummaryCard } from "@/src/app/components/shared/StatCards";
import { DateRangeFilter } from "@/src/app/components/shared/DateRangeFilter";
import { UsageChartCard } from "@/src/app/components/summary/UsageChartCard";
import { ServiceSummaryCard } from "@/src/app/components/summary/ServiceSummaryCard";
import { EdcReconciliationSection } from "@/src/app/components/summary/EdcReconciliationSection";
import { RefundHistorySection } from "@/src/app/components/summary/RefundHistorySection";
import { Tabs, TabsList, TabsTrigger } from "@/src/app/components/ui/tabs";
// Import Client
import { overviewQuery, queryKeys } from "@/src/app/lib/client/queries";
import { subscribeOverviewEvents } from "@/src/app/lib/client/events";
// Import Types
import type { StreamStatus } from "@/src/app/type/api/realtime";
// Import Shared
import { getErrorMessage } from "@/src/app/lib/shared/http";

/* -------------------------------------- Config -------------------------------------- */

import { formatBaht, formatCount, formatMoney, toDateParam } from "@/src/app/lib/shared/format";

import type { OverviewQuery, OverviewRevenueGroup } from "@/src/app/type/api/overview";

// Config ความคืบหน้าที่แสดงระหว่างรอข้อมูลแรกจาก stream
const LOADING_PROGRESS = 30;

// Config tab ของหน้ายอดรวม (ประวัติคืนเงิน/กระทบยอด EDC แสดงเมื่อ backend ส่งข้อมูลมา = มีสิทธิ์ transactions)
const SUMMARY_TABS = [
    { id: "overview", label: "ภาพรวม" },
    { id: "refunds", label: "ประวัติคืนเงิน" },
    { id: "edc", label: "กระทบยอด EDC" },
] as const;

type SummaryTab = (typeof SUMMARY_TABS)[number]["id"];

// Function แปลง ?tab= เป็น tab ที่รู้จัก (ไม่รู้จัก = ภาพรวม)
function toSummaryTab(value?: string): SummaryTab {
    return SUMMARY_TABS.find((item) => item.id === value)?.id ?? "overview";
}

/* -------------------------------------- Helpers -------------------------------------- */


// Function สร้าง start_date/end_date จากช่วงวันที่ที่เลือก
function getDateRangeParams(range?: DateRange): { startDate: string; endDate: string } {
    if (!range?.from) {
        return {
            startDate: "",
            endDate: "",
        };
    }

    const startDate = toDateParam(range.from);
    const endDate = toDateParam(range.to ?? range.from);

    return {
        startDate,
        endDate,
    };
}

/* -------------------------------------- Component -------------------------------------- */

// Function หน้าภาพรวมตามช่วงวันที่แบบ realtime
function SummaryView({ initialTab }: { initialTab?: string }): JSX.Element {
    const queryClient = useQueryClient();
    const [streamStatus, setStreamStatus] = useState<StreamStatus>("connecting");
    // error จาก stream ผูกกับช่วงวันที่ เปลี่ยนช่วงแล้วหายเอง
    const [streamError, setStreamError] = useState<{ query: OverviewQuery; message: string } | null>(null);

    const [selectedRange, setSelectedRange] = useState<DateRange | undefined>();
    const [tab, setTab] = useState<SummaryTab>(() => toSummaryTab(initialTab));

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

    // ข้อมูลมาจาก stream (setQueryData) GET ใช้สำรอง เปลี่ยนช่วงวันที่ = แสดงข้อมูลช่วงเดิมไว้จนช่วงใหม่มา
    const { data, isPending, isPlaceholderData, error: loadError } = useQuery({
        ...overviewQuery(rangeQuery),
        enabled: false,
        placeholderData: keepPreviousData,
    });
    const error = streamError?.query === rangeQuery
        ? streamError.message
        : loadError
          ? getErrorMessage(loadError, "เกิดข้อผิดพลาดในการโหลดข้อมูล")
          : "";
    const loading = isPending && !error;
    const refreshing = isPlaceholderData && !error;

    // แต่ละช่วงวันที่เปิด stream ของตัวเองและได้ snapshot ตอนต่อ
    useEffect(() => {
        const key = queryKeys.overview(rangeQuery);

        const unsubscribe = subscribeOverviewEvents(rangeQuery, {
            // สำรองเท่านั้น ไม่ได้ snapshot ตามเวลาให้โหลดช่วงนี้ผ่าน API ครั้งเดียว (error แสดงจากสถานะของ query)
            onNoSnapshot: () => void queryClient.fetchQuery(overviewQuery(rangeQuery)).catch(() => undefined),
            onStatusChange: setStreamStatus,
            // เช่น 400 INVALID_DATE_RANGE แสดงข้อความและคงข้อมูลเดิม
            onFatalError: (err) => setStreamError({ query: rangeQuery, message: err.message }),
            onEvent: (event) => {
                if (event.type === "overview_snapshot" || event.type === "overview_updated") {
                    queryClient.setQueryData(key, event.data);
                    return;
                }
                // overview_error สนใจเฉพาะก่อนได้ข้อมูลแรก
                if (!queryClient.getQueryData(key)) {
                    setStreamError({ query: rangeQuery, message: event.message });
                }
            },
        });

        return () => {
            unsubscribe();
        };
    }, [queryClient, rangeQuery]);

    const isRealtime = streamStatus === "open";

    // refundHistory/edcReconciliation เป็น null เมื่อไม่มีสิทธิ์ transactions ซ่อน tab นั้น
    const visibleTabs = SUMMARY_TABS.filter(
        (item) =>
            item.id === "overview" ||
            (item.id === "refunds" && data?.refundHistory) ||
            (item.id === "edc" && data?.edcReconciliation)
    );
    const activeTab: SummaryTab = visibleTabs.some((item) => item.id === tab) ? tab : "overview";

    function getRevenueDescription(group: OverviewRevenueGroup) {
        return group.id === "staff" ? "การชำระเงินสด ผ่านคนงานช่วยเหลือ" : "สแกนจ่าย (แอป / คิวอาร์โค้ด)";
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
                progress={LOADING_PROGRESS}
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

                        {activeTab === "overview" ? (
                            <button
                                type="button"
                                onClick={handleDownloadJson}
                                className="inline-flex items-center gap-2 rounded-full bg-[#061D36] px-5 py-2.5 text-[13px] font-semibold text-white transition hover:opacity-95"
                            >
                                <LuArrowDownToLine size={16} />
                                ดาวน์โหลด
                            </button>
                        ) : null}
                    </div>
                </div>

                <div className="mb-5">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="min-w-0 flex-1 sm:flex-none">
                            <DateRangeFilter value={selectedRange} onChange={setSelectedRange} />
                        </div>
                        {/* ปุ่มลัดดูยอดของวันนี้ (ไม่เลือกวันที่ = ต้นเดือนถึงวันนี้) */}
                        <button
                            type="button"
                            onClick={() => {
                                const today = new Date();
                                setSelectedRange({ from: today, to: today });
                            }}
                            className="h-12 rounded-full border border-[#BFC5CC] bg-white px-5 text-[14px] font-semibold text-[#1F2933] transition hover:bg-[#F4F4F4]"
                        >
                            วันนี้
                        </button>
                    </div>

                    {error ? (
                        <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-[14px] text-red-600">
                            {error}
                        </div>
                    ) : refreshing ? (
                        <p className="mt-3 text-[13px] text-[#6B7280]">กำลังอัปเดตข้อมูล...</p>
                    ) : null}
                </div>

                {visibleTabs.length > 1 ? (
                    <Tabs value={activeTab} onValueChange={(value) => setTab(value as SummaryTab)}>
                        <TabsList className="mb-6 inline-flex flex-wrap gap-1 rounded-full border border-[#D8DADF] bg-white p-1">
                            {visibleTabs.map((item) => (
                                <TabsTrigger
                                    key={item.id}
                                    value={item.id}
                                    className="rounded-full px-5 py-2 text-[14px] font-semibold text-[#475467] transition hover:bg-[#F4F4F4] data-[state=active]:bg-[#061D36] data-[state=active]:text-white"
                                >
                                    {item.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                ) : null}

                {activeTab === "edc" && data.edcReconciliation ? (
                    <EdcReconciliationSection summary={data.edcReconciliation} filters={data.filters} query={rangeQuery} />
                ) : activeTab === "refunds" && data.refundHistory ? (
                    <RefundHistorySection items={data.refundHistory} />
                ) : (
                    <>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <SummaryCard
                                title="บัตรทั้งหมด"
                                value={formatCount(data.summaryCards.totalTickets)}
                                suffix="tickets"
                                note="↗ Total"
                                icon={<LuTicket size={16} />}
                            />

                            <SummaryCard
                                title="ชำระเงินแล้ว"
                                value={formatCount(data.summaryCards.paidCount)}
                                note={`฿ ${formatMoney(data.summaryCards.paidRevenue)} Total`}
                                icon={<LuCircleDollarSign size={16} />}
                            />

                            <SummaryCard
                                title="บิลค้างชำระ"
                                value={formatCount(data.summaryCards.pendingCount)}
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
                                        amountText={formatBaht(group.amount)}
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
                                description={`ข้อมูลแสดงจำนวนผู้เข้าใช้บริการ (${data.usageChartLabel})`}
                                badgeLabel={data.usageChartLabel}
                                mode={data.usageChartMode}
                                items={data.usageChart}
                            />

                            <ServiceSummaryCard
                                items={data.serviceSummary}
                                totalAmount={data.totalSummaryCalculated}
                            />
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}

export { SummaryView };
