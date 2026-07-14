"use client";

import { Select, Input } from "./Input";
import { COMMON_AR } from "@/lib/ar/labels";

export type DateRangeValue = "today" | "last7Days" | "last30Days" | "thisMonth" | "custom";

export interface DateRangeState {
  range: DateRangeValue;
  from?: string;
  to?: string;
}

const OPTIONS: { value: DateRangeValue; label: string }[] = [
  { value: "today", label: "اليوم" },
  { value: "last7Days", label: "آخر 7 أيام" },
  { value: "last30Days", label: "آخر 30 يومًا" },
  { value: "thisMonth", label: "هذا الشهر" },
  { value: "custom", label: "نطاق مخصص" },
];

export function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateRangeState;
  onChange: (value: DateRangeState) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={value.range}
        onChange={(e) => onChange({ ...value, range: e.target.value as DateRangeValue })}
        className="w-44"
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
      {value.range === "custom" && (
        <>
          <Input
            type="date"
            value={value.from ?? ""}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            className="w-40 ltr-field"
          />
          <span className="text-sm text-charcoal-soft">{COMMON_AR.to}</span>
          <Input
            type="date"
            value={value.to ?? ""}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            className="w-40 ltr-field"
          />
        </>
      )}
    </div>
  );
}
