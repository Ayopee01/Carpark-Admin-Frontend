"use client"
// Import Library
import * as React from "react";
import { th } from "date-fns/locale";
import { addMonths, startOfMonth, subMonths } from "date-fns";
import { type DateRange } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

// Config ชื่อเดือนภาษาไทยแบบย่อ
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

    const years = React.useMemo(() => {
        const startYear = startMonthLimit.getFullYear()
        const endYear = endMonthLimit.getFullYear()

        return Array.from(
            { length: endYear - startYear + 1 },
            (_, index) => startYear + index
        )
    }, [startMonthLimit, endMonthLimit])

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

    const [isSelectingEnd, setIsSelectingEnd] = React.useState(false)

    const [calendarResetKey, setCalendarResetKey] = React.useState(0)

    const currentLabelRange = open ? draftRange : value

    const label = React.useMemo(
        () => formatRangeLabel(currentLabelRange),
        [currentLabelRange]
    )

    const isDraftRangeComplete = Boolean(draftRange?.from && draftRange.to)

    const calendarSelectedRange = React.useMemo<DateRange | undefined>(() => {
        if (!draftRange?.from) return undefined

        if (isSelectingEnd) {
            return {
                from: draftRange.from,
                to: undefined,
            }
        }

        return draftRange
    }, [draftRange, isSelectingEnd])

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
        setIsSelectingEnd(false)
        setCalendarResetKey((prev) => prev + 1)
        setMonth(getInitialMonth(undefined))

        onChange(undefined)
    }, [getInitialMonth, onChange])

    // เดือนที่แสดงอยู่ในช่วงที่เลือกได้เสมอ แม้ minDate/maxDate เปลี่ยน
    const month = clampMonthToRange(rawMonth, startMonthLimit, endMonthLimit)

    React.useEffect(() => {
        if (!open) return

        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = "hidden"

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return

            event.preventDefault()
            handleCancelAndClear()
        }

        window.addEventListener("keydown", handleKeyDown)

        return () => {
            document.body.style.overflow = previousOverflow
            window.removeEventListener("keydown", handleKeyDown)
        }
    }, [open, handleCancelAndClear])

    function handleOpenChange(nextOpen: boolean) {
        if (nextOpen) {
            setOpen(true)
            setDraftRange(value)
            setIsSelectingEnd(false)
            setCalendarResetKey((prev) => prev + 1)
            setMonth(getInitialMonth(value))
            return
        }

        handleCancelAndClear()
    }

    function handleDayClick(day: Date) {
        const selectedDay = normalizeDate(day)

        if (isDateDisabled(selectedDay)) {
            return
        }

        if (!isSelectingEnd) {
            const nextDraftRange: DateRange = {
                from: selectedDay,
                to: undefined,
            }

            setDraftRange(nextDraftRange)
            setMonth(startOfMonth(selectedDay))
            setIsSelectingEnd(true)
            setCalendarResetKey((prev) => prev + 1)

            return
        }

        const startDate = draftRange?.from

        if (!startDate) {
            const nextDraftRange: DateRange = {
                from: selectedDay,
                to: undefined,
            }

            setDraftRange(nextDraftRange)
            setMonth(startOfMonth(selectedDay))
            setIsSelectingEnd(true)
            setCalendarResetKey((prev) => prev + 1)

            return
        }

        const start = normalizeDate(startDate)

        const nextRange: DateRange =
            selectedDay.getTime() < start.getTime()
                ? {
                    from: selectedDay,
                    to: start,
                }
                : {
                    from: start,
                    to: selectedDay,
                }

        setDraftRange(nextRange)
        setIsSelectingEnd(false)

        onChange(nextRange)
        setOpen(false)
    }

    function handleTodayClick() {
        const selectedToday = normalizeDate(new Date())

        if (isDateDisabled(selectedToday)) {
            return
        }

        const startDate = draftRange?.from

        if (!startDate) {
            return
        }

        const start = normalizeDate(startDate)

        const nextRange: DateRange =
            selectedToday.getTime() < start.getTime()
                ? {
                    from: selectedToday,
                    to: start,
                }
                : {
                    from: start,
                    to: selectedToday,
                }

        setDraftRange(nextRange)
        setIsSelectingEnd(false)
        setCalendarResetKey((prev) => prev + 1)

        onChange(nextRange)
        setOpen(false)
    }

    const canGoPrev = month.getTime() > startMonthLimit.getTime()
    const canGoNext = month.getTime() < endMonthLimit.getTime()

    function handlePrevMonth() {
        if (!canGoPrev) return

        setMonth(
            clampMonthToRange(
                subMonths(month, 1),
                startMonthLimit,
                endMonthLimit
            )
        )
    }

    function handleNextMonth() {
        if (!canGoNext) return

        setMonth(
            clampMonthToRange(
                addMonths(month, 1),
                startMonthLimit,
                endMonthLimit
            )
        )
    }

    function handleMonthChange(event: React.ChangeEvent<HTMLSelectElement>) {
        const nextMonthIndex = Number(event.target.value)

        setMonth(
            clampMonthToRange(
                new Date(month.getFullYear(), nextMonthIndex, 1),
                startMonthLimit,
                endMonthLimit
            )
        )
    }

    function handleYearChange(event: React.ChangeEvent<HTMLSelectElement>) {
        const nextYear = Number(event.target.value)

        setMonth(
            clampMonthToRange(
                new Date(nextYear, month.getMonth(), 1),
                startMonthLimit,
                endMonthLimit
            )
        )
    }

    function isMonthOptionDisabled(monthIndex: number) {
        const optionMonth = startOfMonth(
            new Date(month.getFullYear(), monthIndex, 1)
        )

        return (
            optionMonth.getTime() < startMonthLimit.getTime() ||
            optionMonth.getTime() > endMonthLimit.getTime()
        )
    }

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
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

            {open && (
                <button
                    type="button"
                    aria-label="ปิดตัวเลือกวันที่"
                    onClick={handleCancelAndClear}
                    className="fixed inset-0 z-40 cursor-default bg-black/20"
                />
            )}

            <PopoverContent
                align="start"
                sideOffset={10}
                onEscapeKeyDown={(event) => {
                    event.preventDefault()
                    handleCancelAndClear()
                }}
                onInteractOutside={(event) => {
                    event.preventDefault()
                    handleCancelAndClear()
                }}
                className="z-50 w-auto rounded-[18px] border border-[#DADFE5] bg-white p-3 shadow-[0_12px_40px_rgba(15,23,42,0.12)]"
            >
                <div className="mb-3 flex items-center justify-between gap-2">
                    <button
                        type="button"
                        onClick={handlePrevMonth}
                        disabled={!canGoPrev}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#1F2933] transition hover:bg-[#F3F4F6] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>

                    <div className="flex items-center gap-2">
                        <select
                            value={month.getMonth()}
                            onChange={handleMonthChange}
                            className="h-8 rounded-md border border-[#D1D5DB] bg-white px-2 text-[13px] font-medium text-[#1F2933] outline-none"
                        >
                            {THAI_MONTHS.map((monthLabel, index) => (
                                <option
                                    key={monthLabel}
                                    value={index}
                                    disabled={isMonthOptionDisabled(index)}
                                >
                                    {monthLabel}
                                </option>
                            ))}
                        </select>

                        <select
                            value={month.getFullYear()}
                            onChange={handleYearChange}
                            className="h-8 rounded-md border border-[#D1D5DB] bg-white px-2 text-[13px] font-medium text-[#1F2933] outline-none"
                        >
                            {years.map((year) => (
                                <option key={year} value={year}>
                                    {year}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="button"
                        onClick={handleNextMonth}
                        disabled={!canGoNext}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#1F2933] transition hover:bg-[#F3F4F6] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>

                <Calendar
                    key={calendarResetKey}
                    month={month}
                    onMonthChange={setMonth}
                    mode="range"
                    selected={calendarSelectedRange}
                    onDayClick={(day) => handleDayClick(day)}
                    disabled={disabledDays}
                    locale={th}
                    showOutsideDays
                    fixedWeeks
                    hideNavigation
                    startMonth={startMonthLimit}
                    endMonth={endMonthLimit}
                    className="rounded-2xl bg-white p-0"
                    classNames={{
                        month_caption: "hidden",
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
                        disabled={!isSelectingEnd || !draftRange?.from || isDateDisabled(today)}
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
