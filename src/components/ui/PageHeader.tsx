import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface Breadcrumb {
  label: string;
  href?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  stickyActions,
}: {
  title: React.ReactNode;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
  stickyActions?: boolean;
}) {
  return (
    <div
      className={cn(
        "mb-5 flex flex-wrap items-start justify-between gap-4",
        stickyActions && "sticky top-[var(--header-h)] z-20 -mx-1 mb-5 rounded-[var(--radius-lg)] bg-cream/90 px-1 py-2 backdrop-blur",
      )}
    >
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="mb-1.5 flex flex-wrap items-center gap-1 text-xs text-charcoal-soft" aria-label="مسار التنقل">
            {breadcrumbs.map((crumb, idx) => (
              <span key={`${crumb.label}-${idx}`} className="flex items-center gap-1">
                {idx > 0 && <ChevronLeft className="size-3 shrink-0 opacity-70" aria-hidden />}
                {crumb.href ? (
                  <Link href={crumb.href} className="transition hover:text-amber-700">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-charcoal">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-charcoal">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-charcoal-soft">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
