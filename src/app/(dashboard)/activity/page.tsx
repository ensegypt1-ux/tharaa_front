"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, ChevronDown, ChevronUp, Search } from "lucide-react";
import { RequireRole } from "@/components/layout/RequireRole";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { FilterBar } from "@/components/ui/FilterBar";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState, LoadingState } from "@/components/ui/LoadingState";
import { Badge } from "@/components/ui/StatusBadge";
import { listAuditLogs } from "@/lib/api/audit";
import type { AuditLogEntry } from "@/lib/types";
import { formatDateTime } from "@/lib/utils/format";
import { COMMON_AR, ROLE_AR, labelOf } from "@/lib/ar/labels";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function formatDiffValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function DiffPanel({
  title,
  tone,
  data,
}: {
  title: string;
  tone: "before" | "after";
  data: unknown;
}) {
  const toneClass =
    tone === "before"
      ? "border-red-200 bg-red-50/50"
      : "border-green-200 bg-green-50/50";

  if (isPlainObject(data)) {
    const entries = Object.entries(data);
    return (
      <div className={`rounded-[var(--radius-lg)] border ${toneClass} p-3`}>
        <p className="mb-2 text-xs font-semibold text-charcoal">{title}</p>
        {entries.length === 0 ? (
          <p className="text-xs text-charcoal-soft">لا توجد قيم</p>
        ) : (
          <dl className="space-y-1.5">
            {entries.map(([key, value]) => (
              <div key={key} className="grid grid-cols-[minmax(0,38%)_1fr] gap-2 text-xs">
                <dt className="truncate font-medium text-charcoal-soft ltr-field">{key}</dt>
                <dd className="break-all text-charcoal ltr-field">{formatDiffValue(value)}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-[var(--radius-lg)] border ${toneClass} p-3`}>
      <p className="mb-2 text-xs font-semibold text-charcoal">{title}</p>
      <pre className="scrollbar-thin max-h-52 overflow-auto text-xs text-charcoal ltr-field">
        {formatDiffValue(data)}
      </pre>
    </div>
  );
}

function DiffView({ previousValues, newValues }: { previousValues: unknown; newValues: unknown }) {
  const changedKeys = useMemo(() => {
    if (!isPlainObject(previousValues) || !isPlainObject(newValues)) return null;
    const keys = new Set([...Object.keys(previousValues), ...Object.keys(newValues)]);
    return [...keys].filter((key) => {
      return JSON.stringify(previousValues[key]) !== JSON.stringify(newValues[key]);
    });
  }, [previousValues, newValues]);

  if (changedKeys && changedKeys.length > 0) {
    const before = Object.fromEntries(changedKeys.map((k) => [k, (previousValues as Record<string, unknown>)[k]]));
    const after = Object.fromEntries(changedKeys.map((k) => [k, (newValues as Record<string, unknown>)[k]]));
    return (
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <DiffPanel title="قبل" tone="before" data={before} />
        <DiffPanel title="بعد" tone="after" data={after} />
      </div>
    );
  }

  return (
    <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
      {previousValues != null && <DiffPanel title="قبل" tone="before" data={previousValues} />}
      {newValues != null && <DiffPanel title="بعد" tone="after" data={newValues} />}
    </div>
  );
}

function AuditRow({ entry }: { entry: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const hasDiff = Boolean(entry.previousValues || entry.newValues);

  return (
    <li className="px-5 py-3.5">
      <button
        type="button"
        onClick={() => hasDiff && setExpanded((e) => !e)}
        className="flex w-full items-center justify-between gap-3 text-start"
        disabled={!hasDiff}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="amber">{entry.action.replaceAll("_", " ")}</Badge>
            <span className="text-sm font-medium text-charcoal">{entry.entityType}</span>
            {entry.entityId && (
              <span className="text-xs text-charcoal-soft ltr-field">#{entry.entityId.slice(0, 8)}</span>
            )}
          </div>
          <p className="mt-1 text-xs text-charcoal-soft">
            {entry.userEmail ?? COMMON_AR.system}{" "}
            {entry.userRole ? `(${labelOf(ROLE_AR, entry.userRole)})` : ""} · {formatDateTime(entry.createdAt)}
          </p>
        </div>
        {hasDiff &&
          (expanded ? (
            <ChevronUp className="size-4 shrink-0 text-charcoal-soft" />
          ) : (
            <ChevronDown className="size-4 shrink-0 text-charcoal-soft" />
          ))}
      </button>
      {expanded && hasDiff && (
        <DiffView previousValues={entry.previousValues} newValues={entry.newValues} />
      )}
    </li>
  );
}

function ActivityPageInner() {
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [page, setPage] = useState(1);
  const limit = 25;

  const logsQuery = useQuery({
    queryKey: ["audit-logs", { action, entityType, page }],
    queryFn: () => listAuditLogs({ page, limit, action: action || undefined, entityType: entityType || undefined }),
  });

  return (
    <div className="page-shell animate-in">
      <PageHeader title="سجل النشاط" description="سجل إجراءات الإدارة في النظام." />

      <Card>
        <FilterBar>
          <div className="relative w-52">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-charcoal-soft" />
            <Input
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
              placeholder="تصفية حسب الإجراء…"
              className="ps-9"
            />
          </div>
          <div className="relative w-52">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-charcoal-soft" />
            <Input
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value);
                setPage(1);
              }}
              placeholder="تصفية حسب نوع العنصر…"
              className="ps-9"
            />
          </div>
          {logsQuery.data && (
            <span className="ms-auto text-xs text-charcoal-soft">{logsQuery.data.meta.total} سجل</span>
          )}
        </FilterBar>

        {logsQuery.isLoading && <LoadingState />}
        {logsQuery.isError && (
          <ErrorState message="تعذر تحميل سجل النشاط." onRetry={() => logsQuery.refetch()} />
        )}
        {logsQuery.data && logsQuery.data.data.length === 0 && (
          <EmptyState icon={Activity} title="لا يوجد نشاط مسجل" />
        )}
        {logsQuery.data && logsQuery.data.data.length > 0 && (
          <>
            <ul className="divide-y divide-border-soft">
              {logsQuery.data.data.map((entry) => (
                <AuditRow key={entry.id} entry={entry} />
              ))}
            </ul>
            <Pagination
              page={page}
              totalPages={logsQuery.data.meta.totalPages}
              total={logsQuery.data.meta.total}
              limit={limit}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>
    </div>
  );
}

export default function ActivityPage() {
  return (
    <RequireRole navKey="activity">
      <ActivityPageInner />
    </RequireRole>
  );
}
