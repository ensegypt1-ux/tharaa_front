import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { COMMON_AR } from "@/lib/ar/labels";

export function EmptyState({
  icon: Icon = Inbox,
  title = COMMON_AR.noResults,
  description,
  action,
}: {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-xl)] border border-dashed border-border-soft bg-cream/50 px-6 py-14 text-center">
      <div className="mb-1 flex size-12 items-center justify-center rounded-[var(--radius-md)] bg-amber-100 text-amber-700">
        <Icon className="size-6" />
      </div>
      <p className="text-base font-medium text-charcoal">{title}</p>
      {description && <p className="max-w-sm text-sm text-charcoal-soft">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
