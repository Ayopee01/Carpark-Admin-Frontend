// Import Library
import type { DateRange, DayPicker } from "react-day-picker";
import type { ComponentProps, ReactNode } from "react";

/* -------------------------------------- Shared Component Types -------------------------------------- */

// Type ค่าวันที่ที่รับได้ (Date หรือ string จาก API)
export type DateInput = Date | string | null | undefined

// Type props ของตัวเลือกช่วงวันที่
export type DateRangeFilterProps = {
    value?: DateRange
    onChange: (range: DateRange | undefined) => void

    // วันที่เก่าสุดที่มีใน API เช่น 2026-04-01
    minDate?: DateInput

    // วันที่ล่าสุดที่มีใน API ไม่ส่ง = วันนี้
    maxDate?: DateInput
}

// Type props ของหน้าโหลด
export type LoadingScreenProps = {
    open?: boolean;
    progress?: number;
    message?: string;
    detail?: string;
    fullscreen?: boolean;
};

// Type props ของแถบสัดส่วน
export type ProgressBarProps = {
    value: number;
    colorClass?: string;
    trackClass?: string;
    heightClass?: string;
};

// Type props ของการ์ดตัวเลขหนึ่งค่า
export type SummaryCardProps = {
    title: string;
    value: string;
    suffix?: string;
    note: string;
    noteIcon?: ReactNode;
    icon: ReactNode;
};

// Type props ของการ์ดรายได้ตามกลุ่ม
export type RevenueGroupCardProps = {
    title: string;
    description: string;
    amountText: string;
    percent: number;
    icon: ReactNode;
};

// Type props ของปฏิทิน (เท่ากับ props ของ DayPicker)
export type CalendarProps = ComponentProps<typeof DayPicker>;

// Type ตัวเลือกหนึ่งรายการของ SelectField (value "" ใช้ได้)
export type SelectFieldOption = { value: string; label: ReactNode; disabled?: boolean };

// Type props ของ SelectField (dropdown แทน <select> ของ browser)
export type SelectFieldProps = {
    value: string;
    onValueChange: (value: string) => void;
    options: readonly SelectFieldOption[];
    placeholder?: string; // แสดงเมื่อค่าไม่ตรงกับตัวเลือกใด
    disabled?: boolean;
    id?: string;
    "aria-label"?: string;
    className?: string; // หน้าตาของปุ่ม (เหมือน className ของ <select> เดิม)
    contentClassName?: string;
};

// Type คำถามของ dialog ยืนยัน (useConfirm แทน window.confirm)
export type ConfirmOptions = {
    title: string;
    description?: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean; // ปุ่มยืนยันสีแดง เช่น ลบ
};
