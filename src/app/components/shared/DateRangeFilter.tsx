"use client"
// Import Library
import * as React from "react";
import { th } from "date-fns/locale";
import { startOfMonth } from "date-fns";
import { addToRange, type DateRange } from "react-day-picker";
import { ChevronRight } from "lucide-react";
// Import Components
import { Button } from "@/src/app/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/src/app/components/ui/popover";
import { Calendar } from "@/src/app/components/ui/calendar";
// Import Types
import type { DateRangeFilterProps, DateInput } from "@/src/app/type/ui/shared";
// Import Shared
import { cn } from "@/src/app/lib/shared/utils";

/* -------------------------------------- Config -------------------------------------- */

// Config วันเก่าสุดที่เลือกได้เมื่อ API ไม่ส่ง minDate
const FALLBACK_MIN_DATE = new Date(2020, 0, 1)

// Config ชื่อเดือนภาษาไทยแบบย่อ (ตัวเลือกเดือนของปฏิทิน)
const THAI_MONTHS = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
]

/* -------------------------------------- Helpers -------------------------------------- */

// Function ตัดเวลาออกจากวันที่
function normalizeDate(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

// Function แปลงค่าวันที่จาก API (YYYY-MM-DD หรือ date-time) เป็น Date
function parseDateInput(value: DateInput): Date | undefined {
    if (!value) return undefined

    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) return undefined
        return normalizeDate(value)
    }

    const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/)

    if (dateOnlyMatch) {
        const [, year, month, day] = dateOnlyMatch

        return new Date(
            Number(year),
            Number(month) - 1,
            Number(day)
        )
    }

    const parsedDate = new Date(value)

    if (Number.isNaN(parsedDate.getTime())) {
        return undefined
    }

    return normalizeDate(parsedDate)
}

// Function บังคับเดือนที่แสดงให้อยู่ในช่วง minDate ถึง maxDate
function clampMonthToRange(
    date: Date,
    minMonth: Date,
    maxMonth: Date
): Date {
    const month = startOfMonth(date)

    if (month.getTime() < minMonth.getTime()) {
        return minMonth
    }

    if (month.getTime() > maxMonth.getTime()) {
        return maxMonth
    }

    return month
}

// Function ตรวจว่าเป็นวันเดียวกัน
function isSameDate(dateA?: Date, dateB?: Date): boolean {
    if (!dateA || !dateB) return false

    return (
        dateA.getFullYear() === dateB.getFullYear() &&
        dateA.getMonth() === dateB.getMonth() &&
        dateA.getDate() === dateB.getDate()
    )
}

// Function แปลงวันที่เป็นข้อความไทย เช่น 1 ม.ค. 2569
function formatThaiDate(date: Date): string {
    return new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(date)
}

// Function สร้างข้อความของช่วงวันที่ที่เลือก
function formatRangeLabel(range?: DateRange): string {
    if (!range?.from) {
        return "เลือกช่วงวันที่"
    }

    if (!range.to) {
        return `${formatThaiDate(range.from)} - เลือกวันสิ้นสุด`
    }

    if (isSameDate(range.from, range.to)) {
        return formatThaiDate(range.from)
    }

    return `${formatThaiDate(range.from)} - ${formatThaiDate(range.to!)}`
}

/* -------------------------------------- Component -------------------------------------- */

