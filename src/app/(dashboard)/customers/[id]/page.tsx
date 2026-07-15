"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Ban,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  Send,
} from "lucide-react";
import { RequireRole } from "@/components/layout/RequireRole";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea, FieldError } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { AccountStatusBadge, OrderStatusBadge, Badge, BooleanBadge } from "@/components/ui/StatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FilterBar } from "@/components/ui/FilterBar";
import { IconButton } from "@/components/ui/IconButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState, LoadingState } from "@/components/ui/LoadingState";
import { RatingStars } from "@/components/reviews/RatingStars";
import {
  getCustomer,
  getCustomerAnalytics,
  getCustomerSummary,
  listCustomerNotifications,
  listCustomerOrders,
  listCustomerReviews,
  updateCustomerStatus,
} from "@/lib/api/customers";
import { broadcastNotification } from "@/lib/api/notifications";
import { formatCurrency, formatDateTime, formatNumber, formatPercent } from "@/lib/utils/format";
import { getErrorMessage } from "@/lib/api/errors";
import type { FulfilmentType, OrderStatus } from "@/lib/types";
import {
  ACCOUNT_STATUS_AR,
  FULFILMENT_AR,
  NOTIFICATION_TYPE_AR,
  ORDER_STATUS_AR,
  PAYMENT_AR,
  REVIEW_STATUS_AR,
  labelOf,
} from "@/lib/ar/labels";

const CHART_COLORS = ["#f5a623", "#2a241d", "#3f7a4f", "#2f6fa8", "#c0442c", "#dd8a0e"];

const LOCALE_AR: Record<string, string> = {
  ar: "العربية",
  en: "الإنجليزية",
};

function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <IconButton
      size="sm"
      tone="amber"
      label={`نسخ ${label}`}
      onClick={() => {
        void navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      }}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </IconButton>
  );
}

