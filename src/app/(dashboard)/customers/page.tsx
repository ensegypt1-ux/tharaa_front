"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Search, UserCheck, UserMinus, Users, UserX } from "lucide-react";
import { RequireRole } from "@/components/layout/RequireRole";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { FilterBar } from "@/components/ui/FilterBar";
import { StatCard } from "@/components/ui/StatCard";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { AccountStatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState, LoadingState } from "@/components/ui/LoadingState";
import { listCustomers } from "@/lib/api/customers";
import type { AccountStatus, CustomerListItem } from "@/lib/types";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils/format";
import { ACCOUNT_STATUS_AR, COMMON_AR } from "@/lib/ar/labels";

const STATUS_OPTIONS: AccountStatus[] = ["ACTIVE", "SUSPENDED", "INACTIVE"];

function CustomersPageInner() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<AccountStatus | "">("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const customersQuery = useQuery({
    queryKey: ["customers", { q, status, page }],
    queryFn: () => listCustomers({ page, limit, q: q || undefined, status: status || undefined }),
  });

  const statusCountQueries = useQueries({
    queries: STATUS_OPTIONS.map((s) => ({
      queryKey: ["customers-count", s],
      queryFn: () => listCustomers({ page: 1, limit: 1, status: s }),
      select: (data: Awaited<ReturnType<typeof listCustomers>>) => data.meta.total,
    })),
  });

  const totalAllQuery = useQuery({
    queryKey: ["customers-count", "all"],
    queryFn: () => listCustomers({ page: 1, limit: 1 }),
    select: (data) => data.meta.total,
  });

  const pageMetrics = useMemo(() => {
    const rows = customersQuery.data?.data ?? [];
    if (rows.length === 0) return null;
    const totalSpend = rows.reduce((sum, c) => sum + c.totalSpend, 0);
    const totalOrders = rows.reduce((sum, c) => sum + c.orderCount, 0);
    return {
      avgSpend: totalSpend / rows.length,
      avgOrders: totalOrders / rows.length,
    };
  }, [customersQuery.data?.data]);

  const columns: DataTableColumn<CustomerListItem>[] = [
    {
      key: "name",
      header: COMMON_AR.customer,
      render: (c) => (
        <div>
          <p className="font-medium text-charcoal">{c.fullName}</p>
          <p className="text-xs text-charcoal-soft ltr-field">{c.email ?? c.phone ?? "—"}</p>
        </div>
      ),
    },
    { key: "orders", header: "الطلبات", align: "center", render: (c) => formatNumber(c.orderCount) },
    { key: "spend", header: COMMON_AR.totalSpend, align: "end", render: (c) => formatCurrency(c.totalSpend) },
    { key: "lastOrder", header: COMMON_AR.lastOrder, render: (c) => formatDate(c.lastOrderAt) },
    { key: "status", header: COMMON_AR.status, render: (c) => <AccountStatusBadge status={c.status} /> },
    { key: "joined", header: COMMON_AR.joined, render: (c) => formatDate(c.createdAt) },
  ];

  const statusCounts = {
    ACTIVE: statusCountQueries[0].data ?? 0,
    SUSPENDED: statusCountQueries[1].data ?? 0,
    INACTIVE: statusCountQueries[2].data ?? 0,
  };

  return (
    <div className="page-shell animate-in">
      <PageHeader title="العملاء" description="تصفح ملفات العملاء وطلباتهم ونشاطهم." />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="إجمالي العملاء"
          value={
            totalAllQuery.data != null
              ? formatNumber(totalAllQuery.data)
              : customersQuery.data
                ? formatNumber(customersQuery.data.meta.total)
                : "—"
          }
          icon={Users}
          loading={totalAllQuery.isLoading}
        />
        <StatCard
          label={ACCOUNT_STATUS_AR.ACTIVE}
          value={formatNumber(statusCounts.ACTIVE)}
          icon={UserCheck}
          tone="green"
          loading={statusCountQueries[0].isLoading}
        />
        <StatCard
          label={ACCOUNT_STATUS_AR.SUSPENDED}
          value={formatNumber(statusCounts.SUSPENDED)}
          icon={UserX}
          tone="red"
          loading={statusCountQueries[1].isLoading}
        />
        <StatCard
          label={ACCOUNT_STATUS_AR.INACTIVE}
          value={formatNumber(statusCounts.INACTIVE)}
          icon={UserMinus}
          tone="charcoal"
          loading={statusCountQueries[2].isLoading}
        />
      </div>

      {pageMetrics && (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatCard
            label="متوسط الإنفاق (الصفحة الحالية)"
            value={formatCurrency(pageMetrics.avgSpend)}
            hint={`${customersQuery.data?.data.length ?? 0} عميل في هذه الصفحة`}
          />
          <StatCard
            label="متوسط الطلبات (الصفحة الحالية)"
            value={formatNumber(Math.round(pageMetrics.avgOrders * 10) / 10)}
            hint="للصفحة المعروضة فقط"
          />
        </div>
      )}

      <Card>
        <FilterBar>
          <div className="relative w-64">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-charcoal-soft" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="ابحث بالاسم أو البريد أو الجوال…"
              className="ps-9"
            />
          </div>
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as AccountStatus | "");
              setPage(1);
            }}
            className="w-40"
          >
            <option value="">كل الحالات</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {ACCOUNT_STATUS_AR[s]}
              </option>
            ))}
          </Select>
          {customersQuery.data && (
            <span className="ms-auto text-xs text-charcoal-soft">
              {formatNumber(customersQuery.data.meta.total)} نتيجة
              {status ? ` · ${ACCOUNT_STATUS_AR[status]}` : ""}
            </span>
          )}
        </FilterBar>

        {customersQuery.isLoading && <LoadingState />}
        {customersQuery.isError && (
          <ErrorState message="تعذر تحميل العملاء." onRetry={() => customersQuery.refetch()} />
        )}
        {customersQuery.data && customersQuery.data.data.length === 0 && (
          <EmptyState icon={Users} title="لم يتم العثور على عملاء" />
        )}
        {customersQuery.data && customersQuery.data.data.length > 0 && (
          <>
            <DataTable
              dense
              columns={columns}
              rows={customersQuery.data.data}
              rowKey={(c) => c.id}
              onRowClick={(c) => router.push(`/customers/${c.id}`)}
            />
            <Pagination
              page={page}
              totalPages={customersQuery.data.meta.totalPages}
              total={customersQuery.data.meta.total}
              limit={limit}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>
    </div>
  );
}

export default function CustomersPage() {
  return (
    <RequireRole navKey="customers">
      <CustomersPageInner />
    </RequireRole>
  );
}
