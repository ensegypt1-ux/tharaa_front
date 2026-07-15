"use client";

import { Star, StarHalf } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type StarFill = "full" | "half" | "empty";

function fillForStar(rating: number, index: number): StarFill {
  const value = rating - index;
  if (value >= 0.75) return "full";
  if (value >= 0.25) return "half";
  return "empty";
}

export function RatingStars({
  rating,
  size = "md",
  showValue = true,
  showCount = false,
  count,
  className,
}: {
  rating: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  showCount?: boolean;
  count?: number;
  className?: string;
}) {
  const iconClass =
    size === "sm" ? "size-3.5" : size === "lg" ? "size-5" : "size-4";
  const clamped = Math.max(0, Math.min(5, Number.isFinite(rating) ? rating : 0));
  const valueLabel = Number.isInteger(clamped) ? String(clamped) : clamped.toFixed(1);
  const aria =
    showCount && typeof count === "number"
      ? `${valueLabel} من 5، ${count} تقييم`
      : `${valueLabel} من 5`;

  return (
    <div
      className={cn("inline-flex items-center gap-1.5", className)}
      dir="ltr"
      aria-label={aria}
    >
      <div className="flex items-center gap-0.5 text-amber-500" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => {
          const fill = fillForStar(clamped, i);
          if (fill === "full") {
            return <Star key={i} className={iconClass} fill="currentColor" />;
          }
          if (fill === "half") {
            return <StarHalf key={i} className={iconClass} fill="currentColor" />;
          }
          return <Star key={i} className={cn(iconClass, "text-amber-200")} />;
        })}
      </div>
      {showValue && (
        <span
          className={cn(
            "font-medium text-charcoal ltr-field",
            size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm",
          )}
        >
          {valueLabel}
        </span>
      )}
      {showCount && typeof count === "number" && (
        <span
          className={cn(
            "text-charcoal-soft",
            size === "sm" ? "text-xs" : "text-sm",
          )}
        >
          ({count})
        </span>
      )}
    </div>
  );
}
