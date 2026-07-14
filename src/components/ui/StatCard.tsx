import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import type { LucideIcon } from "lucide-react";
import { Skeleton } from "./Skeleton";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "amber",
  href,
  trend,
  loading,
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  hint?: React.ReactNode;
  tone?: "amber" | "charcoal" | "green" | "red" | "info";
  href?: string;
  trend?: { label: string; positive?: boolean };
  loading?: boolean;
  className?: string;
}) {
  const iconTone: Record<string, string> = {
    amber: "bg-amber-100 text-amber-700",
    charcoal: "bg-charcoal text-cream",
    green: "bg-[var(--success-soft)] text-success",
    red: "bg-[var(--danger-soft)] text-danger",
    info: "bg-[var(--info-soft)] text-info",
  };

  const content = (
    <div
      className={cn(
        "rounded-[var(--radius-xl)] border border-border-soft bg-surface p-4 shadow-[var(--shadow-xs)] transition duration-[var(--duration-fast)]",
        href && "hover:border-amber-200 hover:shadow-[var(--shadow-sm)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-charcoal-soft">{label}</p>
          {loading ? (
            <>
              <Skeleton className="mt-2 h-7 w-24" />
              <Skeleton className="mt-2 h-3 w-20" />
            </>
          ) : (
            <>
              <p className="mt-1.5 text-2xl font-semibold tracking-tight text-charcoal">{value}</p>
              {(hint || trend) && (
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-charcoal-soft">
                  {trend && (
                    <span className={cn(trend.positive ? "text-success" : "text-danger")}>{trend.label}</span>
                  )}
                  {hint && <span>{hint}</span>}
                </div>
              )}
            </>
          )}
        </div>
        {Icon && (
          <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)]", iconTone[tone])}>
            <Icon className="size-[18px]" />
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block focus-visible:rounded-[var(--radius-xl)]">
        {content}
      </Link>
    );
  }

  return content;
}
