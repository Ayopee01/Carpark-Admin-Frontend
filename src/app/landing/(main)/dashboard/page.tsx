"use client";
// Import Library
import { useEffect, useState, type JSX } from "react";
import Link from "next/link";
import { BadgeCheck, Clock3, DoorOpen, MonitorSmartphone, QrCode, Ticket, UserRound } from "lucide-react";
import { LuReceiptText, LuTrendingUp } from "react-icons/lu";
// Import Components
import { LoadingScreen } from "@/src/app/components/shared/LoadingScreen";
import { RevenueGroupCard, SummaryCard } from "@/src/app/components/shared/StatCards";
import { ChannelCard } from "@/src/app/components/dashboard/ChannelCard";
// Import Api
import { getDashboard, subscribeDashboardEvents } from "@/src/app/lib/api/dashboard";
// Import Types
import type { SseStatus } from "@/src/app/type/api/common";
// Import Shared
import { getErrorMessage } from "@/src/app/lib/shared/http";

/* -------------------------------------- Config -------------------------------------- */

import { formatBaht, formatCount, formatMoney } from "@/src/app/lib/shared/format";
import { REFUNDS_PATH } from "@/src/app/lib/landing/checkPayment";
import type { DashboardChannelBreakdown, DashboardRevenueGroup, DashboardSummary } from "@/src/app/type/api/dashboard";

// Config ชื่อที่แสดงของกลุ่มรายได้
const REVENUE_GROUP_LABELS: Record<DashboardRevenueGroup["id"], string> = {
    staff: "ชำระผ่านพนักงาน",
    scan: "สแกนจ่าย",
};

/* -------------------------------------- Component -------------------------------------- */

