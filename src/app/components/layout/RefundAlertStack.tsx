"use client";
// Import Library
import type { JSX } from "react";
import { LuCircleAlert } from "react-icons/lu";
// Import Providers
import { useAdminStream } from "@/src/app/providers/AdminStreamProvider";
import { useCurrentUser } from "@/src/app/providers/SessionProvider";
// Import Shared
import { hasAnyPermission } from "@/src/app/lib/shared/permissions";
import { formatCount, formatMoney, satangToBaht } from "@/src/app/lib/shared/format";

// Config จำนวนแจ้งเตือนสูงสุดที่แสดงพร้อมกัน
const MAX_VISIBLE = 3;

// Function แสดงแจ้งเตือนคืนเงินทุกหน้า จนกว่าจะคืนเงินหรือเปิด drawer รายการคืนเงิน
function RefundAlertStack(): JSX.Element | null {
    const { alerts, openPanel, pendingCount, pendingAmount } = useAdminStream();
    const user = useCurrentUser();
    const visible = alerts.filter((alert) => !alert.dismissed);

    if (visible.length === 0) {
        // ไม่มีสิทธิ์ dashboard = ไม่มี card ให้เปิด drawer แสดงแถบสรุปไว้จนกว่าจะคืนครบ
        if (!pendingCount || hasAnyPermission(user, ["dashboard"])) return null;
        return (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800 md:px-8">
                <span className="font-semibold">
                    รอคืนเงิน {formatCount(pendingCount)} รายการ ({formatMoney(satangToBaht(pendingAmount))} บาท)
                </span>
                <button
                    type="button"
                    onClick={openPanel}
                    className="rounded-full bg-red-700 px-4 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
                >
                    ดูรายการรอคืนเงิน
                </button>
            </div>
        );
    }

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
                    <button
                        type="button"
                        onClick={openPanel}
                        className={`rounded-full px-4 py-1.5 text-xs font-bold text-white transition hover:opacity-90 ${alert.tone === "danger" ? "bg-red-700" : "bg-amber-800"
                            }`}
                    >
                        ดูรายการรอคืนเงิน
                    </button>
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
