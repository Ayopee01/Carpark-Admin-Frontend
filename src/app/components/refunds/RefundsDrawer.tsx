"use client";
// Import Library
import { useState, type JSX } from "react";
import Link from "next/link";
import { LuCircleAlert, LuX } from "react-icons/lu";
import { toast } from "sonner";
// Import Components
import { Dialog, DialogContent, DialogTitle } from "@/src/app/components/ui/dialog";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/src/app/components/ui/sheet";
// Import Actions
import { resolveRefund } from "@/src/app/lib/actions/payments";
// Import Client
import { unwrap } from "@/src/app/lib/client/http";
// Import Providers
import { useAdminStream } from "@/src/app/providers/AdminStreamProvider";
import { useCurrentUser } from "@/src/app/providers/SessionProvider";
// Import Landing
import { REFUND_REASON_LABELS, CHANNEL_LABELS } from "@/src/app/lib/landing/checkPayment";
// Import Types
import type { RefundListItem } from "@/src/app/type/api/payments";
// Import Shared
import { ApiError, getErrorMessage } from "@/src/app/lib/shared/http";
import { hasAnyPermission } from "@/src/app/lib/shared/permissions";
import { formatMoney, satangToBaht, formatDateTime } from "@/src/app/lib/shared/format";

/* -------------------------------------- Helpers -------------------------------------- */

// Function แปลงสตางค์เป็นข้อความบาท
function formatSatang(value: number | null): string {
    return `${formatMoney(satangToBaht(value))} ฿`;
}

/* -------------------------------------- Component -------------------------------------- */

