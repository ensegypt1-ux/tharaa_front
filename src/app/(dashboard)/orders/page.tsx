"use client";

import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Eye, Search, ShoppingCart, X } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { OrderStatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState, LoadingState } from "@/components/ui/LoadingState";
import { IconButton } from "@/components/ui/IconButton";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { listOrders, updateOrderStatus } from "@/lib/api/orders";
import type { Order, OrderStatus, FulfilmentType, PaymentMethod } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import { COMMON_AR, FULFILMENT_AR, ORDER_STATUS_AR, PAYMENT_AR, labelOf } from "@/lib/ar/labels";
import {
  getAdminSocketStateServerSnapshot,
  getAdminSocketStateSnapshot,
  subscribeAdminSocketState,
} from "@/lib/realtime/socketManager";
import { resetUnreadNewOrders } from "@/lib/realtime/unreadOrdersTitle";
import { canCancelOrder } from "@/lib/auth/roles";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  actionLabelForStatus,
  canShowCancel,
  nextOperationalStatus,
} from "@/lib/orders/transitions";
import { getErrorMessage } from "@/lib/api/errors";
import { Modal } from "@/components/ui/Modal";
import { Textarea, Label, FieldError } from "@/components/ui/Input";

const STATUS_OPTIONS: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
  "CANCELLED",
];

function OrdersPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [q, setQ] = useState(params.get("q") ?? "");
  const [status, setStatus] = useState<OrderStatus | "">((params.get("status") as OrderStatus) || "");
  const [fulfilmentType, setFulfilmentType] = useState<FulfilmentType | "">("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const socketState = useSyncExternalStore(
    subscribeAdminSocketState,
    getAdminSocketStateSnapshot,
    getAdminSocketStateServerSnapshot,
  );
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const limit = 20;

  const socketConnected = socketState === "connected";

  useEffect(() => {
    queueMicrotask(() => resetUnreadNewOrders());
  }, []);

  useEffect(() => {
    const onHighlight = (event: Event) => {
      const orderId = (event as CustomEvent<{ orderId: string }>).detail?.orderId;
      if (!orderId) return;
      setHighlightedIds((prev) => new Set(prev).add(orderId));
      window.setTimeout(() => {
        setHighlightedIds((prev) => {
          const next = new Set(prev);
          next.delete(orderId);
          return next;
        });
      }, 2500);
    };
    window.addEventListener("tharaa:order-highlight", onHighlight);
    return () => window.removeEventListener("tharaa:order-highlight", onHighlight);
  }, []);

  const query = useQuery({
    queryKey: ["orders", { q, status, fulfilmentType, paymentMethod, sort, page }],
    queryFn: () =>
      listOrders({
        page,
        limit,
        q: q || undefined,
        status: status || undefined,
        fulfilmentType: fulfilmentType || undefined,
        paymentMethod: paymentMethod || undefined,
        sort,
      }),
    refetchInterval: socketConnected ? false : 30_000,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status: next, cancellationReason }: { id: string; status: OrderStatus; cancellationReason?: string }) =>
      updateOrderStatus(id, { status: next, cancellationReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["analytics-overview"] });
      setCancelTarget(null);
      setCancelReason("");
      setActionError(null);
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  });

  const columns: DataTableColumn<Order>[] = [
    {
      key: "orderNumber",
      header: "الطلب",
      render: (o) => (
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-charcoal ltr-field">{o.orderNumber}</span>
          <IconButton
            label="نسخ رقم الطلب"
            size="sm"
            tone="amber"
            onClick={(e) => {
              e.stopPropagation();
              void navigator.clipboard.writeText(o.orderNumber);
            }}
          >
            <Copy className="size-3.5" />
          </IconButton>
        </div>
      ),
    },
    {
      key: "customer",
      header: COMMON_AR.customer,
      render: (o) => (
        <div>
          <p className="text-sm text-charcoal">{o.user?.fullName ?? "—"}</p>
          <p className="flex items-center gap-1 text-xs text-charcoal-soft ltr-field">
            {o.user?.phone ?? o.user?.email ?? ""}
            {o.user?.phone && (
              <IconButton
                label="نسخ رقم الهاتف"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  void navigator.clipboard.writeText(o.user!.phone!);
                }}
              >
                <Copy className="size-3" />
              </IconButton>
            )}
          </p>
        </div>
      ),
    },
    {
      key: "fulfilment",
      header: "التوصيل / الاستلام",
      render: (o) => <span className="text-sm">{labelOf(FULFILMENT_AR, o.fulfilmentType)}</span>,
    },
    {
      key: "payment",
      header: "الدفع",
      render: (o) => <span className="text-sm">{labelOf(PAYMENT_AR, o.paymentMethod)}</span>,
    },
    {
      key: "status",
      header: COMMON_AR.status,
      render: (o) => <OrderStatusBadge status={o.status} />,
    },
    {
      key: "total",
      header: COMMON_AR.total,
      render: (o) => <span className="font-medium">{formatCurrency(o.total)}</span>,
    },
    {
      key: "createdAt",
      header: "تاريخ الطلب",
      render: (o) => <span className="text-sm text-charcoal-soft">{formatDateTime(o.createdAt)}</span>,
    },
    {
      key: "actions",
      header: "إجراءات",
      className: "text-end",
      headerClassName: "text-end",
      render: (o) => {
        const next = nextOperationalStatus(o.status, o.fulfilmentType);
        return (
          <div className="flex flex-wrap items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            {next && (
              <Button
                size="sm"
                variant="outline"
                isLoading={statusMutation.isPending}
                onClick={() => statusMutation.mutate({ id: o.id, status: next })}
              >
                <Check className="size-3.5" />
                {actionLabelForStatus(next)}
              </Button>
            )}
            {canCancelOrder(user?.role) && canShowCancel(o.status) && (
              <Button size="sm" variant="danger" onClick={() => setCancelTarget(o)}>
                <X className="size-3.5" />
                إلغاء
              </Button>
            )}
            <IconButton label="تفاصيل الطلب" tone="amber" onClick={() => router.push(`/orders/${o.id}`)}>
              <Eye className="size-3.5" />
            </IconButton>
          </div>
        );
      },
    },
  ];

  return (
    <div className="page-shell animate-in">
      <PageHeader
        title="الطلبات"
        description="لوحة تشغيل الطلبات — بحث، تصفية، وإجراءات سريعة."
      />

      {actionError && (
        <div className="mb-3 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-danger">
          {actionError}
        </div>
      )}

      <Card>
        <FilterBar>
          <div className="relative w-64">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-charcoal-soft" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث برقم الطلب…"
              className="ps-9"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPage(1);
                  router.replace(`/orders?q=${encodeURIComponent(q)}${status ? `&status=${status}` : ""}`);
                }
              }}
            />
          </div>
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as OrderStatus | "");
              setPage(1);
            }}
            className="w-44"
          >
            <option value="">كل الحالات</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {labelOf(ORDER_STATUS_AR, s)}
              </option>
            ))}
          </Select>
          <Select
            value={fulfilmentType}
            onChange={(e) => {
              setFulfilmentType(e.target.value as FulfilmentType | "");
              setPage(1);
            }}
            className="w-40"
          >
            <option value="">كل طرق التوصيل</option>
            <option value="DELIVERY">{FULFILMENT_AR.DELIVERY}</option>
            <option value="PICKUP">{FULFILMENT_AR.PICKUP}</option>
          </Select>
          <Select
            value={paymentMethod}
            onChange={(e) => {
              setPaymentMethod(e.target.value as PaymentMethod | "");
              setPage(1);
            }}
            className="w-40"
          >
            <option value="">كل طرق الدفع</option>
            <option value="CASH_ON_DELIVERY">{PAYMENT_AR.CASH_ON_DELIVERY}</option>
          </Select>
          <Select value={sort} onChange={(e) => setSort(e.target.value as "newest" | "oldest")} className="w-36">
            <option value="newest">{COMMON_AR.newestFirst}</option>
            <option value="oldest">{COMMON_AR.oldestFirst}</option>
          </Select>
        </FilterBar>

        {query.isLoading && <SkeletonTable rows={8} cols={7} />}
        {query.isError && <ErrorState message="تعذر تحميل الطلبات." onRetry={() => query.refetch()} />}
        {query.data && query.data.items.length === 0 && (
          <EmptyState icon={ShoppingCart} title="لا توجد طلبات" description="حاول تعديل عوامل التصفية." />
        )}
        {query.data && query.data.items.length > 0 && (
          <>
            <DataTable
              columns={columns}
              rows={query.data.items}
              rowKey={(o) => o.id}
              dense
              onRowClick={(o) => router.push(`/orders/${o.id}`)}
              getRowClassName={(o) => (highlightedIds.has(o.id) ? "order-row-highlight" : undefined)}
            />
            <Pagination
              page={page}
              totalPages={query.data.meta.totalPages}
              total={query.data.meta.total}
              limit={limit}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      <Modal
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        title="إلغاء الطلب"
        footer={
          <>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>
              رجوع
            </Button>
            <Button
              variant="danger"
              isLoading={statusMutation.isPending}
              onClick={() => {
                if (!cancelTarget) return;
                if (cancelReason.trim().length < 3) {
                  setActionError("سبب الإلغاء يجب أن يكون 3 أحرف على الأقل.");
                  return;
                }
                statusMutation.mutate({
                  id: cancelTarget.id,
                  status: "CANCELLED",
                  cancellationReason: cancelReason.trim(),
                });
              }}
            >
              تأكيد الإلغاء
            </Button>
          </>
        }
      >
        <Label required>سبب الإلغاء</Label>
        <Textarea rows={3} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
        <FieldError
          message={cancelReason.trim().length > 0 && cancelReason.trim().length < 3 ? "3 أحرف على الأقل" : undefined}
        />
      </Modal>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <OrdersPageInner />
    </Suspense>
  );
}
