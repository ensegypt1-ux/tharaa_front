import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { COMMON_AR } from "@/lib/ar/labels";

export function LoadingState({
  label = COMMON_AR.loading,
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 py-14 text-charcoal-soft", className)}>
      <Loader2 className="size-6 animate-spin text-amber-500" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function InlineSpinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-4 animate-spin", className)} />;
}

export function ErrorState({
  message = COMMON_AR.loadFailed,
  onRetry,
  variant = "error",
}: {
  message?: string;
  onRetry?: () => void;
  variant?: "error" | "network" | "forbidden";
}) {
  const styles =
    variant === "forbidden"
      ? "border-[var(--border-strong)] bg-cream text-charcoal"
      : variant === "network"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-red-200 bg-[var(--danger-soft)] text-danger";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-[var(--radius-xl)] border px-6 py-10 text-center",
        styles,
      )}
    >
      <p className="text-sm font-medium">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 text-sm font-medium text-amber-700 underline-offset-2 hover:underline"
        >
          {COMMON_AR.tryAgain}
        </button>
      )}
    </div>
  );
}
