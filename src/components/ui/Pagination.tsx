import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { COMMON_AR } from "@/lib/ar/labels";
import { formatNumber } from "@/lib/utils/format";

export function Pagination({
  page,
  totalPages,
  onPageChange,
  total,
  limit,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  total?: number;
  limit?: number;
}) {
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const from = total !== undefined && limit ? (page - 1) * limit + 1 : undefined;
  const to = total !== undefined && limit ? Math.min(page * limit, total) : undefined;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-soft px-5 py-3">
      <p className="text-xs text-charcoal-soft">
        {total !== undefined ? (
          <>
            {COMMON_AR.showing}{" "}
            <span className="font-medium text-charcoal">{formatNumber(from)}</span>–
            <span className="font-medium text-charcoal">{formatNumber(to)}</span> {COMMON_AR.of}{" "}
            <span className="font-medium text-charcoal">{formatNumber(total)}</span>
          </>
        ) : (
          <>
            {COMMON_AR.page} {formatNumber(page)} {COMMON_AR.of} {formatNumber(totalPages || 1)}
          </>
        )}
      </p>
      <div className="flex items-center gap-1">
        {/* In RTL: previous is on the right visually; ChevronRight points toward previous page */}
        <button
          onClick={() => canPrev && onPageChange(page - 1)}
          disabled={!canPrev}
          aria-label={COMMON_AR.previous}
          className={cn(
            "flex size-8 items-center justify-center rounded-lg border border-border-soft text-charcoal-soft transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40",
          )}
          type="button"
        >
          <ChevronRight className="size-4" />
        </button>
        <span className="min-w-16 text-center text-sm font-medium text-charcoal">
          {formatNumber(page)} / {formatNumber(totalPages || 1)}
        </span>
        <button
          onClick={() => canNext && onPageChange(page + 1)}
          disabled={!canNext}
          aria-label={COMMON_AR.next}
          className="flex size-8 items-center justify-center rounded-lg border border-border-soft text-charcoal-soft transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40"
          type="button"
        >
          <ChevronLeft className="size-4" />
        </button>
      </div>
    </div>
  );
}
