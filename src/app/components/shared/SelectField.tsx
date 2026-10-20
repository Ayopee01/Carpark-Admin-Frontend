"use client"
// Import Library
import type { JSX } from "react";
// Import Components
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/app/components/ui/select";
// Import Types
import type { SelectFieldProps } from "@/src/app/type/ui/shared";

/* -------------------------------------- Config -------------------------------------- */

// Config ค่าแทน "" (Radix Select ห้าม item มีค่าว่าง) เช่นตัวเลือก "ไม่ผูก" หรือ "เลือก..."
const EMPTY_VALUE = "__empty__";

/* -------------------------------------- Component -------------------------------------- */

// Function dropdown แทน <select> ของ browser ส่งค่าและ onValueChange แบบ string เหมือนเดิม
function SelectField({
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  id,
  "aria-label": ariaLabel,
  className,
  contentClassName,
}: SelectFieldProps): JSX.Element {
  const toItemValue = (optionValue: string) => (optionValue === "" ? EMPTY_VALUE : optionValue);
  const hasEmptyOption = options.some((option) => option.value === "");
  // ค่าว่างที่ไม่มีตัวเลือกค่าว่าง = ยังไม่เลือก แสดง placeholder
  const rootValue = value === "" && !hasEmptyOption ? "" : toItemValue(value);

  return (
    <Select
      value={rootValue}
      onValueChange={(next) => onValueChange(next === EMPTY_VALUE ? "" : next)}
      disabled={disabled}
    >
      <SelectTrigger id={id} aria-label={ariaLabel} className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={contentClassName}>
        {options.map((option) => (
          <SelectItem key={toItemValue(option.value)} value={toItemValue(option.value)} disabled={option.disabled}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { SelectField };