// Function ตัวเลือกช่วงวันที่ เลือกวันเริ่มแล้ววันสิ้นสุด ห้ามเลือกวันในอนาคต
function DateRangeFilter({
    value,
    onChange,
    minDate,
    maxDate,
}: DateRangeFilterProps): React.JSX.Element {
    const today = React.useMemo(() => normalizeDate(new Date()), [])

    const parsedMinDate = React.useMemo(
        () => parseDateInput(minDate),
        [minDate]
    )

    const parsedMaxDate = React.useMemo(
        () => parseDateInput(maxDate),
        [maxDate]
    )

    const maxSelectableDate = React.useMemo(() => {
        const candidate = parsedMaxDate ?? today

        if (candidate.getTime() > today.getTime()) {
            return today
        }

        return candidate
    }, [parsedMaxDate, today])

    const minSelectableDate = React.useMemo(() => {
        const candidate = parsedMinDate ?? FALLBACK_MIN_DATE

        if (candidate.getTime() > maxSelectableDate.getTime()) {
            return maxSelectableDate
        }

        return candidate
    }, [parsedMinDate, maxSelectableDate])

    const startMonthLimit = React.useMemo(
        () => startOfMonth(minSelectableDate),
        [minSelectableDate]
    )

    const endMonthLimit = React.useMemo(
        () => startOfMonth(maxSelectableDate),
        [maxSelectableDate]
    )

    const getInitialMonth = React.useCallback(
        (range?: DateRange) => {
            const baseDate = range?.from ?? maxSelectableDate

            return clampMonthToRange(
                baseDate,
                startMonthLimit,
                endMonthLimit
            )
        },
        [maxSelectableDate, startMonthLimit, endMonthLimit]
    )

    const [open, setOpen] = React.useState(false)

    const [rawMonth, setMonth] = React.useState<Date>(() =>
        getInitialMonth(value)
    )

    const [draftRange, setDraftRange] = React.useState<DateRange | undefined>(
        value
    )

    const currentLabelRange = open ? draftRange : value

    const label = React.useMemo(
        () => formatRangeLabel(currentLabelRange),
        [currentLabelRange]
    )

    const isDraftRangeComplete = Boolean(draftRange?.from && draftRange.to)

    const disabledDays = React.useMemo(
        () => [
            { before: minSelectableDate },
            { after: maxSelectableDate },
        ],
        [minSelectableDate, maxSelectableDate]
    )

    const isDateDisabled = React.useCallback(
        (date: Date) => {
            const normalizedDate = normalizeDate(date)

            return (
                normalizedDate.getTime() < minSelectableDate.getTime() ||
                normalizedDate.getTime() > maxSelectableDate.getTime()
            )
        },
        [minSelectableDate, maxSelectableDate]
    )

    const handleCancelAndClear = React.useCallback(() => {
        setOpen(false)
        setDraftRange(undefined)
        setMonth(getInitialMonth(undefined))

        onChange(undefined)
    }, [getInitialMonth, onChange])

    // เดือนที่แสดงอยู่ในช่วงที่เลือกได้เสมอ แม้ minDate/maxDate เปลี่ยน
    const month = clampMonthToRange(rawMonth, startMonthLimit, endMonthLimit)

    // Escape/คลิกนอก Popover เรียก onOpenChange(false) = ยกเลิกและล้างค่า (Popover แบบ modal ล็อก scroll ให้)
    function handleOpenChange(nextOpen: boolean) {
        if (nextOpen) {
            setOpen(true)
            setDraftRange(value)
            setMonth(getInitialMonth(value))
            return
        }

        handleCancelAndClear()
    }

    // DayPicker (mode="range" + resetOnSelect) จัดการการเลือก: คลิกแรก = วันเริ่ม, คลิกสอง = วันสิ้นสุด
    // (ก่อนวันเริ่มสลับให้เอง, วันเดียวกัน = 1 วัน, มีช่วงอยู่แล้ว = เริ่มช่วงใหม่) ได้ครบทั้งสองวันแล้วส่งค่าและปิด
    function handleSelect(range: DateRange) {
        setDraftRange(range)

        if (range.from && range.to) {
            onChange(range)
            setOpen(false)
            return
        }

        if (range.from) setMonth(startOfMonth(range.from))
    }

    // ปุ่มวันนี้ = เลือกวันนี้เป็นวันสิ้นสุด (ใช้ได้หลังเลือกวันเริ่มแล้ว)
    function handleTodayClick() {
        if (!draftRange?.from) return
        handleSelect(addToRange(today, draftRange, 0, 0, true) ?? draftRange)
    }

    return (
        <Popover open={open} onOpenChange={handleOpenChange} modal>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    className={cn(
                        "h-12 w-full min-w-0 justify-between rounded-full border border-[#BFC5CC] bg-[#F3F4F6] px-5 text-[15px] font-medium text-[#1F2933] shadow-none hover:bg-white sm:min-w-[320px]",
                        !currentLabelRange?.from && "text-[#6B7280]"
                    )}
                >
                    <span className="truncate">{label}</span>
                    <ChevronRight className="size-4 shrink-0 opacity-70" />
                </Button>
            </PopoverTrigger>

            {/* ฉากหลังสีเทาเป็นแค่ภาพ คลิกนอก Popover ปิดเอง */}
            {open && (
                <div aria-hidden className="pointer-events-none fixed inset-0 z-40 bg-black/20 animate-in fade-in-0" />
            )}

            <PopoverContent
                align="start"
                sideOffset={10}
                className="z-50 w-auto rounded-[18px] border border-[#DADFE5] bg-white p-3 shadow-[0_12px_40px_rgba(15,23,42,0.12)]"
            >
                <Calendar
                    month={month}
                    onMonthChange={setMonth}
                    mode="range"
                    required
                    resetOnSelect
                    selected={draftRange ?? { from: undefined }}
                    onSelect={handleSelect}
                    disabled={disabledDays}
                    locale={th}
                    showOutsideDays
                    fixedWeeks
                    captionLayout="dropdown"
                    formatters={{ formatMonthDropdown: (date) => THAI_MONTHS[date.getMonth()] }}
                    startMonth={startMonthLimit}
                    endMonth={endMonthLimit}
                    className="rounded-2xl bg-white p-0"
                    classNames={{
                        months: "flex flex-col",
                        month: "space-y-3",
                        weekdays: "mt-1 flex justify-between",
                        weekday:
                            "w-10 text-center text-[11px] font-medium text-[#9CA3AF]",
                        week: "mt-1 flex justify-between",
                        day: "h-10 w-10 p-0",
                        day_button:
                            "h-10 w-10 rounded-[10px] p-0 text-[14px] font-medium",
                        range_start:
                            "bg-[#2F3136] text-white rounded-[10px]",
                        range_end:
                            "bg-[#2F3136] text-white rounded-[10px]",
                        range_middle:
                            "bg-[#EEF2F7] text-[#1F2933] rounded-[10px]",
                        selected:
                            "bg-[#2F3136] text-white hover:bg-[#2F3136]",
                        today: "font-semibold text-[#1F2933]",
                        outside: "text-[#D1D5DB]",
                        disabled:
                            "cursor-not-allowed text-[#D1D5DB] opacity-40 hover:bg-transparent",
                    }}
                />

                <div className="mt-3 border-t border-[#EEF0F3] pt-3">
                    <button
                        type="button"
                        onClick={handleTodayClick}
                        disabled={!draftRange?.from || Boolean(draftRange.to) || isDateDisabled(today)}
                        className="h-9 w-full rounded-full bg-[#2F3136] text-[13px] font-semibold text-white transition hover:bg-[#1F2933] disabled:cursor-not-allowed disabled:bg-[#D1D5DB] disabled:text-white"
                    >
                        วันนี้
                    </button>
                </div>

                {!isDraftRangeComplete && (
                    <p className="mt-2 text-center text-[12px] text-[#6B7280]">
                        กรุณาเลือกวันเริ่มต้นและวันสิ้นสุดก่อน
                    </p>
                )}
            </PopoverContent>
        </Popover>
    )
}

export { DateRangeFilter };
