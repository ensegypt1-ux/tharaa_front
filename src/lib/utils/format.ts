import { format, formatDistanceToNow, parseISO } from "date-fns";
import { arSA } from "date-fns/locale";

const LOCALE = "ar-SA";

export function formatCurrency(value: number | string | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : value ?? 0;
  if (Number.isNaN(num)) {
    return new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency: "SAR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(0);
  }
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "٠";
  return new Intl.NumberFormat(LOCALE).format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "٠٪";
  return `${new Intl.NumberFormat(LOCALE, {
    maximumFractionDigits: 1,
  }).format(value)}٪`;
}

export function formatDate(
  value: string | Date | null | undefined,
  pattern = "d MMMM yyyy",
): string {
  if (!value) return "—";
  try {
    const date = typeof value === "string" ? parseISO(value) : value;
    return format(date, pattern, { locale: arSA });
  } catch {
    return "—";
  }
}

export function formatDateTime(value: string | Date | null | undefined): string {
  return formatDate(value, "d MMMM yyyy، HH:mm");
}

export function formatRelativeTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  try {
    const date = typeof value === "string" ? parseISO(value) : value;
    return formatDistanceToNow(date, { addSuffix: true, locale: arSA });
  } catch {
    return "—";
  }
}

export type SchedulePhase = "active" | "upcoming" | "expired" | "inactive";

export function getSchedulePhase(
  isActive: boolean,
  startsAt: string,
  endsAt: string,
  now = new Date(),
): SchedulePhase {
  if (!isActive) return "inactive";
  try {
    const start = parseISO(startsAt);
    const end = parseISO(endsAt);
    if (now < start) return "upcoming";
    if (now > end) return "expired";
    return "active";
  } catch {
    return "inactive";
  }
}

export function toDateInputValue(value: string | Date | null | undefined): string {
  if (!value) return "";
  try {
    const date = typeof value === "string" ? parseISO(value) : value;
    return format(date, "yyyy-MM-dd");
  } catch {
    return "";
  }
}

export function initials(name: string | null | undefined): string {
  if (!name) return "؟";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2);
  return `${parts[0][0]}${parts[parts.length - 1][0]}`;
}
