import { cn } from "@/lib/utils/cn";
import {
  ACCOUNT_STATUS_AR,
  COMMON_AR,
  ORDER_STATUS_AR,
  REVIEW_STATUS_AR,
  ROLE_AR,
  SCHEDULE_PHASE_AR,
  STOCK_STATUS_AR,
  labelOf,
} from "@/lib/ar/labels";
import type { SchedulePhase } from "@/lib/utils/format";

type Tone = "amber" | "green" | "red" | "blue" | "gray" | "charcoal";

const toneClasses: Record<Tone, string> = {
  amber: "bg-amber-100 text-amber-800 border-amber-200",
  green: "bg-green-50 text-success border-green-200",
  red: "bg-red-50 text-danger border-red-200",
  blue: "bg-blue-50 text-info border-blue-200",
  gray: "bg-cream text-charcoal-soft border-border-soft",
  charcoal: "bg-charcoal text-cream border-charcoal",
};

const ORDER_STATUS_TONE: Record<string, Tone> = {
  PENDING: "amber",
  CONFIRMED: "blue",
  PREPARING: "amber",
  READY: "green",
  OUT_FOR_DELIVERY: "blue",
  COMPLETED: "green",
  CANCELLED: "red",
};

const REVIEW_STATUS_TONE: Record<string, Tone> = {
  PENDING: "amber",
  APPROVED: "green",
  REJECTED: "red",
};

const ACCOUNT_STATUS_TONE: Record<string, Tone> = {
  ACTIVE: "green",
  INACTIVE: "gray",
  SUSPENDED: "red",
};

const STOCK_TONE: Record<string, Tone> = {
  IN_STOCK: "green",
  LOW: "amber",
  OUT: "red",
};

const SCHEDULE_PHASE_TONE: Record<SchedulePhase, Tone> = {
  active: "green",
  upcoming: "blue",
  expired: "gray",
  inactive: "red",
};

export function Badge({
  tone = "gray",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function OrderStatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={ORDER_STATUS_TONE[status] ?? "gray"}>
      {labelOf(ORDER_STATUS_AR, status)}
    </Badge>
  );
}

export function ReviewStatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={REVIEW_STATUS_TONE[status] ?? "gray"}>
      {labelOf(REVIEW_STATUS_AR, status)}
    </Badge>
  );
}

export function AccountStatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={ACCOUNT_STATUS_TONE[status] ?? "gray"}>
      {labelOf(ACCOUNT_STATUS_AR, status)}
    </Badge>
  );
}

export function StockStatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={STOCK_TONE[status] ?? "gray"}>
      {labelOf(STOCK_STATUS_AR, status)}
    </Badge>
  );
}

export function SchedulePhaseBadge({ phase }: { phase: SchedulePhase }) {
  return (
    <Badge tone={SCHEDULE_PHASE_TONE[phase]}>
      {labelOf(SCHEDULE_PHASE_AR, phase)}
    </Badge>
  );
}

export function BooleanBadge({
  value,
  trueLabel = COMMON_AR.active,
  falseLabel = COMMON_AR.inactive,
}: {
  value: boolean;
  trueLabel?: string;
  falseLabel?: string;
}) {
  return <Badge tone={value ? "green" : "gray"}>{value ? trueLabel : falseLabel}</Badge>;
}

export function RoleBadge({ role }: { role: string }) {
  const tone: Tone = role === "ADMIN" ? "charcoal" : role === "MANAGER" ? "amber" : "blue";
  return <Badge tone={tone}>{labelOf(ROLE_AR, role)}</Badge>;
}
