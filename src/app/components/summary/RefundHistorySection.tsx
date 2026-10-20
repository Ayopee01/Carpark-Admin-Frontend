// Import Library
import type { JSX } from "react";
// Import Landing
import { REFUND_REASON_LABELS, CHANNEL_LABELS } from "@/src/app/lib/landing/checkPayment";
// Import Types
import type { RefundListItem } from "@/src/app/type/api/payments";
// Import Shared
import { formatCount, formatMoney, satangToBaht, formatDateTime } from "@/src/app/lib/shared/format";

// Function แปลงสตางค์เป็นข้อความบาท
function formatSatang(value: number | null): string {
    return `${formatMoney(satangToBaht(value))} ฿`;
}

// Function tab ประวัติคืนเงินในหน้ายอดรวม (refundHistory ของ overview คืนแล้วในช่วงวันที่ ใหม่สุดก่อน เงินเป็นสตางค์)
function RefundHistorySection({ items }: { items: RefundListItem[] }): JSX.Element {
    const totalRefunded = items.reduce((sum, item) => sum + item.refundAmount, 0);

    return (
        <div>
            <div className="mb-5">
                <h2 className="text-[22px] font-extrabold leading-none text-[#1F2937] sm:text-[26px]">ประวัติการคืนเงิน</h2>
                <p className="mt-2 text-[14px] text-[#6B7280]">
                    • รายการ QR PromptPay ที่บันทึกว่าคืนเงินแล้วในช่วงวันที่ด้านบน
                </p>
            </div>

            <div className="mb-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#D8DADF] bg-white px-5 py-4">
                    <p className="text-[13px] text-[#67727E]">คืนเงินแล้ว</p>
                    <p className="mt-1 text-[26px] font-extrabold">{formatCount(items.length)} รายการ</p>
                </div>
                <div className="rounded-2xl border border-[#D8DADF] bg-white px-5 py-4">
                    <p className="text-[13px] text-[#67727E]">ยอดที่คืนทั้งหมด</p>
                    <p className="mt-1 text-[26px] font-extrabold">{formatSatang(totalRefunded)}</p>
                </div>
            </div>

            <div className="overflow-hidden rounded-[20px] border border-[#BAC0C8] bg-white shadow-sm">
                {items.length === 0 ? (
                    <div className="px-6 py-10 text-center text-[#64748B]">ยังไม่มีประวัติการคืนเงินในช่วงนี้</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[960px] text-left text-[14px]">
                            <thead className="border-b border-[#E5E7EB] bg-[#F8FAFC] text-[13px] text-[#67727E]">
                                <tr>
                                    <th className="px-6 py-3 font-semibold">ทะเบียน</th>
                                    <th className="px-4 py-3 font-semibold">วันเวลาที่จ่าย</th>
                                    <th className="px-4 py-3 font-semibold">ช่องทาง</th>
                                    <th className="px-4 py-3 text-right font-semibold">ยอดที่ลูกค้าจ่าย</th>
                                    <th className="px-4 py-3 text-right font-semibold">ยอดที่คืน</th>
                                    <th className="px-4 py-3 font-semibold">เหตุผล</th>
                                    <th className="px-6 py-3 font-semibold">บันทึกการคืน</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => (
                                    <tr key={item.chargeId} className="border-b border-[#F1F2F4] align-top">
                                        <td className="px-6 py-4">
                                            <div className="font-bold">{item.plateNo}</div>
                                            <div className="mt-1 break-all text-[12px] text-[#98A2B3]">{item.chargeId}</div>
                                        </td>
                                        <td className="px-4 py-4">{formatDateTime(item.paidAt)}</td>
                                        <td className="px-4 py-4">
                                            {CHANNEL_LABELS[item.channel]}
                                            <div className="text-[12px] text-[#98A2B3]">{item.method}</div>
                                        </td>
                                        <td className="px-4 py-4 text-right">{formatSatang(item.amount)}</td>
                                        <td className="px-4 py-4 text-right font-bold">{formatSatang(item.refundAmount)}</td>
                                        <td className="px-4 py-4">{REFUND_REASON_LABELS[item.refundReason]}</td>
                                        <td className="px-6 py-4 text-[13px]">
                                            <div className="font-semibold">
                                                คืนเงินเอง
                                                {item.refundResolvedBy ? ` โดย ${item.refundResolvedBy}` : ""}
                                            </div>
                                            <div className="text-[#67727E]">{formatDateTime(item.refundResolvedAt)}</div>
                                            {item.refundNote ? <div className="mt-1 text-[#67727E]">{item.refundNote}</div> : null}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export { RefundHistorySection };