// Function drawer รายการรอคืนเงินจาก stream กลาง (refunds.pending) เปิดได้จาก card ใน dashboard, แจ้งเตือน และ dialog ชำระเงิน
// เลื่อนออกจากขวาด้วย Sheet (render ไว้ตลอด ให้ animation ตอนปิดเล่นได้)
function RefundsDrawer(): JSX.Element {
    const { panelOpen, closePanel, refunds, pendingCount, pendingAmount, markRefundResolved } = useAdminStream();
    const user = useCurrentUser();
    // ประวัติคืนเงินอยู่ในหน้ายอดรวม (ต้องมีสิทธิ์ overview)
    const canViewHistory = hasAnyPermission(user, ["overview"]);

    const [resolving, setResolving] = useState<RefundListItem | null>(null);
    const [note, setNote] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [modalError, setModalError] = useState("");

    function handleClose() {
        closePanel();
    }

    function openResolve(item: RefundListItem) {
        setResolving(item);
        setNote("");
        setModalError("");
    }

    async function handleResolve() {
        if (!resolving || submitting) return;
        const item = resolving;
        const trimmed = note.trim();

        try {
            setSubmitting(true);
            setModalError("");

            await unwrap(resolveRefund(item.chargeId, trimmed ? { note: trimmed } : {}));

            // เอาออกทันที แล้วให้ refund_resolved/dashboard_updated ที่ตามมาทับ
            markRefundResolved(item.chargeId);
            toast.success(`บันทึกการคืนเงินทะเบียน ${item.plateNo} แล้ว`);
            setResolving(null);
        } catch (err) {
            const plate = item.plateNo;

            // 409 มีคนบันทึกไปแล้ว ถือว่าคืนแล้ว รอข้อมูลจาก stream
            if (err instanceof ApiError && err.code === "REFUND_ALREADY_RESOLVED") {
                markRefundResolved(item.chargeId);
                setResolving(null);
                toast.info(`ทะเบียน ${plate} มีผู้บันทึกการคืนเงินไปแล้ว`);
                return;
            }

            if (
                err instanceof ApiError &&
                (err.code === "REFUND_NOT_REQUIRED" || err.code === "GATEWAY_CHARGE_NOT_FOUND")
            ) {
                setResolving(null);
                toast.error(err.message);
                return;
            }

            setModalError(getErrorMessage(err, "บันทึกการคืนเงินไม่สำเร็จ"));
        } finally {
            setSubmitting(false);
        }
    }

    const items = refunds?.pending ?? [];

    // Escape, คลิกฉากหลัง และปุ่มปิด เรียก onOpenChange(false)
    return (
        <Sheet open={panelOpen} onOpenChange={(open) => !open && handleClose()}>
            <SheetContent className="max-w-[1040px] bg-[#EFEFEF] text-[#1F2933]">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#D8DADF] bg-white px-4 py-5 md:px-8">
                    <div>
                        <SheetTitle className="text-[24px] font-extrabold leading-none text-[#2B3640] sm:text-[28px]">
                            รายการรอคืนเงิน
                        </SheetTitle>
                        <SheetDescription className="mt-2 text-[14px] text-[#67727E]">
                            • เงินที่ลูกค้าจ่ายผ่าน QR PromptPay ซ้ำหรือเกินยอด
                        </SheetDescription>
                    </div>

                    <div className="flex items-center gap-2">
                        {canViewHistory ? (
                            <Link
                                href="/landing/summary?tab=refunds"
                                onClick={handleClose}
                                className="inline-flex h-10 items-center rounded-full border border-[#D8DADF] bg-white px-4 text-[13px] font-semibold text-[#1F2933] transition hover:bg-[#F4F4F4]"
                            >
                                ประวัติการคืนเงิน
                            </Link>
                        ) : null}
                        <SheetClose
                            aria-label="ปิด"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#061D36] transition hover:bg-[#F4F4F4]"
                        >
                            <LuX size={22} />
                        </SheetClose>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-5 md:px-8">
                    <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-[14px] text-amber-900">
                        <LuCircleAlert size={20} className="mt-0.5 shrink-0" />
                        <div className="space-y-1">
                            <p>
                                PromptPay คืนเงินผ่านระบบไม่ได้ กรุณาคืนเงินสดหรือโอนคืน แล้วกด
                                &quot;บันทึกว่าคืนเงินเองแล้ว&quot; (เป็นการบันทึกเท่านั้น ไม่ได้โอนเงินให้)
                            </p>
                            <p className="text-[13px] text-amber-800">
                                การชำระด้วยบัตรรับผ่านเครื่อง EDC ทั้งหมดและไม่อยู่ในรายการนี้ ถ้าต้องคืนให้ void/refund
                                ที่เครื่อง EDC โดยใช้เลขอ้างอิงจากสลิป
                            </p>
                        </div>
                    </div>

                    {pendingCount != null ? (
                        <div className="mb-5 grid gap-4 sm:grid-cols-2">
                            <div className="rounded-2xl border border-[#D8DADF] bg-white px-5 py-4">
                                <p className="text-[13px] text-[#67727E]">รอคืนเงิน</p>
                                <p className="mt-1 text-[26px] font-extrabold">{pendingCount} รายการ</p>
                            </div>
                            <div className="rounded-2xl border border-[#D8DADF] bg-white px-5 py-4">
                                <p className="text-[13px] text-[#67727E]">ยอดที่ต้องคืนทั้งหมด</p>
                                <p className="mt-1 text-[26px] font-extrabold text-[#DC2626]">
                                    {formatSatang(pendingAmount)}
                                </p>
                            </div>
                        </div>
                    ) : null}

                    <div className="overflow-hidden rounded-[20px] border border-[#BAC0C8] bg-white shadow-sm">
                        <div className="bg-[#031C36] px-6 py-4 text-[15px] font-semibold text-white">
                            รอคืนเงิน
                        </div>

                        {!refunds ? (
                            <div className="px-6 py-10 text-center text-[#64748B]">กำลังโหลดข้อมูล...</div>
                        ) : items.length === 0 ? (
                            <div className="px-6 py-10 text-center text-[#64748B]">ไม่มีรายการรอคืนเงิน</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[960px] text-left text-[14px]">
                                    <thead className="border-b border-[#E5E7EB] bg-[#F8FAFC] text-[13px] text-[#67727E]">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold">ทะเบียน</th>
                                            <th className="px-4 py-3 font-semibold">วันเวลาที่จ่าย</th>
                                            <th className="px-4 py-3 font-semibold">ช่องทาง</th>
                                            <th className="px-4 py-3 text-right font-semibold">ยอดที่ลูกค้าจ่าย</th>
                                            <th className="px-4 py-3 text-right font-semibold">ยอดที่ต้องคืน</th>
                                            <th className="px-4 py-3 font-semibold">เหตุผล</th>
                                            <th className="px-6 py-3 font-semibold" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item) => (
                                            <tr key={item.chargeId}className="border-b border-[#F1F2F4] align-top">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold">{item.plateNo}</div>
                                                    <div className="mt-1 break-all text-[12px] text-[#98A2B3]">
                                                        {item.chargeId}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">{formatDateTime(item.paidAt)}</td>
                                                <td className="px-4 py-4">
                                                    {CHANNEL_LABELS[item.channel]}
                                                    <div className="text-[12px] text-[#98A2B3]">{item.method}</div>
                                                </td>
                                                <td className="px-4 py-4 text-right">{formatSatang(item.amount)}</td>
                                                <td className="px-4 py-4 text-right font-bold text-[#DC2626]">
                                                    {formatSatang(item.refundAmount)}
                                                </td>
                                                <td className="px-4 py-4">
                                                    {REFUND_REASON_LABELS[item.refundReason]}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => openResolve(item)}
                                                        className="whitespace-nowrap rounded-full bg-[#061D36] px-4 py-2 text-[13px] font-bold text-white transition hover:opacity-90"
                                                    >
                                                        บันทึกว่าคืนเงินเองแล้ว
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </SheetContent>

            {/* dialog ยืนยันซ้อนใน sheet (Radix บล็อกการคลิกนอก dialog ที่เปิดอยู่ จึงต้องเป็น dialog ด้วย) ระหว่างบันทึกปิดไม่ได้ */}
            <Dialog open={resolving !== null} onOpenChange={(open) => !open && setResolving(null)}>
                <DialogContent
                    locked={submitting}
                    aria-describedby={undefined}
                    overlayClassName="bg-[#26313C]/75 backdrop-blur-sm"
                    className="max-w-[480px] rounded-[14px] bg-white p-6 shadow-2xl sm:p-8"
                >
                    {resolving ? (
                        <>
                            <button
                                type="button"
                                onClick={() => setResolving(null)}
                                disabled={submitting}
                                aria-label="ปิด"
                                className="absolute right-6 top-6 text-[#061D36] disabled:opacity-50"
                            >
                                <LuX size={22} />
                            </button>

                            <DialogTitle className="text-[22px] font-bold text-[#061D36]">บันทึกว่าคืนเงินเองแล้ว</DialogTitle>

                            <dl className="mt-4 grid grid-cols-[110px_1fr] gap-y-2 text-[14px]">
                                <dt className="text-[#667085]">ทะเบียน</dt>
                                <dd className="font-bold">{resolving.plateNo}</dd>
                                <dt className="text-[#667085]">ช่องทาง</dt>
                                <dd>{CHANNEL_LABELS[resolving.channel]}</dd>
                                <dt className="text-[#667085]">ยอดคืน</dt>
                                <dd className="font-bold text-[#DC2626]">{formatSatang(resolving.refundAmount)}</dd>
                            </dl>

                            <p className="mt-3 text-[13px] text-[#667085]">
                                ยืนยันเมื่อคืนเงินสดหรือโอนคืนให้ลูกค้าแล้วเท่านั้น
                            </p>

                            <label htmlFor="refund-note" className="mt-5 block text-[13px] font-semibold text-[#1F2937]">
                                หมายเหตุ (ไม่บังคับ)
                            </label>
                            <textarea
                                id="refund-note"
                                value={note}
                                onChange={(event) => setNote(event.target.value)}
                                rows={3}
                                placeholder="เช่น คืนเงินสดที่เคาน์เตอร์ หรือ โอนคืนบัญชี xxx"
                                className="mt-2 w-full rounded-md border border-[#E5E7EB] px-4 py-3 text-[14px] outline-none"
                            />

                            {modalError ? (
                                <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
                                    {modalError}
                                </div>
                            ) : null}

                            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={() => setResolving(null)}
                                    disabled={submitting}
                                    className="h-11 min-w-[110px] rounded-full bg-[#9CA3AF] px-6 text-[14px] font-bold text-white disabled:opacity-60"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleResolve()}
                                    disabled={submitting}
                                    className="h-11 min-w-[110px] rounded-full bg-[#061D36] px-6 text-[14px] font-bold text-white disabled:opacity-60"
                                >
                                    {submitting ? "กำลังบันทึก..." : "บันทึกว่าคืนเงินเองแล้ว"}
                                </button>
                            </div>
                        </>
                    ) : null}
                </DialogContent>
            </Dialog>
        </Sheet>
    );
}

export { RefundsDrawer };
