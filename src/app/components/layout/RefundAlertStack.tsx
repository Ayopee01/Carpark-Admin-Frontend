"use client";
// Import Library
import type { JSX } from "react";
import Link from "next/link";
import { LuCircleAlert } from "react-icons/lu";
// Import Providers
import { useRefundAlerts } from "@/src/app/providers/RefundAlertsProvider";
// Import Landing
import { REFUNDS_PATH } from "@/src/app/lib/landing/checkPayment";

// Config จำนวนแจ้งเตือนสูงสุดที่แสดงพร้อมกัน
const MAX_VISIBLE = 3;

// Function แสดงแจ้งเตือนคืนเงินทุกหน้า จนกว่าจะคืนเงินหรือเปิดหน้ารายการคืนเงิน
function RefundAlertStack(): JSX.Element | null {
    const { alerts } = useRefundAlerts();
    const visible = alerts.filter((alert) => !alert.dismissed);

    if (visible.length === 0) return null;

    const shown = visible.slice(-MAX_VISIBLE).reverse();
    const hiddenCount = visible.length - shown.length;

    return (
        <div role="alert" className="space-y-px border-b border-red-200">
            {shown.map((alert) => (
                <div
                    key={alert.chargeId}
                    className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm md:px-8 ${alert.tone === "danger"
                        ? "bg-red-50 text-red-800"
                        : "bg-amber-50 text-amber-900"
                        }`}
                >
                    <span className="inline-flex items-center gap-2 font-semibold">
                        <LuCircleAlert size={18} className="shrink-0" />
                        {alert.message}
                    </span>
                    <Link
                        href={REFUNDS_PATH}
                        className={`rounded-full px-4 py-1.5 text-xs font-bold text-white transition hover:opacity-90 ${alert.tone === "danger" ? "bg-red-700" : "bg-amber-800"
                            }`}
                    >
                        ไปหน้ารายการรอคืนเงิน
                    </Link>
                </div>
            ))}

            {hiddenCount > 0 ? (
                <div className="bg-red-50 px-4 py-2 text-xs font-semibold text-red-800 md:px-8">
                    และรอคืนเงินอีก {hiddenCount} รายการ
                </div>
            ) : null}
        </div>
    );
}

export { RefundAlertStack };
