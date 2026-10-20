"use client";
// Import Library
import type { JSX } from "react";
// Import Types
import type { FeeBreakdownListProps } from "@/src/app/type/ui/checkPayment";
// Import Shared
import { formatMoney } from "@/src/app/lib/shared/format";

/* -------------------------------------- Config -------------------------------------- */

// Config ชื่อที่แสดงของประเภทค่าบริการ
const FEE_TYPE_LABELS: Record<"base_hour" | "next_hour", string> = {
  base_hour: "ชั่วโมงพื้นฐาน",
  next_hour: "ชั่วโมงถัดไป",
};

/* -------------------------------------- Helpers -------------------------------------- */

// Function แปลงวันที่ YYYY-MM-DD เป็นข้อความไทย
function formatDay(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

// Function สร้างข้อความช่วงชั่วโมง เช่น ชม. 1-3
function formatHourRange(start: number, end: number): string {
  return start === end ? `ชม. ${start}` : `ชม. ${start}-${end}`;
}

/* -------------------------------------- Component -------------------------------------- */

// Function แสดงที่มาของค่าจอด แยกตามวันและช่วงชั่วโมง พร้อมค่าค้างคืน
function FeeBreakdownList({ breakdown, billableHours }: FeeBreakdownListProps): JSX.Element | null {
  const hasDays = breakdown.days.length > 0;
  const overnight = breakdown.overnight;

  if (!hasDays && !overnight) return null;

  return (
    <details className="group border-b border-[#E3E7EB] pb-3 text-[13px]" open>
      <summary className="flex cursor-pointer list-none items-center justify-between text-[14px] text-[#8A95A3]">
        <span>รายละเอียดค่าบริการ</span>
        <span className="text-[12px] text-[#A3AFBC] group-open:hidden">แสดง</span>
        <span className="hidden text-[12px] text-[#A3AFBC] group-open:inline">ซ่อน</span>
      </summary>

      <div className="mt-2 space-y-3">
        {typeof billableHours === "number" ? (
          <div className="flex justify-between text-[#66707D]">
            <span>ชั่วโมงที่คิดเงิน</span>
            <span className="font-semibold text-[#1F2933]">{billableHours} ชม.</span>
          </div>
        ) : null}

        {breakdown.days.map((day) => (
          <div key={day.date} className="rounded-lg bg-white px-3 py-2">
            <div className="flex justify-between font-semibold text-[#1F2933]">
              <span>
                {formatDay(day.date)} · {day.hours} ชม.
              </span>
              <span>{formatMoney(day.amount)} ฿</span>
            </div>

            {day.ranges.map((range) => (
              <div
                key={`${range.feeType}-${range.hourStart}-${range.hourEnd}`}
                className="mt-1 flex justify-between gap-2 text-[12px] text-[#66707D]"
              >
                <span className="min-w-0">
                  {range.feeType ? FEE_TYPE_LABELS[range.feeType] : "ค่าบริการ"} {formatHourRange(range.hourStart, range.hourEnd)}
                  <br />
                  {range.hours} × {formatMoney(range.pricePerHour)}
                </span>
                <span className="shrink-0">{formatMoney(range.amount)}</span>
              </div>
            ))}
          </div>
        ))}

        {overnight ? (
          <div className="flex justify-between gap-2 rounded-lg bg-white px-3 py-2 text-[#1F2933]">
            <span className="min-w-0">
              <span className="font-semibold">ค่าค้างคืน</span>
              <br />
              <span className="text-[12px] text-[#66707D]">
                {overnight.nights} คืน × {formatMoney(overnight.pricePerNight)}
              </span>
            </span>
            <span className="shrink-0 font-semibold">{formatMoney(overnight.amount)} ฿</span>
          </div>
        ) : null}
      </div>
    </details>
  );
}

export { FeeBreakdownList };
