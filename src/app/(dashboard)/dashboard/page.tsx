"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Banknote,
  ClipboardList,
  ShoppingCart,
  TrendingUp,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { DateRangeFilter, type DateRangeState } from "@/components/ui/DateRangeFilter";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { ErrorState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { getAnalyticsCharts, getAnalyticsOverview } from "@/lib/api/analytics";
import type { AnalyticsCharts, OrderStatus } from "@/lib/types";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
} from "@/lib/utils/format";
import { COMMON_AR, ORDER_STATUS_AR, labelOf } from "@/lib/ar/labels";

const CHART_COLORS = ["#f5a623", "#2a241d", "#3f7a4f", "#2f6fa8", "#c0442c", "#dd8a0e", "#8b6914"];

function ChartSkeleton() {
  return (
    <div className="space-y-3 py-2" aria-hidden>
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-[260px] w-full rounded-[var(--radius-md)]" />
    </div>
  );
}

function formatChartDate(value: string): string {
  return formatDate(value, "d MMM");
}

function overviewStatusRows(
  ordersByStatus?: Partial<Record<OrderStatus, number>>,
): { status: OrderStatus; count: number; statusLabel: string }[] {
  if (!ordersByStatus) return [];
  return Object.entries(ordersByStatus)
    .filter(([, count]) => (count ?? 0) > 0)
    .map(([status, count]) => ({
      status: status as OrderStatus,
      count: count ?? 0,
      statusLabel: labelOf(ORDER_STATUS_AR, status),
    }));
}

