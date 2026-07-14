import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-[var(--control-h-md)] w-full rounded-[var(--radius-md)] border border-border-soft bg-surface px-3 text-sm text-charcoal placeholder:text-charcoal-soft/60 outline-none transition duration-[var(--duration-fast)] focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:cursor-not-allowed disabled:bg-cream disabled:text-charcoal-soft",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-charcoal placeholder:text-charcoal-soft/60 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:bg-cream disabled:text-charcoal-soft",
        className,
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        "h-[var(--control-h-md)] w-full rounded-[var(--radius-md)] border border-border-soft bg-surface px-3 text-sm text-charcoal outline-none transition duration-[var(--duration-fast)] focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:cursor-not-allowed disabled:bg-cream disabled:text-charcoal-soft",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});
Select.displayName = "Select";

export function Label({
  className,
  required,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label
      className={cn("mb-1.5 block text-sm font-medium text-charcoal", className)}
      {...props}
    >
      {children}
      {required && <span className="me-0.5 text-danger">*</span>}
    </label>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-danger">{message}</p>;
}

export function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-charcoal-soft">{children}</p>;
}
