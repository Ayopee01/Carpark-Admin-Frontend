"use client";
// Import Library
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type JSX } from "react";
// Import Client
import { getDashboard } from "@/src/app/lib/client/queries";
import { subscribeDashboardEvents } from "@/src/app/lib/client/events";
// Import Types
import type { SseStatus } from "@/src/app/type/api/common";
import type { DashboardRefunds, DashboardSummary } from "@/src/app/type/api/dashboard";
import type { RefundListItem, RefundRequiredEvent } from "@/src/app/type/api/payments";
import type { AdminStreamContextValue, RefundAlert } from "@/src/app/type/ui/checkPayment";
// Import Shared
import { formatMoney, satangToBaht } from "@/src/app/lib/shared/format";
import { getErrorMessage } from "@/src/app/lib/shared/http";

/* -------------------------------------- Config -------------------------------------- */

// Config context ของ stream กลาง ค่าเริ่มต้นเมื่อไม่ได้อยู่ใต้ provider
const AdminStreamContext = createContext<AdminStreamContextValue>({
    dashboard: null,
    dashboardError: "",
    streamStatus: "closed",
    refundsEnabled: false,
    refunds: null,
    pendingCount: null,
    pendingAmount: null,
    alerts: [],
    paymentSettingsVersion: 0,
    panelOpen: false,
    openPanel: () => {},
    closePanel: () => {},
    markRefundResolved: () => {},
});

/* -------------------------------------- Functions -------------------------------------- */

// Function hook อ่านข้อมูล dashboard รายการรอคืนเงิน และแจ้งเตือนจาก stream กลาง
function useAdminStream(): AdminStreamContextValue {
    return useContext(AdminStreamContext);
}

/* -------------------------------------- Helpers -------------------------------------- */

// Function สร้างข้อความแจ้งเตือนจากยอดที่ต้องคืน (refundAmount ไม่ใช่ยอดที่จ่าย)
function buildMessage(item: Pick<RefundListItem, "plateNo" | "refundAmount" | "refundReason">): string {
    const baht = formatMoney(satangToBaht(item.refundAmount));
    const plate = item.plateNo;

    switch (item.refundReason) {
        case "already_paid":
            return `ทะเบียน ${plate} จ่าย QR ซ้ำ ${baht} บาท กรุณาคืนเงิน`;
        case "overpaid":
            return `ทะเบียน ${plate} จ่ายเกิน ${baht} บาท กรุณาคืนส่วนเกิน`;
        case "transaction_not_payable":
            return `ทะเบียน ${plate} จ่ายหลังปิดรายการ ${baht} บาท กรุณาคืนเงิน`;
        case "transaction_not_found":
            return `พบเงินเข้าโดยไม่มีรายการจอด ${baht} บาท กรุณาตรวจสอบ`;
        default:
            return `ทะเบียน ${plate} มีเงินรอคืน ${baht} บาท กรุณาตรวจสอบ`;
    }
}

// Function เลือกสีแจ้งเตือน overpaid คืนแค่ส่วนเกิน (เหลือง) นอกนั้นคืนทั้งหมด (แดง)
function getTone(item: { refundReason: string; applied?: boolean }): RefundAlert["tone"] {
    if (item.applied === false) return "danger";
    return item.refundReason === "overpaid" ? "warning" : "danger";
}

// Function แปลงเวลา ISO เป็น timestamp (ไม่มีหรือผิด = null)
function toTime(value?: string | null): number | null {
    const time = value ? Date.parse(value) : NaN;
    return Number.isNaN(time) ? null : time;
}

// Function รับเวลาของข้อมูลใหม่ false = เก่ากว่าที่ใช้อยู่ (ไม่มีเวลา = รับเสมอ)
function acceptStamp(ref: { current: number | null }, stamp: string | undefined): boolean {
    const time = toTime(stamp);
    if (time !== null && ref.current !== null && time < ref.current) return false;
    if (time !== null) ref.current = time;
    return true;
}

/* -------------------------------------- Component -------------------------------------- */

