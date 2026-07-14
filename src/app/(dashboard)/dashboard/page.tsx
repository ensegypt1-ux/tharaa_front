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
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Banknote,
  Boxes,
  ClipboardList,
  Package,
  ShoppingCart,
  Star,
  Tag,
  Ticket,
  TriangleAlert,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { DateRangeFilter, type DateRangeState } from "@/components/ui/DateRangeFilter";
import { ErrorState } from "@/components/ui/LoadingState";
import { getAnalyticsCharts, getAnalyticsOverview } from "@/lib/api/analytics";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils/format";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useOpsCounters } from "@/lib/ops/useOpsCounters";
import { COMMON_AR, FULFILMENT_AR, ORDER_STATUS_AR, labelOf } from "@/lib/ar/labels";
import { Skeleton } from "@/components/ui/Skeleton";

const CHART_COLORS = ["#f5a623", "#2a241d", "#3f7a4f", "#2f6fa8", "#c0442c", "#dd8a0e"];

function ChartSkeleton() {
  return (
    <div className="space-y-3 py-2" aria-hidden>
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-[240px] w-full rounded-[var(--radius-md)]" />
    </div>
  );
}

export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const ops = useOpsCounters();
  const [range, setRange] = useState<DateRangeState>({ range: "last30Days" });

  const queryParams = useMemo(
    () => ({
      range: range.range,
      from: range.range === "custom" ? range.from : undefined,
      to: range.range === "custom" ? range.to : undefined,
    }),
    [range],
  );

  const overviewQuery = useQuery({
    queryKey: ["analytics-overview", queryParams],
    queryFn: () => getAnalyticsOverview(queryParams),
    enabled: range.range !== "custom" || Boolean(range.from && range.to),
  });

  const chartsQuery = useQuery({
    queryKey: ["analytics-charts", queryParams],
    queryFn: () => getAnalyticsCharts(queryParams),
    enabled: range.range !== "custom" || Boolean(range.from && range.to),
  });

  const summary = overviewQuery.data?.summary;
  const firstName = user?.fullName?.split(" ")[0] ?? "";

  const statusChartData = useMemo(
    () =>
      (chartsQuery.data?.ordersByStatus ?? []).map((row) => ({
        ...row,
        statusLabel: labelOf(ORDER_STATUS_AR, row.status),
      })),
    [chartsQuery.data?.ordersByStatus],
  );

  const fulfilmentChartData = useMemo(
    () =>
      (chartsQuery.data?.deliveryVersusPickup ?? []).map((row) => ({
        ...row,
        name: labelOf(FULFILMENT_AR, row.fulfilmentType),
      })),
    [chartsQuery.data?.deliveryVersusPickup],
  );

  return (
    <div className="animate-in">
      <PageHeader
        title={`مرحبًا، ${firstName}`}
        description="مركز عمليات سوق ثراء — ملخص الأداء للفترة المحددة."
        actions={<DateRangeFilter value={range} onChange={setRange} />}
      />

      {overviewQuery.isError && (
        <ErrorState message={COMMON_AR.loadFailed} onRetry={() => overviewQuery.refetch()} />
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {overviewQuery.isLoading &&
          Array.from({ length: 23 }).map((_, i) => <StatCard key={i} label="…" value="" loading />)}
        {summary && (
          <>
            <StatCard label="إجمالي الطلبات" value={formatNumber(summary.totalOrders)} icon={ShoppingCart} href="/orders" />
            <StatCard label="طلبات اليوم" value={formatNumber(summary.ordersToday)} icon={ShoppingCart} href="/orders" />
            <StatCard label="الطلبات المعلقة" value={formatNumber(summary.pendingOrders)} icon={ClipboardList} tone="amber" href="/orders?status=PENDING" />
            <StatCard label="الطلبات المؤكدة" value={formatNumber(summary.confirmedOrders)} icon={ClipboardList} href="/orders?status=CONFIRMED" />
            <StatCard label="قيد التجهيز" value={formatNumber(summary.preparingOrders)} icon={ClipboardList} href="/orders?status=PREPARING" />
            <StatCard label="الجاهزة" value={formatNumber(summary.readyOrders)} icon={Package} href="/orders?status=READY" />
            <StatCard label="خرجت للتوصيل" value={formatNumber(summary.outForDeliveryOrders)} icon={ShoppingCart} href="/orders?status=OUT_FOR_DELIVERY" />
            <StatCard label="الطلبات المكتملة" value={formatNumber(summary.completedOrders)} icon={ClipboardList} tone="charcoal" href="/orders?status=COMPLETED" />
            <StatCard label="الطلبات الملغاة" value={formatNumber(summary.cancelledOrders)} icon={TriangleAlert} tone="red" href="/orders?status=CANCELLED" />
            <StatCard label="إجمالي المبيعات" value={formatCurrency(summary.totalSales)} icon={Banknote} />
            <StatCard label="مبيعات اليوم" value={formatCurrency(summary.salesToday)} icon={Banknote} />
            <StatCard label="مبيعات الأسبوع" value={formatCurrency(summary.salesThisWeek)} icon={Banknote} />
            <StatCard label="مبيعات الشهر" value={formatCurrency(summary.salesThisMonth)} icon={Banknote} />
            <StatCard label="متوسط قيمة الطلب" value={formatCurrency(summary.averageOrderValue)} icon={Banknote} />
            <StatCard label="إجمالي العملاء" value={formatNumber(summary.totalCustomers)} icon={Users} href="/customers" />
            <StatCard
              label="العملاء الجدد"
              value={formatNumber(summary.newCustomers ?? 0)}
              icon={Users}
              tone="green"
              href="/customers"
              hint="ضمن نطاق التحليلات المحدد"
            />
            <StatCard label="المنتجات النشطة" value={formatNumber(summary.activeProducts)} icon={Package} href="/products?isActive=true" />
            <StatCard label="المنتجات غير المتوفرة" value={formatNumber(summary.outOfStockProducts)} icon={Boxes} tone="red" href="/inventory" />
            <StatCard label="المنتجات منخفضة المخزون" value={formatNumber(summary.lowStockProducts)} icon={Boxes} tone="amber" href="/inventory" />
            <StatCard
              label="المنتجات بدون صور"
              value={ops.isLoading ? "…" : formatNumber(ops.missingImages)}
              icon={Package}
              tone="amber"
              href="/products/missing-images"
              hint="من قائمة الصور الناقصة"
            />
            <StatCard label="العروض النشطة" value={formatNumber(summary.activeOffers)} icon={Tag} href="/offers" />
            <StatCard label="الكوبونات النشطة" value={formatNumber(summary.activeCoupons)} icon={Ticket} href="/coupons" />
            <StatCard label="التقييمات المعلقة" value={formatNumber(summary.pendingReviews)} icon={Star} tone="amber" href="/reviews" />
          </>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>المبيعات بمرور الوقت</CardTitle>
              {chartsQuery.data && (
                <span className="flex items-center gap-1 text-xs text-danger">
                  <TriangleAlert className="size-3.5" />
                  معدل الإلغاء: {formatPercent(chartsQuery.data.cancellationRate)}
                </span>
              )}
            </CardHeader>
            <CardBody>
              {chartsQuery.isLoading ? (
                <ChartSkeleton />
              ) : chartsQuery.data && chartsQuery.data.dailySales.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={chartsQuery.data.dailySales}>
                    <defs>
                      <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f5a623" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f5a623" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ece3d3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => String(v).slice(5)} reversed={false} />
                    <YAxis tick={{ fontSize: 11 }} width={80} tickFormatter={(v) => formatNumber(Number(v))} orientation="right" />
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value ?? 0))}
                      labelStyle={{ color: "#2a241d", fontFamily: "inherit" }}
                      contentStyle={{ borderRadius: 12, border: "1px solid #ece3d3", fontFamily: "inherit" }}
                    />
                    <Area type="monotone" dataKey="sales" name="المبيعات" stroke="#dd8a0e" fill="url(#salesGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-10 text-center text-sm text-charcoal-soft">{COMMON_AR.noData}</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>الطلبات حسب الحالة</CardTitle>
            </CardHeader>
            <CardBody>
              {chartsQuery.isLoading ? (
                <ChartSkeleton />
              ) : statusChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={statusChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ece3d3" />
                    <XAxis dataKey="statusLabel" tick={{ fontSize: 10 }} interval={0} height={60} />
                    <YAxis tick={{ fontSize: 11 }} width={40} orientation="right" />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "1px solid #ece3d3", fontFamily: "inherit" }}
                      formatter={(value) => [formatNumber(Number(value ?? 0)), "العدد"]}
                    />
                    <Bar dataKey="count" name="العدد" radius={[6, 6, 0, 0]}>
                      {statusChartData.map((_, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-10 text-center text-sm text-charcoal-soft">{COMMON_AR.noOrders}</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>الطلبات بمرور الوقت</CardTitle>
            </CardHeader>
            <CardBody>
              {chartsQuery.isLoading ? (
                <ChartSkeleton />
              ) : chartsQuery.data && chartsQuery.data.dailySales.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={chartsQuery.data.dailySales}>
                    <defs>
                      <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2a241d" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#2a241d" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ece3d3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => String(v).slice(5)} />
                    <YAxis tick={{ fontSize: 11 }} width={40} orientation="right" />
                    <Tooltip
                      formatter={(value) => [formatNumber(Number(value ?? 0)), "الطلبات"]}
                      contentStyle={{ borderRadius: 12, border: "1px solid #ece3d3", fontFamily: "inherit" }}
                    />
                    <Area type="monotone" dataKey="orders" name="الطلبات" stroke="#2a241d" fill="url(#ordersGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-10 text-center text-sm text-charcoal-soft">{COMMON_AR.noOrders}</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>التوصيل مقابل الاستلام</CardTitle>
            </CardHeader>
            <CardBody>
              {fulfilmentChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={fulfilmentChartData}
                      dataKey="count"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                    >
                      {fulfilmentChartData.map((_, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "1px solid #ece3d3", fontFamily: "inherit" }}
                      formatter={(value) => formatNumber(Number(value ?? 0))}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-10 text-center text-sm text-charcoal-soft">{COMMON_AR.noData}</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>المنتجات الأكثر مبيعًا</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              {chartsQuery.data && chartsQuery.data.topSellingProducts.length > 0 ? (
                <ul className="divide-y divide-border-soft">
                  {chartsQuery.data.topSellingProducts.slice(0, 6).map((p, idx) => (
                    <li key={p.productId} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex size-7 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-800">
                          {formatNumber(idx + 1)}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-charcoal">{p.nameAr || p.nameEn}</p>
                          <p className="text-xs text-charcoal-soft">{formatNumber(p.quantity)} مبيعًا</p>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-charcoal">{formatCurrency(p.revenue)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-10 text-center text-sm text-charcoal-soft">{COMMON_AR.noData}</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>المبيعات اليومية</CardTitle>
            </CardHeader>
            <CardBody>
              {chartsQuery.data?.dailySales?.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartsQuery.data.dailySales}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ece3d3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => String(v).slice(5)} />
                    <YAxis orientation="right" tick={{ fontSize: 10 }} width={70} tickFormatter={(v) => formatNumber(Number(v))} />
                    <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} contentStyle={{ fontFamily: "inherit", borderRadius: 12 }} />
                    <Bar dataKey="sales" name="المبيعات" fill="#f5a623" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-10 text-center text-sm text-charcoal-soft">{COMMON_AR.noData}</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>المبيعات الأسبوعية</CardTitle>
            </CardHeader>
            <CardBody>
              {chartsQuery.data?.weeklySales?.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartsQuery.data.weeklySales}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ece3d3" />
                    <XAxis dataKey="key" tick={{ fontSize: 10 }} />
                    <YAxis orientation="right" tick={{ fontSize: 10 }} width={70} tickFormatter={(v) => formatNumber(Number(v))} />
                    <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} contentStyle={{ fontFamily: "inherit", borderRadius: 12 }} />
                    <Bar dataKey="sales" name="المبيعات" fill="#dd8a0e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-10 text-center text-sm text-charcoal-soft">{COMMON_AR.noData}</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>المبيعات الشهرية</CardTitle>
            </CardHeader>
            <CardBody>
              {chartsQuery.data?.monthlySales?.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartsQuery.data.monthlySales}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ece3d3" />
                    <XAxis dataKey="key" tick={{ fontSize: 10 }} />
                    <YAxis orientation="right" tick={{ fontSize: 10 }} width={70} tickFormatter={(v) => formatNumber(Number(v))} />
                    <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} contentStyle={{ fontFamily: "inherit", borderRadius: 12 }} />
                    <Bar dataKey="sales" name="المبيعات" fill="#b56d0a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-10 text-center text-sm text-charcoal-soft">{COMMON_AR.noData}</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>أفضل الأقسام</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              {chartsQuery.data?.topCategories?.length ? (
                <ul className="divide-y divide-border-soft">
                  {chartsQuery.data.topCategories.slice(0, 6).map((c, idx) => (
                    <li key={c.categoryId} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex size-7 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-800">
                          {formatNumber(idx + 1)}
                        </span>
                        <p className="text-sm font-medium text-charcoal">{c.nameAr || c.nameEn}</p>
                      </div>
                      <span className="text-sm font-medium text-charcoal">{formatCurrency(c.revenue)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-10 text-center text-sm text-charcoal-soft">{COMMON_AR.noData}</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>استخدام الكوبونات</CardTitle>
            </CardHeader>
            <CardBody>
              {chartsQuery.data?.couponUsage?.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartsQuery.data.couponUsage}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ece3d3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => String(v).slice(5)} />
                    <YAxis orientation="right" tick={{ fontSize: 10 }} width={40} />
                    <Tooltip contentStyle={{ fontFamily: "inherit", borderRadius: 12 }} />
                    <Area type="monotone" dataKey="usages" name="مرات الاستخدام" stroke="#2f6fa8" fill="#2f6fa833" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-10 text-center text-sm text-charcoal-soft">{COMMON_AR.noData}</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>العملاء الجدد</CardTitle>
            </CardHeader>
            <CardBody>
              {chartsQuery.data?.newCustomersOverTime?.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartsQuery.data.newCustomersOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ece3d3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => String(v).slice(5)} />
                    <YAxis orientation="right" tick={{ fontSize: 10 }} width={40} />
                    <Tooltip contentStyle={{ fontFamily: "inherit", borderRadius: 12 }} />
                    <Bar dataKey="count" name="عملاء جدد" fill="#3f7a4f" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-10 text-center text-sm text-charcoal-soft">{COMMON_AR.noData}</p>
              )}
            </CardBody>
          </Card>
        </div>
    </div>
  );
}