export default function DashboardOverviewPage() {
  const [range, setRange] = useState<DateRangeState>({ range: "last30Days" });

  const queryParams = useMemo(
    () => ({
      range: range.range,
      from: range.range === "custom" ? range.from : undefined,
      to: range.range === "custom" ? range.to : undefined,
    }),
    [range],
  );

  const rangeReady = range.range !== "custom" || Boolean(range.from && range.to);

  const overviewQuery = useQuery({
    queryKey: ["analytics-overview", queryParams],
    queryFn: () => getAnalyticsOverview(queryParams),
    enabled: rangeReady,
  });

  const chartsQuery = useQuery({
    queryKey: ["analytics-charts", queryParams],
    queryFn: () => getAnalyticsCharts(queryParams),
    enabled: rangeReady,
  });

  const summary = overviewQuery.data?.summary;
  const charts = chartsQuery.data;

  const revenueSeries = useMemo(() => {
    const source =
      charts?.revenueOverTime ?? charts?.revenueByDay ?? charts?.dailySales ?? [];
    return source.map((row) => ({
      date: row.date,
      dateLabel: formatChartDate(row.date),
      sales: row.sales,
    }));
  }, [charts]);

  const ordersSeries = useMemo(() => {
    const source =
      charts?.ordersOverTime ??
      charts?.dailySales?.map((d) => ({ date: d.date, orders: d.orders })) ??
      [];
    return source.map((row) => ({
      date: row.date,
      dateLabel: formatChartDate(row.date),
      orders: row.orders,
    }));
  }, [charts]);

  const statusChartData = useMemo(() => {
    const fromOverview = overviewStatusRows(summary?.ordersByStatus);
    if (fromOverview.length > 0) return fromOverview;
    return (charts?.ordersByStatus ?? []).map((row) => ({
      ...row,
      statusLabel: labelOf(ORDER_STATUS_AR, row.status),
    }));
  }, [summary?.ordersByStatus, charts?.ordersByStatus]);

  const newCustomersSeries = useMemo(
    () =>
      (charts?.newCustomersOverTime ?? []).map((row) => ({
        ...row,
        dateLabel: formatChartDate(row.date),
      })),
    [charts?.newCustomersOverTime],
  );

  const productColumns: DataTableColumn<AnalyticsCharts["topSellingProducts"][number]>[] = useMemo(
    () => [
      {
        key: "nameAr",
        header: COMMON_AR.nameAr,
        render: (row) => <span className="font-medium text-charcoal">{row.nameAr}</span>,
      },
      {
        key: "nameEn",
        header: COMMON_AR.nameEn,
        render: (row) => <span className="text-sm text-charcoal-soft ltr-field">{row.nameEn}</span>,
      },
      {
        key: "quantity",
        header: "الكمية المباعة",
        render: (row) => <span className="tabular-nums">{formatNumber(row.quantity)}</span>,
      },
      {
        key: "revenue",
        header: "الإيراد",
        render: (row) => (
          <span className="tabular-nums font-medium">{formatCurrency(row.revenue)}</span>
        ),
      },
    ],
    [],
  );

  const categoryColumns: DataTableColumn<AnalyticsCharts["topCategories"][number]>[] = useMemo(
    () => [
      {
        key: "nameAr",
        header: COMMON_AR.nameAr,
        render: (row) => <span className="font-medium text-charcoal">{row.nameAr}</span>,
      },
      {
        key: "nameEn",
        header: COMMON_AR.nameEn,
        render: (row) => <span className="text-sm text-charcoal-soft ltr-field">{row.nameEn}</span>,
      },
      {
        key: "quantity",
        header: "الكمية المباعة",
        render: (row) => <span className="tabular-nums">{formatNumber(row.quantity)}</span>,
      },
      {
        key: "revenue",
        header: "الإيراد",
        render: (row) => (
          <span className="tabular-nums font-medium">{formatCurrency(row.revenue)}</span>
        ),
      },
    ],
    [],
  );

  const rangeLabel =
    overviewQuery.data?.range &&
    `${formatDateTime(overviewQuery.data.range.from)} — ${formatDateTime(overviewQuery.data.range.to)}`;

  const isLoading = overviewQuery.isLoading || chartsQuery.isLoading;
  const hasError = overviewQuery.isError || chartsQuery.isError;

  return (
    <div className="page-shell animate-in min-w-0 overflow-x-hidden">
      <PageHeader
        title="لوحة التحليلات"
        description={
          rangeLabel
            ? `ملخص الأداء للفترة: ${rangeLabel}`
            : "ملخص الأداء التشغيلي والمالي للفترة المحددة."
        }
        actions={<DateRangeFilter value={range} onChange={setRange} />}
      />

      {!rangeReady && (
        <Card className="mb-4">
          <CardBody className="py-6 text-sm text-charcoal-soft">
            اختر تاريخ البداية والنهاية للنطاق المخصص.
          </CardBody>
        </Card>
      )}

      {hasError && (
        <ErrorState
          message={COMMON_AR.loadFailed}
          onRetry={() => {
            void overviewQuery.refetch();
            void chartsQuery.refetch();
          }}
        />
      )}

      {/* Summary cards */}
      <section className="mb-6">
        <h2 className="mb-3 text-base font-semibold text-charcoal">ملخص الفترة</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {isLoading &&
            Array.from({ length: 8 }).map((_, i) => (
              <StatCard key={i} label="…" value="" loading />
            ))}
          {summary && (
            <>
              <StatCard
                label="إجمالي الإيراد للفترة"
                value={formatCurrency(summary.totalRevenue ?? summary.totalSales)}
                icon={Banknote}
                hint="من الطلبات المكتملة ضمن النطاق"
              />
              <StatCard
                label="الطلبات المكتملة في الفترة"
                value={formatNumber(summary.ordersInRange)}
                icon={ClipboardList}
                hint="عدد الطلبات المكتملة ضمن النطاق"
              />
              <StatCard
                label="متوسط قيمة الطلب"
                value={formatCurrency(summary.averageOrderValue)}
                icon={TrendingUp}
              />
              <StatCard
                label="العملاء الجدد في الفترة"
                value={formatNumber(summary.newCustomers)}
                icon={Users}
                tone="green"
              />
              <StatCard
                label="طلبات اليوم"
                value={formatNumber(summary.ordersToday)}
                icon={ShoppingCart}
              />
              <StatCard
                label="إيراد اليوم"
                value={formatCurrency(summary.revenueToday ?? summary.salesToday)}
                icon={Banknote}
              />
              <StatCard
                label="إيراد هذا الأسبوع"
                value={formatCurrency(summary.revenueThisWeek ?? summary.salesThisWeek)}
                icon={Banknote}
              />
              <StatCard
                label="إيراد هذا الشهر"
                value={formatCurrency(summary.revenueThisMonth ?? summary.salesThisMonth)}
                icon={Banknote}
              />
            </>
          )}
        </div>
      </section>

      {/* Revenue analytics */}
      <section className="mb-6">
        <h2 className="mb-3 text-base font-semibold text-charcoal">تحليلات الإيراد</h2>
        <Card>
          <CardHeader>
            <CardTitle>الإيراد بمرور الوقت</CardTitle>
          </CardHeader>
          <CardBody>
            {chartsQuery.isLoading ? (
              <ChartSkeleton />
            ) : chartsQuery.isError ? (
              <ErrorState message="تعذر تحميل بيانات الإيراد." onRetry={() => chartsQuery.refetch()} />
            ) : revenueSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueSeries}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f5a623" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f5a623" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ece3d3" />
                  <XAxis
                    dataKey="dateLabel"
                    tick={{ fontSize: 11 }}
                    interval="preserveStartEnd"
                    minTickGap={24}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    width={88}
                    orientation="right"
                    tickFormatter={(v) => formatNumber(Number(v))}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value ?? 0))}
                    labelFormatter={(_, payload) => {
                      const row = payload?.[0]?.payload as { date?: string } | undefined;
                      return row?.date ? formatDate(row.date) : "";
                    }}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #ece3d3",
                      fontFamily: "inherit",
                      direction: "rtl",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    name="الإيراد"
                    stroke="#dd8a0e"
                    fill="url(#revenueGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title={COMMON_AR.noData} description="لا توجد مبيعات مكتملة في هذه الفترة." />
            )}
          </CardBody>
        </Card>
      </section>

      {/* Orders analytics */}
      <section className="mb-6">
        <h2 className="mb-3 text-base font-semibold text-charcoal">تحليلات الطلبات</h2>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>الطلبات بمرور الوقت</CardTitle>
              {charts?.cancellationRate != null && (
                <span className="text-xs text-charcoal-soft">
                  معدل الإلغاء: {formatPercent(charts.cancellationRate)}
                </span>
              )}
            </CardHeader>
            <CardBody>
              {chartsQuery.isLoading ? (
                <ChartSkeleton />
              ) : chartsQuery.isError ? (
                <ErrorState message="تعذر تحميل بيانات الطلبات." onRetry={() => chartsQuery.refetch()} />
              ) : ordersSeries.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={ordersSeries}>
                    <defs>
                      <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2a241d" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#2a241d" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ece3d3" />
                    <XAxis
                      dataKey="dateLabel"
                      tick={{ fontSize: 11 }}
                      interval="preserveStartEnd"
                      minTickGap={24}
                    />
                    <YAxis tick={{ fontSize: 11 }} width={48} orientation="right" />
                    <Tooltip
                      formatter={(value) => [formatNumber(Number(value ?? 0)), "الطلبات"]}
                      labelFormatter={(_, payload) => {
                        const row = payload?.[0]?.payload as { date?: string } | undefined;
                        return row?.date ? formatDate(row.date) : "";
                      }}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #ece3d3",
                        fontFamily: "inherit",
                        direction: "rtl",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="orders"
                      name="الطلبات"
                      stroke="#2a241d"
                      fill="url(#ordersGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title={COMMON_AR.noOrders} />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>توزيع الطلبات حسب الحالة</CardTitle>
              {charts?.cancellationRate != null && (
                <span className="text-xs text-charcoal-soft">
                  معدل الإلغاء للفترة: {formatPercent(charts.cancellationRate)}
                </span>
              )}
            </CardHeader>
            <CardBody>
              {overviewQuery.isLoading && chartsQuery.isLoading ? (
                <ChartSkeleton />
              ) : statusChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={statusChartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ece3d3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="statusLabel"
                      tick={{ fontSize: 11 }}
                      width={110}
                    />
                    <Tooltip
                      formatter={(value) => [formatNumber(Number(value ?? 0)), "العدد"]}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #ece3d3",
                        fontFamily: "inherit",
                        direction: "rtl",
                      }}
                    />
                    <Bar dataKey="count" name="العدد" radius={[0, 6, 6, 0]}>
                      {statusChartData.map((_, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title={COMMON_AR.noOrders} />
              )}
            </CardBody>
          </Card>
        </div>
      </section>

      {/* Product analytics */}
      <section className="mb-6">
        <h2 className="mb-3 text-base font-semibold text-charcoal">تحليلات المنتجات</h2>
        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>المنتجات الأكثر مبيعًا</CardTitle>
          </CardHeader>
          {chartsQuery.isLoading ? (
            <CardBody>
              <Skeleton className="h-48 w-full rounded-[var(--radius-md)]" />
            </CardBody>
          ) : chartsQuery.isError ? (
            <CardBody>
              <ErrorState message="تعذر تحميل المنتجات." onRetry={() => chartsQuery.refetch()} />
            </CardBody>
          ) : (charts?.topSellingProducts?.length ?? 0) > 0 ? (
            <DataTable
              columns={productColumns}
              rows={charts!.topSellingProducts}
              rowKey={(row) => row.productId}
              dense
            />
          ) : (
            <CardBody>
              <EmptyState title={COMMON_AR.noData} />
            </CardBody>
          )}
        </Card>
      </section>

      {/* Category analytics */}
      <section className="mb-6">
        <h2 className="mb-3 text-base font-semibold text-charcoal">تحليلات الأقسام</h2>
        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>الأقسام الأكثر مبيعًا</CardTitle>
          </CardHeader>
          {chartsQuery.isLoading ? (
            <CardBody>
              <Skeleton className="h-48 w-full rounded-[var(--radius-md)]" />
            </CardBody>
          ) : chartsQuery.isError ? (
            <CardBody>
              <ErrorState message="تعذر تحميل الأقسام." onRetry={() => chartsQuery.refetch()} />
            </CardBody>
          ) : (charts?.topCategories?.length ?? 0) > 0 ? (
            <DataTable
              columns={categoryColumns}
              rows={charts!.topCategories}
              rowKey={(row) => row.categoryId}
              dense
            />
          ) : (
            <CardBody>
              <EmptyState title={COMMON_AR.noData} />
            </CardBody>
          )}
        </Card>
      </section>

      {/* Customer analytics */}
      <section className="mb-2">
        <h2 className="mb-3 text-base font-semibold text-charcoal">تحليلات العملاء</h2>
        <Card>
          <CardHeader>
            <CardTitle>العملاء الجدد بمرور الوقت</CardTitle>
            {summary && (
              <span className="text-xs text-charcoal-soft">
                الإجمالي في الفترة: {formatNumber(summary.newCustomers)}
              </span>
            )}
          </CardHeader>
          <CardBody>
            {chartsQuery.isLoading ? (
              <ChartSkeleton />
            ) : chartsQuery.isError ? (
              <ErrorState message="تعذر تحميل بيانات العملاء." onRetry={() => chartsQuery.refetch()} />
            ) : newCustomersSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={newCustomersSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ece3d3" />
                  <XAxis
                    dataKey="dateLabel"
                    tick={{ fontSize: 11 }}
                    interval="preserveStartEnd"
                    minTickGap={24}
                  />
                  <YAxis tick={{ fontSize: 11 }} width={48} orientation="right" />
                  <Tooltip
                    formatter={(value) => [formatNumber(Number(value ?? 0)), "عملاء جدد"]}
                    labelFormatter={(_, payload) => {
                      const row = payload?.[0]?.payload as { date?: string } | undefined;
                      return row?.date ? formatDate(row.date) : "";
                    }}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #ece3d3",
                      fontFamily: "inherit",
                      direction: "rtl",
                    }}
                  />
                  <Bar dataKey="count" name="عملاء جدد" fill="#3f7a4f" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title={COMMON_AR.noData} description="لا يوجد عملاء جدد في هذه الفترة." />
            )}
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