// Function เปิด SSE /dashboard/events เส้นเดียวต่อแท็บที่ layout แชร์ให้ dashboard, badge, แจ้งเตือน และ drawer คืนเงิน
function AdminStreamProvider({
    canViewDashboard,
    canViewRefunds,
    children,
}: {
    canViewDashboard: boolean; // สิทธิ์ dashboard
    canViewRefunds: boolean; // สิทธิ์ transactions
    children: ReactNode;
}): JSX.Element {
    // stream ถูกปฏิเสธ (403) ปิดไว้จนกว่าสิทธิ์จะเปลี่ยน
    const permissionKey = `${canViewDashboard}:${canViewRefunds}`;
    const [rejectedKey, setRejectedKey] = useState<string | null>(null);
    const streamEnabled = (canViewDashboard || canViewRefunds) && rejectedKey !== permissionKey;
    const refundsEnabled = canViewRefunds && streamEnabled;

    const [streamStatus, setStreamStatus] = useState<SseStatus>("connecting");
    const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
    const [dashboardError, setDashboardError] = useState("");
    const [refunds, setRefunds] = useState<DashboardRefunds | null>(null);
    const [pendingCount, setPendingCount] = useState<number | null>(null);
    const [pendingAmount, setPendingAmount] = useState<number | null>(null);
    const [alertMap, setAlertMap] = useState<Map<string, RefundAlert>>(() => new Map());
    const alertMapRef = useRef(alertMap);
    useEffect(() => {
        alertMapRef.current = alertMap;
    }, [alertMap]);
    const [paymentSettingsVersion, setPaymentSettingsVersion] = useState(0);
    const [panelOpen, setPanelOpen] = useState(false);
    const panelOpenRef = useRef(panelOpen);
    useEffect(() => {
        panelOpenRef.current = panelOpen;
    }, [panelOpen]);
    // เวลาของข้อมูลล่าสุด กัน event เก่ามาทับ แยกตัวเลข (at / generatedAt) กับรายการ (generatedAt)
    const countStampRef = useRef<number | null>(null);
    const listStampRef = useRef<number | null>(null);

    // เปิด drawer รายการรอคืนเงิน = เห็นแจ้งเตือนแล้ว
    const openPanel = useCallback(() => {
        setPanelOpen(true);
        setAlertMap((prev) => {
            if ([...prev.values()].every((alert) => alert.dismissed)) return prev;
            const next = new Map(prev);
            next.forEach((alert, key) => next.set(key, { ...alert, dismissed: true }));
            return next;
        });
    }, []);

    const closePanel = useCallback(() => setPanelOpen(false), []);

    // เอารายการออกจาก drawer ทันทีหลัง resolve สำเร็จ (dashboard_updated ที่ตามมาจะทับด้วยข้อมูลจริง)
    const markRefundResolved = useCallback((chargeId: string) => {
        setRefunds((prev) => (prev ? { ...prev, pending: prev.pending.filter((item) => item.chargeId !== chargeId) } : prev));
        setAlertMap((prev) => {
            if (!prev.has(chargeId)) return prev;
            const next = new Map(prev);
            next.delete(chargeId);
            return next;
        });
    }, []);

    useEffect(() => {
        if (!streamEnabled) return;
        let received = false;

        const newAlert = (item: Pick<RefundListItem, "chargeId" | "plateNo" | "refundAmount" | "refundReason"> & { applied?: boolean }): RefundAlert => ({
            chargeId: item.chargeId,
            tone: getTone(item),
            message: buildMessage(item),
            dismissed: panelOpenRef.current,
        });

        // Function ใช้รายการรอคืนเงินชุดเต็ม (ไม่มีหรือ null = ไม่มีสิทธิ์ หรือ backend ยังไม่ส่ง ไม่ต้องทำอะไร) snapshot = สร้างแจ้งเตือนใหม่ตามรายการ (แจ้งรายการที่พลาดระหว่างหลุด)
        function applyRefunds(next: DashboardRefunds | null | undefined, stamp: string | undefined, snapshot: boolean) {
            if (!next || !acceptStamp(listStampRef, stamp)) return;
            setRefunds(next);
            if (acceptStamp(countStampRef, stamp)) {
                setPendingCount(next.pendingCount);
                setPendingAmount(next.pendingAmount);
            }

            const prev = alertMapRef.current;
            const pendingIds = new Set(next.pending.map((item) => item.chargeId));
            const nextAlerts = new Map<string, RefundAlert>();
            if (snapshot) {
                next.pending.forEach((item) => nextAlerts.set(item.chargeId, prev.get(item.chargeId) ?? newAlert(item)));
            } else {
                prev.forEach((alert, key) => {
                    if (pendingIds.has(key)) nextAlerts.set(key, alert);
                });
            }
            const changed = nextAlerts.size !== prev.size || [...nextAlerts.keys()].some((key) => !prev.has(key));
            if (changed) setAlertMap(nextAlerts);
        }

        function handleRefundRequired(event: RefundRequiredEvent) {
            if (acceptStamp(countStampRef, event.at)) {
                setPendingCount(event.pendingCount);
                setPendingAmount(event.pendingAmount);
            }
            setAlertMap((prev) => {
                if (prev.has(event.chargeId)) return prev; // แจ้งเตือนอยู่แล้ว
                const next = new Map(prev);
                next.set(event.chargeId, newAlert(event));
                return next;
            });
        }

        return subscribeDashboardEvents({
            // สำรองเท่านั้น ไม่ได้ snapshot ตามเวลาให้โหลด dashboard ผ่าน API ครั้งเดียว (ต้องมีสิทธิ์ dashboard)
            onNoSnapshot: canViewDashboard
                ? async () => {
                    try {
                        const result = await getDashboard();
                        if (received) return;
                        setDashboard(result);
                        applyRefunds(result.refunds, undefined, true);
                    } catch (err) {
                        if (!received) setDashboardError(getErrorMessage(err, "เกิดข้อผิดพลาดในการโหลดข้อมูล"));
                    }
                }
                : undefined,
            onStatusChange: setStreamStatus,
            // 403 ไม่มีทั้งสิทธิ์ dashboard และ transactions หยุด stream และซ่อนแจ้งเตือน
            onFatalError: (err) => {
                setDashboardError(err.message);
                setRejectedKey(permissionKey);
            },
            onEvent: (event) => {
                switch (event.type) {
                    case "dashboard_snapshot":
                    case "dashboard_updated": {
                        received = true;
                        // ผู้ใช้ที่มีแค่สิทธิ์ transactions ได้ data = { refunds } ไม่มีสถิติ dashboard
                        if ("summaryCards" in event.data) {
                            setDashboard(event.data);
                            setDashboardError("");
                        }
                        applyRefunds(event.data.refunds, event.generatedAt, event.type === "dashboard_snapshot");
                        return;
                    }
                    // สนใจเฉพาะก่อนได้ข้อมูลแรก หลังจากนั้นคงข้อมูลเดิมไว้
                    case "dashboard_error":
                        if (!received) setDashboardError(event.message);
                        return;
                    case "refund_required":
                        handleRefundRequired(event);
                        return;
                    // รายการชุดเต็มมากับ dashboard_updated ที่ตามมา
                    case "refund_resolved":
                        if (acceptStamp(countStampRef, event.at)) {
                            setPendingCount(event.pendingCount);
                            setPendingAmount(event.pendingAmount);
                        }
                        markRefundResolved(event.chargeId);
                        return;
                    case "payment_settings_updated":
                        setPaymentSettingsVersion((value) => value + 1);
                        return;
                    // แจ้งเตือน IP อุปกรณ์ รับไว้แต่ยังไม่มี UI แสดง (เหมือนเดิม)
                    case "device_ip_changed":
                    case "device_ip_blocked":
                        return;
                    default:
                        return;
                }
            },
        });
    }, [canViewDashboard, markRefundResolved, permissionKey, streamEnabled]);

    const value = useMemo<AdminStreamContextValue>(
        () => ({
            dashboard: canViewDashboard ? dashboard : null,
            dashboardError,
            streamStatus: streamEnabled ? streamStatus : "closed",
            refundsEnabled,
            refunds: refundsEnabled ? refunds : null,
            pendingCount: refundsEnabled ? pendingCount : null,
            pendingAmount: refundsEnabled ? pendingAmount : null,
            alerts: refundsEnabled ? [...alertMap.values()] : [],
            paymentSettingsVersion,
            panelOpen: refundsEnabled && panelOpen,
            openPanel,
            closePanel,
            markRefundResolved,
        }),
        [alertMap, canViewDashboard, closePanel, dashboard, dashboardError, markRefundResolved, openPanel, panelOpen, paymentSettingsVersion, pendingAmount, pendingCount, refunds, refundsEnabled, streamEnabled, streamStatus]
    );

    return <AdminStreamContext.Provider value={value}>{children}</AdminStreamContext.Provider>;
}

export { useAdminStream, AdminStreamProvider };
