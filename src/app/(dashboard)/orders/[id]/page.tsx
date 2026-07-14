"use client";

import { use, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Boxes,
  Check,
  Copy,
  MapPin,
  Printer,
  Store,
  User as UserIcon,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea, Label, FieldError } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IconButton } from "@/components/ui/IconButton";
import { OrderStatusBadge, Badge } from "@/components/ui/StatusBadge";
import { ErrorState, LoadingState } from "@/components/ui/LoadingState";
import { getOrder, getOrderPrint, updateOrderStatus } from "@/lib/api/orders";
import { listInventoryMovements } from "@/lib/api/inventory";
import { canCancelOrder } from "@/lib/auth/roles";
import { useAuth } from "@/lib/auth/AuthProvider";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import { getErrorMessage } from "@/lib/api/errors";
import type { OrderStatus } from "@/lib/types";
import { COMMON_AR, ORDER_STATUS_AR, FULFILMENT_AR, PAYMENT_AR, INVENTORY_MOVEMENT_TYPE_AR, labelOf } from "@/lib/ar/labels";

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <IconButton
      size="sm"
      tone="amber"
      label={label ?? COMMON_AR.copy}
      onClick={() => {
        void navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </IconButton>
  );
}

function StatusTimeline({ status, fulfilmentType }: { status: OrderStatus; fulfilmentType: "DELIVERY" | "PICKUP" }) {
  const flow: OrderStatus[] =
    fulfilmentType === "DELIVERY"
      ? ["PENDING", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "COMPLETED"]
      : ["PENDING", "CONFIRMED", "PREPARING", "READY", "COMPLETED"];
  const currentIndex = flow.indexOf(status);
  const cancelled = status === "CANCELLED";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {flow.map((s, idx) => (
        <div key={s} className="flex items-center gap-2">
          <span
            className={
              !cancelled && idx <= currentIndex
                ? "rounded-full bg-amber-500 px-3 py-1 text-xs font-medium text-charcoal"
                : "rounded-full bg-cream px-3 py-1 text-xs font-medium text-charcoal-soft"
            }
          >
            {labelOf(ORDER_STATUS_AR, s)}
          </span>
          {idx < flow.length - 1 && <ArrowLeft className="size-3.5 text-charcoal-soft" />}
        </div>
      ))}
      {cancelled && (
        <Badge tone="red" className="ms-1">
          {labelOf(ORDER_STATUS_AR, "CANCELLED")}
        </Badge>
      )}
    </div>
  );
}