// Function หน้า dashboard สรุปยอดของวันนี้แบบ realtime
function DashboardPage(): JSX.Element {
    const [data, setData] = useState<DashboardSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(30);
    const [error, setError] = useState("");
    const [streamStatus, setStreamStatus] = useState<SseStatus>("connecting");

    // ข้อมูลมาจาก stream snapshot ทุกครั้งที่ต่อ และ updated แทนทั้งชุด (รวมตอนข้ามวัน) ไม่ต้อง GET ตอนเปิดหน้า
    useEffect(() => {
        let received = false;

        function finishFirstLoad() {
            if (received) return;
            received = true;
            setProgress(100);
            setLoading(false);
        }

        const unsubscribe = subscribeDashboardEvents({
            // สำรองเท่านั้น ไม่ได้ snapshot ตามเวลาให้โหลดผ่าน API ครั้งเดียว
            onNoSnapshot: async () => {
                try {
                    const result = await getDashboard();
                    if (!received) setData(result);
                } catch (err) {
                    if (!received) setError(getErrorMessage(err, "เกิดข้อผิดพลาดในการโหลดข้อมูล"));
                } finally {
                    finishFirstLoad();
                }
            },
            onStatusChange: setStreamStatus,
            onFatalError: (err) => {
                setError(err.message);
                finishFirstLoad();
            },
            onEvent: (event) => {
                if (event.type === "dashboard_snapshot" || event.type === "dashboard_updated") {
                    setData(event.data);
                    setError("");
                    finishFirstLoad();
                    return;
                }
                // สนใจเฉพาะก่อนได้ข้อมูลแรก หลังจากนั้นคงข้อมูลเดิมไว้
                if (event.type === "dashboard_error" && !received) {
                    setError(event.message);
                    finishFirstLoad();
                }
            },
        });

        return () => {
            unsubscribe();
        };
    }, []);


    const getRevenueDescription = (group: DashboardRevenueGroup) => {
        return group.id === "staff" ? "การชำระเงินสด ผ่านคนงานช่วยเหลือ" : "สแกนจ่าย (แอป / คิวอาร์โค้ด)";
    };

    const getChannelIcon = (icon: DashboardChannelBreakdown["icon"]) => {
        switch (icon) {
            case "user":
                return <UserRound className="h-4 w-4" strokeWidth={2.25} />;
            case "qr":
                return <QrCode className="h-4 w-4" strokeWidth={2.25} />;
            case "kiosk":
                return <MonitorSmartphone className="h-4 w-4" strokeWidth={2.25} />;
            case "gate":
                return <DoorOpen className="h-4 w-4" strokeWidth={2.25} />;
            default:
                return <Ticket className="h-4 w-4" strokeWidth={2.25} />;
        }
    };

    if (loading) {
        return (
            <LoadingScreen
                open
                progress={progress}
                message="กำลังโหลดข้อมูล..."
                detail="ระบบลานจอดรถ"
                fullscreen={false}
            />
        );
    }

    if (error || !data) {
        return (
            <section className="min-h-screen bg-gray-100 px-5 py-6 md:p-20">
                <div className="mx-auto max-w-7xl rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-600">
                    {error || "ไม่พบข้อมูล Dashboard"}
                </div>
            </section>
        );
    }

    const isLive = streamStatus === "open" && data.isRealtime;

    return (
        <section className="min-h-screen bg-gray-100 px-4 py-6 text-slate-700 md:px-8 md:py-8 xl:p-20">
            <div className="mx-auto max-w-7xl">
                <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-[30px] font-bold leading-none tracking-tight text-slate-700 sm:text-4xl">
                            จัดการระบบ
                        </h1>

                        <p className="mt-2 text-xs font-medium leading-5 text-gray-500">
                            • ติดตามรายได้และปริมาณการใช้งาน
                        </p>
                    </div>

                    <div
                        className={`flex h-10 items-center gap-2 rounded-full border bg-white px-4 py-2 text-xs font-semibold ${isLive
                                ? "border-green-100 text-green-600"
                                : "border-slate-200 text-slate-500"
                            }`}
                    >
                        <span
                            className={`h-2 w-2 rounded-full ${isLive ? "bg-green-500" : "bg-slate-400"
                                }`}
                        />

                        <span>{isLive ? "Online" : streamStatus === "reconnecting" ? "กำลังเชื่อมต่อใหม่..." : "Offline"}</span>
                    </div>
                </div>

                {data.pendingRefunds.count > 0 ? (
                    <Link
                        href={REFUNDS_PATH}
                        className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700 transition hover:bg-red-100"
                    >
                        <span className="text-[15px] font-bold">
                            {/* pendingRefunds.amount เป็นบาทแล้ว (หน้าคืนเงินใช้สตางค์) */}
                            รอคืนเงิน {formatCount(data.pendingRefunds.count)} รายการ ({formatMoney(data.pendingRefunds.amount)} บาท)
                        </span>
                        <span className="text-[13px] font-semibold underline">ดูรายการรอคืนเงิน</span>
                    </Link>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <SummaryCard
                        title="บิลทั้งหมด"
                        value={formatCount(data.summaryCards.totalTickets)}
                        suffix="tickets"
                        note="Today’s Total"
                        noteIcon={
                            <LuTrendingUp className="h-3.5 w-3.5" strokeWidth={2.5} />
                        }
                        icon={<LuReceiptText className="h-4 w-4" strokeWidth={2.25} />}
                    />

                    <SummaryCard
                        title="ชำระเงินแล้ว"
                        value={formatCount(data.summaryCards.paidCount)}
                        note={`฿ ${formatMoney(data.summaryCards.paidRevenue)} Total`}
                        icon={<BadgeCheck className="h-4 w-4" strokeWidth={2.25} />}
                    />

                    <SummaryCard
                        title="บิลค้างชำระ"
                        value={formatCount(data.summaryCards.pendingCount)}
                        suffix="pending"
                        note=""
                        icon={<Clock3 className="h-4 w-4" strokeWidth={2.25} />}
                    />
                </div>

                <div className="mt-10">
                    <h2 className="text-[26px] font-extrabold leading-none tracking-tight text-gray-800 md:text-4xl">
                        การชำระค่าบริการ
                    </h2>

                    <p className="mt-2 text-xs font-medium leading-5 text-gray-500">
                        • ช่องทางการชำระค่าบริการ
                    </p>

                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        {data.revenueGroups.map((group) => (
                            <RevenueGroupCard
                                key={group.id}
                                title={REVENUE_GROUP_LABELS[group.id]}
                                description={getRevenueDescription(group)}
                                amountText={formatBaht(group.amount)}
                                percent={group.percent}
                                icon={getChannelIcon(group.id === "staff" ? "user" : "qr")}
                            />
                        ))}
                    </div>
                </div>

                <div className="mt-10">
                    <h2 className="text-[26px] font-extrabold leading-none tracking-tight text-gray-800 md:text-4xl">
                        ยอดชำระค่าบริการแต่ละช่องทาง
                    </h2>

                    <p className="mt-2 text-xs font-medium leading-5 text-gray-500">
                        • ติดตามปริมาณการใช้งานในแต่ละช่องทางบริการ
                    </p>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {data.channelBreakdown.map((channel) => (
                            <ChannelCard
                                key={channel.id}
                                title={channel.label}
                                subTitle={channel.subLabel}
                                countText={`${channel.count} รายการ`}
                                amountText={formatBaht(channel.amount)}
                                percent={channel.percent}
                                icon={getChannelIcon(channel.icon)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

export default DashboardPage;
