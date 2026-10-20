"use client"
// Import Library
import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
// Import Components
import { SelectField } from "@/src/app/components/shared/SelectField";
// Import Types
import type { CalendarProps } from "@/src/app/type/ui/shared";
// Import Shared
import { cn } from "@/src/app/lib/shared/utils";

// Function ปฏิทินเลือกวันที่ (captionLayout="dropdown" ได้ตัวเลือกเดือน/ปีและปุ่มเลื่อนเดือนของ DayPicker)
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  components,
  ...props
}: CalendarProps): React.JSX.Element {
  return (
    <div className="calendar-ui">
      <DayPicker
        showOutsideDays={showOutsideDays}
        className={cn("relative w-fit", className)}
        classNames={{
          months: "flex flex-col",
          month: "space-y-3",

          month_caption:
            "relative flex h-8 items-center justify-center px-8",
          dropdowns: "flex items-center gap-2",

          caption_label: "hidden",

          // แถบปุ่มเลื่อนเดือนวางทับแถวหัวเดือน ให้คลิกทะลุไปที่ dropdown ตรงกลางได้
          nav: "pointer-events-none absolute inset-x-0 top-0 flex h-8 items-center justify-between",
          button_previous:
            "pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-md bg-transparent p-0 text-[#1F2933] hover:bg-[#F3F4F6] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
          button_next:
            "pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-md bg-transparent p-0 text-[#1F2933] hover:bg-[#F3F4F6] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",

          weekdays: "mt-2 flex justify-between",
          weekday:
            "w-10 text-center text-[11px] font-medium text-[#9CA3AF]",

          week: "mt-1 flex justify-between",
          day: "h-10 w-10 p-0",
          day_button:
            "h-10 w-10 rounded-[10px] p-0 text-[14px] font-medium text-[#1F2933] hover:bg-[#F3F4F6]",

          range_start: "bg-[#2F3136] text-white rounded-[10px]",
          range_end: "bg-[#2F3136] text-white rounded-[10px]",
          range_middle: "bg-[#EEF2F7] text-[#1F2933] rounded-[10px]",
          selected: "bg-[#2F3136] text-white hover:bg-[#2F3136]",

          today: "font-semibold text-[#1F2933]",
          outside: "text-[#D1D5DB]",
          disabled: "text-[#D1D5DB] opacity-50",

          ...classNames,
        }}
        components={{
          Chevron: ({ orientation, className, ...iconProps }) =>
            orientation === "left" ? (
              <ChevronLeft
                className={cn("h-4 w-4", className)}
                {...iconProps}
              />
            ) : (
              <ChevronRight
                className={cn("h-4 w-4", className)}
                {...iconProps}
              />
            ),
          // DayPicker อ่านแค่ e.target.value จาก onChange ของ dropdown
          Dropdown: ({ options = [], value, onChange, disabled, "aria-label": ariaLabel }) => (
            <SelectField
              aria-label={ariaLabel}
              value={String(value)}
              disabled={disabled}
              onValueChange={(next) => onChange?.({ target: { value: next } } as React.ChangeEvent<HTMLSelectElement>)}
              options={options.map((option) => ({ value: String(option.value), label: option.label, disabled: option.disabled }))}
              className="h-8 rounded-md border border-[#D1D5DB] bg-white px-2 text-[13px] font-medium text-[#1F2933]"
            />
          ),
          ...components,
        }}
        {...props}
      />
    </div>
  )
}

export { Calendar };