function StatusHistoryTimeline({
  entries,
}: {
  entries: NonNullable<Awaited<ReturnType<typeof getOrder>>["statusHistory"]>;
}) {
  return (
    <ol className="relative me-2 border-s-2 border-border-soft">
      {entries.map((h, idx) => (
        <li key={h.id} className="relative pb-5 ps-6 last:pb-0">
          <span
            className={`absolute -start-[7px] top-1 size-3 rounded-full ring-2 ring-surface ${
              idx === 0 ? "bg-amber-500" : "bg-border-soft"
            }`}
          />
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-charcoal">
                {h.fromStatus ? (
                  <>
                    <span className="text-charcoal-soft">{labelOf(ORDER_STATUS_AR, h.fromStatus)}</span>
                    <span className="mx-1.5 text-charcoal-soft">←</span>
                  </>
                ) : null}
                {labelOf(ORDER_STATUS_AR, h.toStatus)}
              </p>
              {h.note && (
                <p className="mt-1 rounded-[var(--radius-md)] border border-border-soft bg-cream/50 px-2.5 py-1.5 text-xs text-charcoal-soft">
                  {h.note}
                </p>
              )}
              {h.changedBy && <p className="mt-1 text-xs text-charcoal-soft">بواسطة {h.changedBy.fullName}</p>}
            </div>
            <time className="shrink-0 whitespace-nowrap text-xs text-charcoal-soft">{formatDateTime(h.createdAt)}</time>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [noteDialog, setNoteDialog] = useState<{ status: OrderStatus } | null>(null);
  const [statusConfirm, setStatusConfirm] = useState<{ status: OrderStatus; note: string } | null>(null);
  const [note, setNote] = useState("");
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);

  const orderQuery = useQuery({
    queryKey: ["order", id],
    queryFn: () => getOrder(id),
  });

  const inventoryKeys = useMemo(() => {
    const items = orderQuery.data?.items ?? [];
    const seen = new Set<string>();
    return items.flatMap((item) => {
      const key = item.variantId ?? item.productId;
      if (seen.has(key)) return [];
      seen.add(key);
      return [{ productId: item.productId, variantId: item.variantId ?? undefined }];
    });
  }, [orderQuery.data?.items]);

  const inventoryMovementsQuery = useQuery({
    queryKey: ["order-inventory-movements", id, inventoryKeys],
    queryFn: async () => {
      const batches = await Promise.all(
        inventoryKeys.map(({ productId, variantId }) =>
          listInventoryMovements({ productId, variantId, limit: 50 }),
        ),
      );
      return batches
        .flatMap((batch) => batch.data)
        .filter((m) => m.orderId === id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    enabled: inventoryKeys.length > 0,
  });

  const statusMutation = useMutation({
    mutationFn: (payload: { status: OrderStatus; note?: string; cancellationReason?: string }) =>
      updateOrderStatus(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setNoteDialog(null);
      setStatusConfirm(null);
      setCancelDialog(false);
      setNote("");
      setCancelReason("");
      setFormError(null);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const printMutation = useMutation({
    mutationFn: () => getOrderPrint(id),
    onSuccess: (printable) => {
      setPrintError(null);
      try {
        const itemsHtml = printable.items
          .map(
            (item) => `<tr>
              <td>${item.productNameAr || item.productNameEn}${item.variantNameAr || item.variantNameEn ? ` (${item.variantNameAr || item.variantNameEn})` : ""}</td>
              <td>${item.quantity} ${item.unit}</td>
              <td>${formatCurrency(item.unitPrice)}</td>
              <td>${formatCurrency(item.lineTotal)}</td>
            </tr>`,
          )
          .join("");

        // Empty <title> + @page margin:0 removes browser header/footer (title + URL).
        const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/><title></title>
          <style>
            @page { margin: 0; size: auto; }
            html, body { margin: 0; padding: 0; }
            body{font-family:Tahoma,Arial,sans-serif;padding:16mm;color:#2a241d}
            h1{font-size:20px;margin:0 0 8px}
            table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}
            th,td{border-bottom:1px solid #e5e0d8;padding:8px;text-align:right}
            .meta{font-size:13px;color:#5c5349;margin:4px 0}
            .total{margin-top:16px;font-size:16px;font-weight:700;text-align:left}
          </style></head><body>
          <h1>سوق ثراء — فاتورة</h1>
          <p class="meta">الطلب ${printable.orderNumber} · ${formatDateTime(printable.createdAt)}</p>
          <p class="meta">الحالة: ${labelOf(ORDER_STATUS_AR, printable.status)} · ${labelOf(FULFILMENT_AR, printable.fulfilmentType)}</p>
          <p class="meta">العميل: ${printable.customer.fullName}${printable.customer.phone ? ` (${printable.customer.phone})` : ""}</p>
          <table><thead><tr><th>المنتج</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>${itemsHtml}</tbody></table>
          <p class="total">الإجمالي: ${formatCurrency(printable.total)}</p>
          </body></html>`;

        // Blob iframe avoids popup blockers and keeps print URL off the orders page path.
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const blobUrl = URL.createObjectURL(blob);
        const iframe = document.createElement("iframe");
        iframe.setAttribute("title", " ");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";
        iframe.style.opacity = "0";
        iframe.style.pointerEvents = "none";
        document.body.appendChild(iframe);

        const cleanup = () => {
          window.setTimeout(() => {
            iframe.remove();
            URL.revokeObjectURL(blobUrl);
          }, 500);
        };

        iframe.onload = () => {
          const frameWindow = iframe.contentWindow;
          if (!frameWindow) {
            setPrintError("تعذر تجهيز مستند الطباعة. حاول مرة أخرى.");
            cleanup();
            return;
          }
          try {
            frameWindow.document.title = "";
            frameWindow.focus();
            frameWindow.addEventListener("afterprint", cleanup, { once: true });
            window.setTimeout(cleanup, 60_000);
            frameWindow.print();
          } catch {
            setPrintError("تعذر بدء الطباعة. حاول مرة أخرى.");
            cleanup();
          }
        };
        iframe.src = blobUrl;
      } catch {
        setPrintError("تعذر تجهيز مستند الطباعة. حاول مرة أخرى.");
      }
    },
    onError: (err) => setPrintError(getErrorMessage(err)),
  });

  if (orderQuery.isLoading) return <LoadingState label="جاري تحميل الطلب…" />;
  if (orderQuery.isError || !orderQuery.data) {
    return <ErrorState message="لم يتم العثور على الطلب." onRetry={() => orderQuery.refetch()} />;
  }

  const order = orderQuery.data;
  const allowed = order.allowedTransitions ?? [];
  const nextStatuses = allowed.filter((s) => s !== "CANCELLED");
  const canCancel = canCancelOrder(user?.role) && allowed.includes("CANCELLED");

  const address = order.addressSnapshot as
    | { label?: string; recipientName?: string; phone?: string; city?: string; district?: string; street?: string; building?: string; floor?: string; apartment?: string; directions?: string }
    | null;
  const store = order.storeSnapshot as
    | {
        storeNameEn?: string;
        storeNameAr?: string;
        addressEn?: string;
        addressAr?: string;
        estimatedMinutesMin?: number;
        estimatedMinutesMax?: number;
      }
    | null;
  const coupon = order.couponSnapshot as { code?: string; discountType?: string; discountValue?: number | string } | null;

  return (
    <div>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            الطلب <span className="ltr-field">{order.orderNumber}</span>
            <CopyButton value={order.orderNumber} label="نسخ رقم الطلب" />
          </span>
        }
        breadcrumbs={[{ label: "الطلبات", href: "/orders" }, { label: order.orderNumber }]}
        actions={
          <Button variant="outline" isLoading={printMutation.isPending} onClick={() => printMutation.mutate()}>
            <Printer className="size-4" />
            طباعة الفاتورة
          </Button>
        }
      />

      {(formError || printError) && (
        <div className="mb-4 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-danger">
          {formError || printError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="lg:sticky lg:top-4 lg:z-20">
            <CardHeader>
              <CardTitle>الحالة والإجراءات</CardTitle>
              <OrderStatusBadge status={order.status} />
            </CardHeader>
            <CardBody>
              <div className="mb-4">
                <StatusTimeline status={order.status} fulfilmentType={order.fulfilmentType} />
              </div>

              <div className="flex flex-wrap gap-2">
                {nextStatuses.map((status) => (
                  <Button key={status} onClick={() => setNoteDialog({ status })}>
                    <Check className="size-4" />
                    تحديد كـ {labelOf(ORDER_STATUS_AR, status)}
                  </Button>
                ))}
                {canCancel && (
                  <Button variant="danger" onClick={() => setCancelDialog(true)}>
                    <X className="size-4" />
                    إلغاء الطلب
                  </Button>
                )}
              </div>

              {order.status === "CANCELLED" && order.cancellationReason && (
                <p className="mt-3 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
                  سبب الإلغاء: {order.cancellationReason}
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>عناصر الطلب</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              <table className="w-full text-start text-sm">
                <thead>
                  <tr className="border-b border-border-soft bg-cream/60 text-xs uppercase tracking-wide text-charcoal-soft">
                    <th className="px-5 py-2.5">المنتج</th>
                    <th className="px-5 py-2.5">سعر الوحدة</th>
                    <th className="px-5 py-2.5">الكمية</th>
                    <th className="px-5 py-2.5">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} className="border-b border-border-soft/70 last:border-0">
                      <td className="px-5 py-3">
                        <p className="font-medium text-charcoal">{item.productNameAr || item.productNameEn}</p>
                        {(item.variantNameAr || item.variantNameEn) && (
                          <p className="text-xs text-charcoal-soft">{item.variantNameAr || item.variantNameEn}</p>
                        )}
                        {item.sku && <p className="text-xs text-charcoal-soft ltr-field">{COMMON_AR.sku}: {item.sku}</p>}
                      </td>
                      <td className="px-5 py-3">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-5 py-3">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="px-5 py-3 font-medium">{formatCurrency(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-border-soft px-5 py-4">
                <div className="ms-auto max-w-xs space-y-1.5 text-sm">
                  <div className="flex justify-between text-charcoal-soft">
                    <span>الإجمالي الفرعي</span>
                    <span>{formatCurrency(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-charcoal-soft">
                    <span>الخصم</span>
                    <span>−{formatCurrency(order.discountAmount)}</span>
                  </div>
                  <div className="flex justify-between text-charcoal-soft">
                    <span>رسوم التوصيل</span>
                    <span>{formatCurrency(order.deliveryFee)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border-soft pt-1.5 text-base font-semibold text-charcoal">
                    <span>{COMMON_AR.total}</span>
                    <span>{formatCurrency(order.total)}</span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Boxes className="size-4 text-amber-700" />
                تأثير المخزون
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 p-0 sm:p-0">
              <div className="border-b border-border-soft px-5 py-3">
                <p className="mb-2 text-xs font-medium text-charcoal-soft">المنتجات المطلوبة</p>
                <ul className="space-y-2">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-charcoal">
                        {item.productNameAr || item.productNameEn}
                        {(item.variantNameAr || item.variantNameEn) && (
                          <span className="text-charcoal-soft"> ({item.variantNameAr || item.variantNameEn})</span>
                        )}
                      </span>
                      <span className="shrink-0 font-medium text-danger">−{item.quantity} {item.unit}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {inventoryMovementsQuery.isLoading && <LoadingState label="جاري تحميل حركات المخزون…" />}
              {inventoryMovementsQuery.data && inventoryMovementsQuery.data.length === 0 && (
                <p className="px-5 py-4 text-sm text-charcoal-soft">لا توجد حركات مخزون مسجّلة لهذا الطلب بعد.</p>
              )}
              {inventoryMovementsQuery.data && inventoryMovementsQuery.data.length > 0 && (
                <ul className="divide-y divide-border-soft">
                  {inventoryMovementsQuery.data.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div>
                        <p className="text-sm font-medium text-charcoal">
                          {labelOf(INVENTORY_MOVEMENT_TYPE_AR, m.type)}{" "}
                          <span className={m.quantityChange >= 0 ? "text-success" : "text-danger"}>
                            {m.quantityChange >= 0 ? "+" : ""}
                            {m.quantityChange}
                          </span>
                        </p>
                        {m.note && <p className="text-xs text-charcoal-soft">{m.note}</p>}
                      </div>
                      <div className="text-end text-xs text-charcoal-soft">
                        <p>{formatDateTime(m.createdAt)}</p>
                        <p>الرصيد: {m.quantityAfter}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>سجل الحالة</CardTitle>
            </CardHeader>
            <CardBody>
              {order.statusHistory && order.statusHistory.length > 0 ? (
                <StatusHistoryTimeline entries={order.statusHistory} />
              ) : (
                <p className="text-sm text-charcoal-soft">لا يوجد سجل حتى الآن.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>سجل الإشعارات</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              {order.notifications && order.notifications.length > 0 ? (
                <ul className="divide-y divide-border-soft">
                  {order.notifications.map((n) => (
                    <li key={n.id} className="px-5 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-charcoal">{n.titleAr || n.titleEn}</p>
                          <p className="text-xs text-charcoal-soft">{n.bodyAr || n.bodyEn}</p>
                        </div>
                        <span className="whitespace-nowrap text-xs text-charcoal-soft">{formatDateTime(n.createdAt)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-6 text-sm text-charcoal-soft">لا توجد إشعارات مرتبطة بهذا الطلب.</p>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{COMMON_AR.customer}</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-charcoal">
                <UserIcon className="size-4 text-charcoal-soft" />
                {order.user?.fullName ?? "—"}
              </div>
              {order.user?.phone && (
                <div className="flex items-center gap-2 text-charcoal-soft ltr-field">
                  {order.user.phone}
                  <CopyButton value={order.user.phone} />
                </div>
              )}
              {order.user?.email && (
                <div className="flex items-center gap-2 text-charcoal-soft ltr-field">
                  {order.user.email}
                  <CopyButton value={order.user.email} />
                </div>
              )}
              {order.customerNote && (
                <p className="mt-2 rounded-[var(--radius-md)] bg-cream px-3 py-2 text-charcoal-soft">
                  &ldquo;{order.customerNote}&rdquo;
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{order.fulfilmentType === "DELIVERY" ? "عنوان التوصيل" : "موقع الاستلام"}</CardTitle>
            </CardHeader>
            <CardBody className="space-y-1.5 text-sm text-charcoal-soft">
              {order.fulfilmentType === "DELIVERY" && address ? (
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <p className="font-medium text-charcoal">{address.recipientName}</p>
                    <p className="ltr-field">{address.phone}</p>
                    <p>
                      {[address.district, address.street, address.building, address.floor, address.apartment]
                        .filter(Boolean)
                        .join("، ")}
                    </p>
                    {address.directions && <p className="italic">{address.directions}</p>}
                  </div>
                </div>
              ) : store ? (
                <div className="flex items-start gap-2">
                  <Store className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <p className="font-medium text-charcoal">{store.storeNameAr || store.storeNameEn}</p>
                    <p>{store.addressAr || store.addressEn}</p>
                    {store.estimatedMinutesMin != null && (
                      <p>
                        الجاهزية خلال {store.estimatedMinutesMin}–{store.estimatedMinutesMax} دقيقة
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p>لا تتوفر تفاصيل.</p>
              )}
            </CardBody>
          </Card>

          {coupon && (
            <Card>
              <CardHeader>
                <CardTitle>القسيمة</CardTitle>
              </CardHeader>
              <CardBody className="space-y-1.5 text-sm text-charcoal-soft">
                <div className="flex justify-between">
                  <span>الرمز</span>
                  <span className="font-medium text-charcoal ltr-field">{coupon.code ?? "—"}</span>
                </div>
                {coupon.discountValue != null && (
                  <div className="flex justify-between">
                    <span>قيمة الخصم</span>
                    <span className="font-medium text-charcoal">
                      {coupon.discountType === "PERCENTAGE"
                        ? `${coupon.discountValue}%`
                        : formatCurrency(coupon.discountValue)}
                    </span>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>الدفع</CardTitle>
            </CardHeader>
            <CardBody className="space-y-1.5 text-sm text-charcoal-soft">
              <div className="flex justify-between">
                <span>طريقة الدفع</span>
                <span className="font-medium text-charcoal">{labelOf(PAYMENT_AR, order.paymentMethod)}</span>
              </div>
              <div className="flex justify-between">
                <span>تاريخ الطلب</span>
                <span>{formatDateTime(order.createdAt)}</span>
              </div>
              {order.confirmedAt && (
                <div className="flex justify-between">
                  <span>تاريخ التأكيد</span>
                  <span>{formatDateTime(order.confirmedAt)}</span>
                </div>
              )}
              {order.completedAt && (
                <div className="flex justify-between">
                  <span>تاريخ الإكتمال</span>
                  <span>{formatDateTime(order.completedAt)}</span>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <Modal
        open={Boolean(noteDialog)}
        onClose={() => {
          setNoteDialog(null);
          setNote("");
        }}
        title={noteDialog ? `تحديد كـ ${labelOf(ORDER_STATUS_AR, noteDialog.status)}` : ""}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setNoteDialog(null);
                setNote("");
              }}
            >
              {COMMON_AR.cancel}
            </Button>
            <Button
              onClick={() =>
                noteDialog && setStatusConfirm({ status: noteDialog.status, note })
              }
            >
              متابعة
            </Button>
          </>
        }
      >
        <Label>ملاحظة (اختياري)</Label>
        <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="أضف ملاحظة لهذا التغيير في الحالة…" />
      </Modal>

      <ConfirmDialog
        open={Boolean(statusConfirm)}
        onClose={() => setStatusConfirm(null)}
        onConfirm={() =>
          statusConfirm &&
          statusMutation.mutate({
            status: statusConfirm.status,
            note: statusConfirm.note.trim() || undefined,
          })
        }
        isLoading={statusMutation.isPending}
        variant="primary"
        title={statusConfirm ? `تأكيد: ${labelOf(ORDER_STATUS_AR, statusConfirm.status)}` : ""}
        description={
          statusConfirm ? (
            <div className="space-y-2">
              <p>هل تريد تحديث حالة هذا الطلب؟</p>
              {statusConfirm.note.trim() && (
                <p className="rounded-[var(--radius-md)] border border-border-soft bg-cream/50 px-2.5 py-1.5 text-xs">
                  الملاحظة: {statusConfirm.note.trim()}
                </p>
              )}
            </div>
          ) : null
        }
        confirmLabel={COMMON_AR.confirm}
      />

      <ConfirmDialog
        open={cancelDialog}
        onClose={() => {
          setCancelDialog(false);
          setCancelReason("");
          setFormError(null);
        }}
        onConfirm={() => {
          if (cancelReason.trim().length < 3) {
            setFormError("سبب الإلغاء يجب أن يكون 3 أحرف على الأقل.");
            return;
          }
          statusMutation.mutate({ status: "CANCELLED", cancellationReason: cancelReason.trim() });
        }}
        isLoading={statusMutation.isPending}
        variant="danger"
        title="إلغاء الطلب"
        description={
          <div className="space-y-3">
            <p>هل أنت متأكد من إلغاء هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div>
              <Label required>سبب الإلغاء</Label>
              <Textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="اشرح سبب إلغاء هذا الطلب…"
              />
              <FieldError
                message={cancelReason.trim().length > 0 && cancelReason.trim().length < 3 ? "3 أحرف على الأقل" : undefined}
              />
            </div>
          </div>
        }
        confirmLabel="إلغاء الطلب"
        cancelLabel={COMMON_AR.back}
      />
    </div>
  );
}
