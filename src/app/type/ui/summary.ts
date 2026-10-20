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
