import { Label, FieldError, FieldHint } from "./Input";
import { cn } from "@/lib/utils/cn";

export function FormField({
  label,
  required,
  error,
  hint,
  className,
  children,
}: {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      {label && <Label required={required}>{label}</Label>}
      {children}
      <FieldError message={error} />
      {hint && !error && <FieldHint>{hint}</FieldHint>}
    </div>
  );
}

export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4 rounded-[var(--radius-xl)] border border-border-soft bg-surface p-5 shadow-[var(--shadow-xs)]", className)}>
      <div>
        <h3 className="text-base font-semibold text-charcoal">{title}</h3>
        {description && <p className="mt-1 text-sm text-charcoal-soft">{description}</p>}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}