function CustomerDetailInner({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<"ACTIVE" | "SUSPENDED" | null>(null);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyError, setNotifyError] = useState<string | null>(null);
  const [notifyForm, setNotifyForm] = useState({
    titleAr: "",
    titleEn: "",
    bodyAr: "",
    bodyEn: "",
  });

  const [orderPage, setOrderPage] = useState(1);
  const [orderStatus, setOrderStatus] = useState<OrderStatus | "">("");
  const [orderFulfilment, setOrderFulfilment] = useState<FulfilmentType | "">("");
  const [orderSort, setOrderSort] = useState<"newest" | "oldest">("newest");
  const [orderFrom, setOrderFrom] = useState("");
  const [orderTo, setOrderTo] = useState("");
  const [reviewsPage, setReviewsPage] = useState(1);
  const [notificationsPage, setNotificationsPage] = useState(1);

  const customerQuery = useQuery({
    queryKey: ["customer", id],
    queryFn: () => getCustomer(id),
  });

  const summaryQuery = useQuery({
    queryKey: ["customer-summary", id],
    queryFn: () => getCustomerSummary(id),
  });

  const analyticsQuery = useQuery({
    queryKey: ["customer-analytics", id],
    queryFn: () => getCustomerAnalytics(id),
  });

  const ordersQuery = useQuery({
    queryKey: ["customer-orders", id, { orderPage, orderStatus, orderFulfilment, orderSort, orderFrom, orderTo }],
    queryFn: () =>
      listCustomerOrders(id, {
        page: orderPage,
        limit: 10,
        status: orderStatus || undefined,
        fulfilmentType: orderFulfilment || undefined,
        sort: orderSort,
        from: orderFrom || undefined,
        to: orderTo || undefined,
      }),
  });

  const reviewsQuery = useQuery({
    queryKey: ["customer-reviews", id, reviewsPage],
    queryFn: () => listCustomerReviews(id, { page: reviewsPage, limit: 10 }),
  });

  const notificationsQuery = useQuery({
    queryKey: ["customer-notifications", id, notificationsPage],
    queryFn: () => listCustomerNotifications(id, { page: notificationsPage, limit: 10 }),
  });

  const statusMutation = useMutation({
    mutationFn: (status: "ACTIVE" | "SUSPENDED") => updateCustomerStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setConfirmAction(null);
    },
  });

  const notifyMutation = useMutation({
    mutationFn: () =>
      broadcastNotification({
        userIds: [id],
        type: "ADMIN",
        titleAr: notifyForm.titleAr,
        titleEn: notifyForm.titleEn || notifyForm.titleAr,
        bodyAr: notifyForm.bodyAr,
        bodyEn: notifyForm.bodyEn || notifyForm.bodyAr,
      }),
    onSuccess: () => {
      setNotifyOpen(false);
      setNotifyForm({ titleAr: "", titleEn: "", bodyAr: "", bodyEn: "" });
      setNotifyError(null);
      queryClient.invalidateQueries({ queryKey: ["customer-notifications", id] });
    },
    onError: (err) => setNotifyError(getErrorMessage(err)),
  });

  const statusChartData = useMemo(
    () =>
      (analyticsQuery.data?.ordersByStatus ?? []).map((row) => ({
        ...row,
        label: labelOf(ORDER_STATUS_AR, row.status),
      })),
    [analyticsQuery.data?.ordersByStatus],
  );

  const fulfilmentChartData = useMemo(
    () =>
      (analyticsQuery.data?.deliveryVersusPickup ?? []).map((row) => ({
        ...row,
        name: labelOf(FULFILMENT_AR, row.fulfilmentType),
      })),
    [analyticsQuery.data?.deliveryVersusPickup],
  );

  if (customerQuery.isLoading) return <LoadingState label="جاري تحميل العميل…" />;
  if (customerQuery.isError || !customerQuery.data) {
    return <ErrorState message="تعذر تحميل بيانات العميل" onRetry={() => customerQuery.refetch()} />;
  }

  const customer = customerQuery.data;
  const summary = summaryQuery.data;

  const orderColumns: DataTableColumn<NonNullable<typeof ordersQuery.data>["items"][number]>[] = [
    {
      key: "orderNumber",
      header: "رقم الطلب",
      render: (o) => (
        <Link href={`/orders/${o.id}`} className="font-medium text-amber-800 hover:underline ltr-field">
          {o.orderNumber}
        </Link>
      ),
    },
    {
      key: "createdAt",
      header: "التاريخ والوقت",
      render: (o) => <span className="text-sm text-charcoal-soft">{formatDateTime(o.createdAt)}</span>,
    },
    {
      key: "status",
      header: "الحالة",
      render: (o) => <OrderStatusBadge status={o.status} />,
    },
    {
      key: "fulfilment",
      header: "طريقة الاستلام",
      render: (o) => labelOf(FULFILMENT_AR, o.fulfilmentType),
    },
    {
      key: "payment",
      header: "طريقة الدفع",
      render: (o) => labelOf(PAYMENT_AR, o.paymentMethod),
    },
    {
      key: "items",
      header: "عدد المنتجات",
      render: (o) => formatNumber(o.itemCount),
    },
    {
      key: "subtotal",
      header: "المجموع الفرعي",
      render: (o) => formatCurrency(o.subtotal),
    },
    {
      key: "discount",
      header: "الخصم",
      render: (o) => formatCurrency(o.discountAmount),
    },
    {
      key: "delivery",
      header: "رسوم التوصيل",
      render: (o) => formatCurrency(o.deliveryFee),
    },
    {
      key: "total",
      header: "الإجمالي",
      render: (o) => <span className="font-medium">{formatCurrency(o.total)}</span>,
    },
    {
      key: "coupon",
      header: "الكوبون",
      render: (o) => (o.couponCode ? <span className="ltr-field">{o.couponCode}</span> : "—"),
    },
    {
      key: "cancel",
      header: "سبب الإلغاء",
      render: (o) => o.cancellationReason || "—",
    },
  ];

  return (
    <div>
      <PageHeader
        title={customer.fullName}
        breadcrumbs={[{ label: "العملاء", href: "/customers" }, { label: customer.fullName }]}
        actions={
          <>
            <Button variant="outline" onClick={() => setNotifyOpen(true)}>
              <Send className="size-4" />
              إرسال إشعار
            </Button>
            {customer.status === "SUSPENDED" ? (
              <Button variant="primary" onClick={() => setConfirmAction("ACTIVE")}>
                <CheckCircle2 className="size-4" />
                إعادة تفعيل الحساب
              </Button>
            ) : (
              <Button variant="danger" onClick={() => setConfirmAction("SUSPENDED")}>
                <Ban className="size-4" />
                إيقاف الحساب
              </Button>
            )}
          </>
        }
      />

      <Card className="mb-4">
        <CardBody className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-xs text-charcoal-soft">اسم العميل</p>
            <p className="mt-1 font-medium text-charcoal">{customer.fullName}</p>
          </div>
          <div>
            <p className="text-xs text-charcoal-soft">حالة الحساب</p>
            <div className="mt-1">
              <AccountStatusBadge status={customer.status} />
            </div>
          </div>
          <div>
            <p className="text-xs text-charcoal-soft">رقم الهاتف</p>
            <p className="mt-1 flex items-center gap-2 font-medium text-charcoal ltr-field">
              {customer.phone ?? "—"}
              {customer.phone && <CopyField value={customer.phone} label="رقم الهاتف" />}
            </p>
          </div>
          <div>
            <p className="text-xs text-charcoal-soft">البريد الإلكتروني</p>
            <p className="mt-1 flex items-center gap-2 font-medium text-charcoal ltr-field">
              {customer.email ?? "—"}
              {customer.email && <CopyField value={customer.email} label="البريد الإلكتروني" />}
            </p>
          </div>
          <div>
            <p className="text-xs text-charcoal-soft">تاريخ إنشاء الحساب</p>
            <p className="mt-1 font-medium text-charcoal">{formatDateTime(customer.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs text-charcoal-soft">آخر نشاط</p>
            <p className="mt-1 font-medium text-charcoal">
              {customer.lastActivityAt ? formatDateTime(customer.lastActivityAt) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-charcoal-soft">اللغة المفضلة</p>
            <p className="mt-1 font-medium text-charcoal">{labelOf(LOCALE_AR, customer.locale)}</p>
          </div>
          <div>
            <p className="text-xs text-charcoal-soft">حالة العرض</p>
            <p className="mt-1 font-medium text-charcoal">{labelOf(ACCOUNT_STATUS_AR, customer.status)}</p>
          </div>
        </CardBody>
      </Card>

      {summaryQuery.isLoading && <LoadingState label="جاري تحميل الملخص…" />}
      {summaryQuery.isError && (
        <ErrorState message="تعذر تحميل بيانات العميل" onRetry={() => summaryQuery.refetch()} />
      )}
      {summary && (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="إجمالي الطلبات" value={formatNumber(summary.orderCount)} />
          <StatCard label="الطلبات المكتملة" value={formatNumber(summary.completedOrders)} tone="green" />
          <StatCard label="الطلبات الملغاة" value={formatNumber(summary.cancelledOrders)} tone="red" />
          <StatCard label="الطلبات قيد التنفيذ" value={formatNumber(summary.inProgressOrders)} tone="amber" />
          <StatCard label="إجمالي الإنفاق" value={formatCurrency(summary.totalSpend)} />
          <StatCard label="متوسط قيمة الطلب" value={formatCurrency(summary.averageOrderValue)} />
          <StatCard
            label="آخر طلب"
            value={summary.lastOrder ? summary.lastOrder.orderNumber : "—"}
            hint={summary.lastOrder ? formatDateTime(summary.lastOrder.createdAt) : undefined}
          />
          <StatCard label="عدد العناوين" value={formatNumber(summary.addressCount)} />
          <StatCard label="عدد التقييمات" value={formatNumber(summary.reviewCount)} />
          <StatCard label="عدد الكوبونات المستخدمة" value={formatNumber(summary.couponUsageCount)} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>تحليلات العميل</CardTitle>
            </CardHeader>
            <CardBody>
              {analyticsQuery.isLoading && <LoadingState />}
              {analyticsQuery.isError && (
                <ErrorState message="تعذر تحميل بيانات العميل" onRetry={() => analyticsQuery.refetch()} />
              )}
              {analyticsQuery.data && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-[var(--radius-xl)] border border-border-soft bg-cream/40 p-3">
                      <p className="text-xs text-charcoal-soft">متوسط قيمة الطلب</p>
                      <p className="mt-1 text-lg font-semibold">{formatCurrency(analyticsQuery.data.averageOrderValue)}</p>
                    </div>
                    <div className="rounded-[var(--radius-xl)] border border-border-soft bg-cream/40 p-3">
                      <p className="text-xs text-charcoal-soft">معدل الإلغاء</p>
                      <p className="mt-1 text-lg font-semibold">{formatPercent(analyticsQuery.data.cancellationRate)}</p>
                    </div>
                    <div className="rounded-[var(--radius-xl)] border border-border-soft bg-cream/40 p-3">
                      <p className="text-xs text-charcoal-soft">آخر 30 يومًا مقابل السابقة</p>
                      <p className="mt-1 text-sm">
                        {formatNumber(analyticsQuery.data.last30Days.orders)} طلب /{" "}
                        {formatCurrency(analyticsQuery.data.last30Days.spend)}
                      </p>
                      <p className="text-xs text-charcoal-soft">
                        السابقة: {formatNumber(analyticsQuery.data.previous30Days.orders)} /{" "}
                        {formatCurrency(analyticsQuery.data.previous30Days.spend)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <div>
                      <p className="mb-2 text-sm font-medium text-charcoal">الإنفاق بمرور الوقت</p>
                      {analyticsQuery.data.spendOverTime.length === 0 ? (
                        <p className="py-8 text-center text-sm text-charcoal-soft">لا توجد بيانات</p>
                      ) : (
                        <ResponsiveContainer width="100%" height={220}>
                          <AreaChart data={analyticsQuery.data.spendOverTime}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ece3d3" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => String(v).slice(5)} />
                            <YAxis orientation="right" tick={{ fontSize: 10 }} width={50} />
                            <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} contentStyle={{ fontFamily: "inherit" }} />
                            <Area type="monotone" dataKey="spend" name="الإنفاق" stroke="#dd8a0e" fill="#ffefc2" />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-medium text-charcoal">عدد الطلبات بمرور الوقت</p>
                      {analyticsQuery.data.ordersOverTime.length === 0 ? (
                        <p className="py-8 text-center text-sm text-charcoal-soft">لا توجد بيانات</p>
                      ) : (
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={analyticsQuery.data.ordersOverTime}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ece3d3" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => String(v).slice(5)} />
                            <YAxis orientation="right" tick={{ fontSize: 10 }} width={40} />
                            <Tooltip contentStyle={{ fontFamily: "inherit" }} />
                            <Bar dataKey="count" name="الطلبات" fill="#f5a623" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-medium text-charcoal">الطلبات حسب الحالة</p>
                      {statusChartData.length === 0 ? (
                        <p className="py-8 text-center text-sm text-charcoal-soft">لا توجد بيانات</p>
                      ) : (
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie data={statusChartData} dataKey="count" nameKey="label" outerRadius={80}>
                              {statusChartData.map((_, i) => (
                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ fontFamily: "inherit" }} />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-medium text-charcoal">التوصيل مقابل الاستلام</p>
                      {fulfilmentChartData.length === 0 ? (
                        <p className="py-8 text-center text-sm text-charcoal-soft">لا توجد بيانات</p>
                      ) : (
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={fulfilmentChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ece3d3" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis orientation="right" tick={{ fontSize: 10 }} width={40} />
                            <Tooltip contentStyle={{ fontFamily: "inherit" }} />
                            <Bar dataKey="count" name="العدد" fill="#3f7a4f" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                    <div>
                      <p className="mb-2 text-sm font-medium">أكثر المنتجات شراءً</p>
                      {analyticsQuery.data.topProducts.length === 0 ? (
                        <p className="text-sm text-charcoal-soft">لا توجد بيانات</p>
                      ) : (
                        <ul className="space-y-2 text-sm">
                          {analyticsQuery.data.topProducts.map((p) => (
                            <li key={p.productId} className="flex justify-between gap-2 border-b border-border-soft/70 pb-1">
                              <Link href={`/products/${p.productId}`} className="text-charcoal hover:text-amber-800">
                                {p.nameAr || p.nameEn}
                              </Link>
                              <span className="text-charcoal-soft">{formatNumber(p.quantity)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-medium">أكثر الأقسام شراءً</p>
                      {analyticsQuery.data.topCategories.length === 0 ? (
                        <p className="text-sm text-charcoal-soft">لا توجد بيانات</p>
                      ) : (
                        <ul className="space-y-2 text-sm">
                          {analyticsQuery.data.topCategories.map((c) => (
                            <li key={c.categoryId} className="flex justify-between gap-2 border-b border-border-soft/70 pb-1">
                              <span>{c.nameAr || c.nameEn}</span>
                              <span className="text-charcoal-soft">{formatNumber(c.quantity)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-medium">الكوبونات الأكثر استخدامًا</p>
                      {analyticsQuery.data.topCoupons.length === 0 ? (
                        <p className="text-sm text-charcoal-soft">لا توجد بيانات</p>
                      ) : (
                        <ul className="space-y-2 text-sm">
                          {analyticsQuery.data.topCoupons.map((c) => (
                            <li key={c.code} className="flex justify-between gap-2 border-b border-border-soft/70 pb-1">
                              <span className="ltr-field">{c.code}</span>
                              <span className="text-charcoal-soft">{formatNumber(c.usages)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>سجل الطلبات</CardTitle>
            </CardHeader>
            <FilterBar className="px-4">
              <Select
                value={orderStatus}
                onChange={(e) => {
                  setOrderStatus(e.target.value as OrderStatus | "");
                  setOrderPage(1);
                }}
                className="w-40"
              >
                <option value="">كل الحالات</option>
                {Object.keys(ORDER_STATUS_AR).map((s) => (
                  <option key={s} value={s}>
                    {ORDER_STATUS_AR[s]}
                  </option>
                ))}
              </Select>
              <Select
                value={orderFulfilment}
                onChange={(e) => {
                  setOrderFulfilment(e.target.value as FulfilmentType | "");
                  setOrderPage(1);
                }}
                className="w-40"
              >
                <option value="">كل طرق الاستلام</option>
                <option value="DELIVERY">{FULFILMENT_AR.DELIVERY}</option>
                <option value="PICKUP">{FULFILMENT_AR.PICKUP}</option>
              </Select>
              <Select value={orderSort} onChange={(e) => setOrderSort(e.target.value as "newest" | "oldest")} className="w-36">
                <option value="newest">الأحدث أولاً</option>
                <option value="oldest">الأقدم أولاً</option>
              </Select>
              <Input type="date" value={orderFrom} onChange={(e) => { setOrderFrom(e.target.value); setOrderPage(1); }} className="w-40 ltr-field" />
              <Input type="date" value={orderTo} onChange={(e) => { setOrderTo(e.target.value); setOrderPage(1); }} className="w-40 ltr-field" />
            </FilterBar>
            {ordersQuery.isLoading && <LoadingState />}
            {ordersQuery.isError && <ErrorState message="تعذر تحميل بيانات العميل" onRetry={() => ordersQuery.refetch()} />}
            {ordersQuery.data && ordersQuery.data.items.length === 0 && (
              <EmptyState title="لا توجد طلبات" />
            )}
            {ordersQuery.data && ordersQuery.data.items.length > 0 && (
              <>
                <DataTable dense columns={orderColumns} rows={ordersQuery.data.items} rowKey={(o) => o.id} />
                <Pagination
                  page={orderPage}
                  totalPages={ordersQuery.data.meta.totalPages}
                  total={ordersQuery.data.meta.total}
                  limit={10}
                  onPageChange={setOrderPage}
                />
              </>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>التقييمات</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              {reviewsQuery.isLoading && <LoadingState />}
              {reviewsQuery.isError && <ErrorState message="تعذر تحميل بيانات العميل" onRetry={() => reviewsQuery.refetch()} />}
              {reviewsQuery.data && reviewsQuery.data.data.length === 0 && (
                <p className="px-5 py-6 text-sm text-charcoal-soft">لا توجد تقييمات</p>
              )}
              {reviewsQuery.data && reviewsQuery.data.data.length > 0 && (
                <>
                  <ul className="divide-y divide-border-soft">
                    {reviewsQuery.data.data.map((r) => (
                      <li key={r.id} className="px-5 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Link href={`/products/${r.product.id}`} className="text-sm font-medium text-charcoal hover:text-amber-800">
                            {r.product.nameAr || r.product.nameEn}
                          </Link>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone="amber">{labelOf(REVIEW_STATUS_AR, r.status)}</Badge>
                            <BooleanBadge value={r.isVisible} trueLabel="مرئي" falseLabel="مخفي" />
                            {(r.openReportCount ?? 0) > 0 && <Badge tone="red">مبلّغ</Badge>}
                            <RatingStars rating={r.rating} size="sm" showValue />
                          </div>
                        </div>
                        {r.comment && <p className="mt-1 text-sm text-charcoal-soft">{r.comment}</p>}
                        {r.replyText && (
                          <p className="mt-1 rounded-md bg-cream/70 px-2 py-1 text-xs text-charcoal">
                            رد المتجر: {r.replyText}
                          </p>
                        )}
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-charcoal-soft">
                          <span>{formatDateTime(r.createdAt)}</span>
                          {r.orderId && (
                            <Link href={`/orders/${r.orderId}`} className="text-amber-800 hover:underline">
                              الطلب المرتبط
                            </Link>
                          )}
                          <Link
                            href={`/reviews?reviewId=${r.id}&userId=${id}&tab=reviews`}
                            className="text-amber-800 hover:underline"
                          >
                            فتح التفاصيل
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <Pagination
                    page={reviewsPage}
                    totalPages={reviewsQuery.data.meta.totalPages}
                    total={reviewsQuery.data.meta.total}
                    limit={10}
                    onPageChange={setReviewsPage}
                  />
                </>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>الإشعارات</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              {notificationsQuery.isLoading && <LoadingState />}
              {notificationsQuery.isError && (
                <ErrorState message="تعذر تحميل بيانات العميل" onRetry={() => notificationsQuery.refetch()} />
              )}
              {notificationsQuery.data && notificationsQuery.data.data.length === 0 && (
                <p className="px-5 py-6 text-sm text-charcoal-soft">لا توجد إشعارات</p>
              )}
              {notificationsQuery.data && notificationsQuery.data.data.length > 0 && (
                <>
                  <ul className="divide-y divide-border-soft">
                    {notificationsQuery.data.data.map((n) => (
                      <li key={n.id} className="px-5 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-charcoal">{n.titleAr || n.titleEn}</p>
                            <p className="text-xs text-charcoal-soft">{n.bodyAr || n.bodyEn}</p>
                            <div className="mt-1 flex flex-wrap gap-2 text-xs text-charcoal-soft">
                              {n.type && <span>{labelOf(NOTIFICATION_TYPE_AR, n.type)}</span>}
                              <span>{n.isRead ? "مقروء" : "غير مقروء"}</span>
                              <span>{formatDateTime(n.createdAt)}</span>
                              {n.orderId && (
                                <Link href={`/orders/${n.orderId}`} className="text-amber-800 hover:underline">
                                  الطلب المرتبط
                                </Link>
                              )}
                              {n.productId && (
                                <Link href={`/products/${n.productId}`} className="text-amber-800 hover:underline">
                                  المنتج المرتبط
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <Pagination
                    page={notificationsPage}
                    totalPages={notificationsQuery.data.meta.totalPages}
                    total={notificationsQuery.data.meta.total}
                    limit={10}
                    onPageChange={setNotificationsPage}
                  />
                </>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>معلومات العميل</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2.5 text-sm text-charcoal-soft">
              <div className="flex justify-between gap-3">
                <span>الاسم الكامل</span>
                <span className="font-medium text-charcoal">{customer.fullName}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>رقم الهاتف</span>
                <span className="flex items-center gap-1 font-medium text-charcoal ltr-field">
                  <Phone className="size-3.5" />
                  {customer.phone ?? "—"}
                  {customer.phone && <CopyField value={customer.phone} label="رقم الهاتف" />}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>البريد الإلكتروني</span>
                <span className="flex items-center gap-1 font-medium text-charcoal ltr-field">
                  <Mail className="size-3.5" />
                  {customer.email ?? "—"}
                  {customer.email && <CopyField value={customer.email} label="البريد الإلكتروني" />}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span>اللغة المفضلة</span>
                <span className="font-medium text-charcoal">{labelOf(LOCALE_AR, customer.locale)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>حالة الحساب</span>
                <AccountStatusBadge status={customer.status} />
              </div>
              <div className="flex justify-between gap-3">
                <span>تاريخ التسجيل</span>
                <span className="font-medium text-charcoal">{formatDateTime(customer.createdAt)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>آخر تسجيل دخول</span>
                <span className="font-medium text-charcoal">
                  {customer.lastLoginAt ? formatDateTime(customer.lastLoginAt) : "—"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span>آخر نشاط</span>
                <span className="font-medium text-charcoal">
                  {customer.lastActivityAt ? formatDateTime(customer.lastActivityAt) : "—"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span>عدد الأجهزة المسجلة</span>
                <span className="font-medium text-charcoal">{formatNumber(customer.deviceCount ?? 0)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>تاريخ آخر طلب</span>
                <span className="font-medium text-charcoal">
                  {customer.lastOrderAt ? formatDateTime(customer.lastOrderAt) : "—"}
                </span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>العناوين</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              {customer.addresses.length === 0 ? (
                <p className="text-sm text-charcoal-soft">لا توجد عناوين</p>
              ) : (
                customer.addresses.map((a) => (
                  <div key={a.id} className="rounded-[var(--radius-xl)] border border-border-soft p-3 text-sm text-charcoal-soft">
                    <div className="mb-1 flex items-center gap-2">
                      <MapPin className="size-4 shrink-0 text-amber-700" />
                      <p className="font-medium text-charcoal">{a.label}</p>
                      {a.isDefault && <Badge tone="amber">العنوان الافتراضي</Badge>}
                    </div>
                    <p>اسم المستلم: <span className="text-charcoal">{a.recipientName}</span></p>
                    <p>
                      رقم الهاتف: <span className="ltr-field text-charcoal">{a.phone}</span>
                    </p>
                    <p>المدينة: <span className="text-charcoal">{a.city}</span></p>
                    <p>الحي: <span className="text-charcoal">{a.district}</span></p>
                    <p>الشارع: <span className="text-charcoal">{a.street}</span></p>
                    {a.building && <p>المبنى: <span className="text-charcoal">{a.building}</span></p>}
                    {a.floor && <p>الدور: <span className="text-charcoal">{a.floor}</span></p>}
                    {a.apartment && <p>الشقة: <span className="text-charcoal">{a.apartment}</span></p>}
                    {a.directions && <p>تعليمات إضافية: <span className="text-charcoal">{a.directions}</span></p>}
                    {a.latitude != null && a.longitude != null && (
                      <a
                        href={`https://www.google.com/maps?q=${a.latitude},${a.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-amber-800 hover:underline ltr-field"
                      >
                        <ExternalLink className="size-3.5" />
                        فتح الموقع في الخرائط
                      </a>
                    )}
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirmAction)}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => confirmAction && statusMutation.mutate(confirmAction)}
        isLoading={statusMutation.isPending}
        title={confirmAction === "SUSPENDED" ? "إيقاف الحساب" : "إعادة تفعيل الحساب"}
        description={
          confirmAction === "SUSPENDED"
            ? "هل أنت متأكد من إيقاف هذا الحساب؟ لن يتمكن العميل من تسجيل الدخول أو إتمام الطلبات."
            : "سيتم إعادة تفعيل حساب العميل والسماح له باستخدام التطبيق مجددًا."
        }
        confirmLabel={confirmAction === "SUSPENDED" ? "إيقاف الحساب" : "إعادة التفعيل"}
        variant={confirmAction === "SUSPENDED" ? "danger" : "primary"}
      />

      <Modal
        open={notifyOpen}
        onClose={() => setNotifyOpen(false)}
        title="إرسال إشعار لهذا العميل"
        footer={
          <>
            <Button variant="outline" onClick={() => setNotifyOpen(false)}>
              إلغاء
            </Button>
            <Button
              isLoading={notifyMutation.isPending}
              onClick={() => {
                if (!notifyForm.titleAr.trim() || !notifyForm.bodyAr.trim()) {
                  setNotifyError("العنوان والنص بالعربية مطلوبان.");
                  return;
                }
                notifyMutation.mutate();
              }}
            >
              إرسال
            </Button>
          </>
        }
      >
        {notifyError && (
          <div className="mb-3 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">{notifyError}</div>
        )}
        <div className="space-y-3">
          <div>
            <Label required>العنوان بالعربية</Label>
            <Input
              value={notifyForm.titleAr}
              onChange={(e) => setNotifyForm((f) => ({ ...f, titleAr: e.target.value }))}
              dir="rtl"
            />
          </div>
          <div>
            <Label>العنوان بالإنجليزية</Label>
            <Input
              className="ltr-field"
              value={notifyForm.titleEn}
              onChange={(e) => setNotifyForm((f) => ({ ...f, titleEn: e.target.value }))}
            />
          </div>
          <div>
            <Label required>النص بالعربية</Label>
            <Textarea
              rows={3}
              value={notifyForm.bodyAr}
              onChange={(e) => setNotifyForm((f) => ({ ...f, bodyAr: e.target.value }))}
              dir="rtl"
            />
            <FieldError message={!notifyForm.bodyAr.trim() ? undefined : undefined} />
          </div>
          <div>
            <Label>النص بالإنجليزية</Label>
            <Textarea
              rows={3}
              className="ltr-field"
              value={notifyForm.bodyEn}
              onChange={(e) => setNotifyForm((f) => ({ ...f, bodyEn: e.target.value }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireRole navKey="customers">
      <CustomerDetailInner id={id} />
    </RequireRole>
  );
}
