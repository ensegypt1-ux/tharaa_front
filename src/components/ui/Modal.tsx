"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const sizeClasses: Record<string, string> = {
    sm: "sm:max-w-md",
    md: "sm:max-w-xl",
    lg: "sm:max-w-3xl",
    xl: "sm:max-w-5xl",
    full: "sm:max-w-6xl",
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-charcoal/40 p-0 sm:items-center sm:p-4">
      <div
        className={cn(
          "flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col overflow-hidden rounded-none bg-surface shadow-xl sm:h-auto sm:max-h-[92dvh] sm:rounded-2xl",
          sizeClasses[size],
        )}
        role="dialog"
        aria-modal="true"
      >
        {title && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border-soft px-4 py-3 sm:px-5 sm:py-4">
            <h3 className="min-w-0 flex-1 font-display text-base font-medium text-charcoal sm:text-lg">
              {title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="flex size-10 shrink-0 items-center justify-center rounded-full text-charcoal-soft hover:bg-cream sm:size-8"
              aria-label="إغلاق"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5">
          {children}
        </div>
        {footer && (
          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-5 sm:py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
