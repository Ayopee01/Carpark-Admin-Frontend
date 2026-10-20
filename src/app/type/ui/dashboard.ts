// Import Library
import type { ReactNode } from "react";

/* -------------------------------------- Dashboard Component Types -------------------------------------- */

// Type props ของการ์ดช่องทางชำระ
export type ChannelCardProps = {
    title: string;
    subTitle: string;
    countText: string;
    amountText: string;
    percent: number;
    icon: ReactNode;
};
