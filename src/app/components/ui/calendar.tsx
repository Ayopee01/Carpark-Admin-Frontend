"use client"
// Import Library
import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
// Import Types
import type { CalendarProps } from "@/src/app/type/ui/shared";
// Import Shared
import { cn } from "@/src/app/lib/shared/utils";

// Function ปฏิทินเลือกวันที่
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
        className={cn("w-fit", className)}
        classNames={{
          months: "flex flex-col",
          month: "space-y-3",

          month_caption:
            "relative flex h-8 items-center justify-center px-8",
          dropdowns: "flex items-center gap-2",

          dropdown_root: "relative",
          dropdown:
            "h-8 rounded-md border border-[#D1D5DB] bg-white px-2 pr-7 text-[12px] font-medium text-[#1F2933] outline-none",

          caption_label: "hidden",

          nav: "absolute inset-0 flex items-center justify-between",
          button_previous:
            "inline-flex h-8 w-8 items-center justify-center rounded-md bg-transparent p-0 text-[#1F2933] hover:bg-[#F3F4F6]",
          button_next:
            "inline-flex h-8 w-8 items-center justify-center rounded-md bg-transparent p-0 text-[#1F2933] hover:bg-[#F3F4F6]",

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
          ...components,
        }}
        {...props}
      />
    </div>
  )
}

export { Calendar };
