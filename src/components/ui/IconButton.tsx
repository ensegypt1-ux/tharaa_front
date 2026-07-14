import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

type Tone = "default" | "amber" | "danger";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone;
  size?: "sm" | "md";
  label: string;
}

const toneClass: Record<Tone, string> = {
  default: "text-charcoal-soft hover:bg-cream hover:text-charcoal",
  amber: "text-charcoal-soft hover:bg-amber-50 hover:text-amber-700",
  danger: "text-charcoal-soft hover:bg-red-50 hover:text-danger",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, tone = "default", size = "md", label, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center rounded-[var(--radius-md)] transition duration-[var(--duration-fast)] focus-visible:ring-2 focus-visible:ring-amber-400 disabled:opacity-50",
        size === "sm" ? "size-8" : "size-9",
        toneClass[tone],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
);

IconButton.displayName = "IconButton";
