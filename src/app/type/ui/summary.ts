// Import Types
import type { OverviewServiceSummaryItem, UsageChartItem, UsageChartMode } from "@/src/app/type/api/overview";

/* -------------------------------------- Summary Component Types -------------------------------------- */

// Type props ของการ์ดสรุปตามบริการ
export type ServiceSummaryCardProps = {
    items: OverviewServiceSummaryItem[];
    totalAmount: number;
};

// Type props ของกราฟการใช้งาน
export type UsageChartCardProps = {
    title?: string;
    description?: string;
    badgeLabel?: string;
    mode?: UsageChartMode;
    items: UsageChartItem[];
};

// Type ข้อมูลหนึ่งแท่งของกราฟการใช้งาน (recharts)
export type UsageChartRow = { key: string; label: string; hint: string; value: number };

// Type props ของป้ายแกนที่ recharts ส่งให้ (payload.index = ลำดับแท่ง)
export type UsageChartTickProps = { x?: number | string; y?: number | string; payload?: { index: number } };
