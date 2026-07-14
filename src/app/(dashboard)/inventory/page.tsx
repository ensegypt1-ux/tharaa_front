"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, History, Minus, Plus, Search, SlidersHorizontal } from "lucide-react";
import { RequireRole } from "@/components/layout/RequireRole";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FilterBar } from "@/components/ui/FilterBar";
import { FormField } from "@/components/ui/FormField";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { StockStatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState, LoadingState } from "@/components/ui/LoadingState";
import { IconButton } from "@/components/ui/IconButton";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { listCategories } from "@/lib/api/categories";
import { adjustInventory, listInventory, listInventoryMovements, setInventoryQuantity } from "@/lib/api/inventory";
import type { InventoryRow } from "@/lib/types";
import { formatDateTime, formatNumber } from "@/lib/utils/format";
import { getErrorMessage } from "@/lib/api/errors";
import { COMMON_AR, INVENTORY_MOVEMENT_TYPE_AR, labelOf } from "@/lib/ar/labels";

function AdjustModal({
  row,
  onClose,
}: {
  row: InventoryRow;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"adjust" | "set">("adjust");
  const [delta, setDelta] = useState(0);
  const [quantity, setQuantity] = useState(row.quantity);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isDecrease =
    mode === "adjust" ? delta < 0 : quantity < row.quantity;

  const projectedQuantity = mode === "adjust" ? row.quantity + delta : quantity;

  const mutation = useMutation({
    mutationFn: async () => {
      if (mode === "adjust") {
        return adjustInventory({
          productId: row.productId ?? undefined,
          variantId: row.variantId ?? undefined,
          delta,
          note: note || undefined,
        });
      }
      return setInventoryQuantity({
        productId: row.productId ?? undefined,
        variantId: row.variantId ?? undefined,
        quantity,
        note: note || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      onClose();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const handleSave = () => {
    if (mode === "adjust" && delta === 0) {
      setError("أدخل قيمة تغيير غير صفرية.");
      return;
    }
    if (isDecrease) {
      setConfirmOpen(true);
      return;
    }
    mutation.mutate();
  };

  const itemLabel = row.productNameAr ?? row.variantNameAr ?? "—";

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={`تعديل المخزون — ${itemLabel}`}
        footer={
          <>
            <Button variant="outline" onClick={onClose}>
              {COMMON_AR.cancel}
            </Button>
            <Button isLoading={mutation.isPending} onClick={handleSave}>
              {COMMON_AR.save}
            </Button>
          </>
        }
      >
        {error && (
          <div className="mb-3 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("adjust")}
            className={`flex-1 rounded-[var(--radius-md)] border px-3 py-2 text-sm font-medium transition ${
              mode === "adjust" ? "border-amber-400 bg-amber-50 text-amber-800" : "border-border-soft text-charcoal-soft"
            }`}
          >
            تعديل بمقدار
          </button>
          <button
            type="button"
            onClick={() => setMode("set")}
            className={`flex-1 rounded-[var(--radius-md)] border px-3 py-2 text-sm font-medium transition ${
              mode === "set" ? "border-amber-400 bg-amber-50 text-amber-800" : "border-border-soft text-charcoal-soft"
            }`}
          >
            تحديد كمية دقيقة
          </button>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2 rounded-[var(--radius-md)] border border-border-soft bg-cream/50 p-3 text-center text-sm">
          <div>
            <p className="text-xs text-charcoal-soft">الفعلي</p>
            <p className="font-semibold text-charcoal">{formatNumber(row.quantity)}</p>
          </div>
          <div>
            <p className="text-xs text-charcoal-soft">{COMMON_AR.reserved}</p>
            <p className="font-semibold text-amber-700">{formatNumber(row.reservedQuantity)}</p>
          </div>
          <div>
            <p className="text-xs text-charcoal-soft">{COMMON_AR.available}</p>
            <p className="font-semibold text-success">{formatNumber(row.available)}</p>
          </div>
        </div>

        {mode === "adjust" ? (
          <FormField label="التغيير" hint="استخدم قيمة سالبة لخصم المخزون">
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDelta((d) => d - 1)}>
                <Minus className="size-4" />
              </Button>
              <Input
                type="number"
                value={delta}
                onChange={(e) => setDelta(parseInt(e.target.value, 10) || 0)}
                className="text-center"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => setDelta((d) => d + 1)}>
                <Plus className="size-4" />
              </Button>
            </div>
          </FormField>
        ) : (
          <FormField label="الكمية الجديدة (الفعلية)">
            <Input type="number" min={0} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)} />
          </FormField>
        )}

        <p className="mt-3 text-sm text-charcoal-soft">
          الكمية بعد التعديل:{" "}
          <span className={`font-medium ${projectedQuantity < row.quantity ? "text-danger" : "text-charcoal"}`}>
            {formatNumber(Math.max(0, projectedQuantity))}
          </span>
        </p>

        <FormField label="ملاحظة" className="mt-4">
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="سبب هذا التغيير…" />
        </FormField>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          mutation.mutate();
        }}
        isLoading={mutation.isPending}
        title="تأكيد خصم المخزون"
        description={
          <>
            سيتم خصم المخزون لـ «{itemLabel}» من{" "}
            <strong>{formatNumber(row.quantity)}</strong> إلى{" "}
            <strong>{formatNumber(Math.max(0, projectedQuantity))}</strong>.
            {row.reservedQuantity > 0 && projectedQuantity < row.reservedQuantity && (
              <span className="mt-2 block text-danger">
                تحذير: الكمية الجديدة أقل من المحجوز ({formatNumber(row.reservedQuantity)}).
              </span>
            )}
          </>
        }
        confirmLabel="تأكيد الخصم"
        variant="danger"
      />
    </>
  );
}

function MovementsModal({ row, onClose }: { row: InventoryRow; onClose: () => void }) {
  const movementsQuery = useQuery({
    queryKey: ["inventory-movements", row.id],
    queryFn: () => listInventoryMovements({ inventoryId: row.id, limit: 50 }),
  });

  const itemLabel = row.productNameAr ?? row.variantNameAr ?? "—";

  return (
    <Modal open onClose={onClose} title={`سجل الحركة — ${itemLabel}`} size="lg">
      {movementsQuery.isLoading && <LoadingState />}
      {movementsQuery.isError && (
        <p className="py-8 text-center text-sm text-danger">تعذر تحميل سجل الحركة.</p>
      )}
      {movementsQuery.data && movementsQuery.data.data.length === 0 && (
        <p className="py-8 text-center text-sm text-charcoal-soft">لا توجد حركات مسجلة بعد.</p>
      )}
      {movementsQuery.data && movementsQuery.data.data.length > 0 && (
        <ul className="divide-y divide-border-soft">
          {movementsQuery.data.data.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium text-charcoal">
                  {labelOf(INVENTORY_MOVEMENT_TYPE_AR, m.type)}{" "}
                  <span className={m.quantityChange >= 0 ? "text-success" : "text-danger"}>
                    {m.quantityChange >= 0 ? "+" : ""}
                    {formatNumber(m.quantityChange)}
                  </span>
                </p>
                {m.note && <p className="text-xs text-charcoal-soft">{m.note}</p>}
                {m.createdBy && <p className="text-xs text-charcoal-soft">بواسطة {m.createdBy.fullName}</p>}
              </div>
              <div className="text-end text-xs text-charcoal-soft">
                <p>{formatDateTime(m.createdAt)}</p>
                <p>الرصيد: {formatNumber(m.quantityAfter)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function InventoryPageInner() {
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [stockStatus, setStockStatus] = useState<"all" | "low" | "out">("all");
  const [page, setPage] = useState(1);
  const [adjustRow, setAdjustRow] = useState<InventoryRow | null>(null);
  const [movementsRow, setMovementsRow] = useState<InventoryRow | null>(null);
  const limit = 20;

  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: listCategories });

  const inventoryQuery = useQuery({
    queryKey: ["inventory", { q, categoryId, stockStatus, page }],
    queryFn: () =>
      listInventory({ page, limit, q: q || undefined, categoryId: categoryId || undefined, stockStatus }),
  });

  const columns: DataTableColumn<InventoryRow>[] = [
    {
      key: "name",
      header: COMMON_AR.product,
      render: (r) => (
        <div>
          <p className="font-medium text-charcoal">{r.productNameAr ?? r.variantNameAr}</p>
          {r.variantNameAr && r.productNameAr && <p className="text-xs text-charcoal-soft">{r.variantNameAr}</p>}
          <p className="text-xs text-charcoal-soft">
            {r.sku ?? COMMON_AR.noSku} · {r.categoryNameAr ?? COMMON_AR.uncategorized}
          </p>
        </div>
      ),
    },
    {
      key: "quantity",
      header: "الفعلي",
      render: (r) => <span className="font-medium tabular-nums">{formatNumber(r.quantity)}</span>,
    },
    {
      key: "reserved",
      header: COMMON_AR.reserved,
      render: (r) => (
        <span className={`tabular-nums ${r.reservedQuantity > 0 ? "text-amber-700" : "text-charcoal-soft"}`}>
          {formatNumber(r.reservedQuantity)}
        </span>
      ),
    },
    {
      key: "available",
      header: COMMON_AR.available,
      render: (r) => (
        <span
          className={`font-medium tabular-nums ${
            r.available <= 0 ? "text-danger" : r.stockStatus === "LOW" ? "text-amber-700" : "text-success"
          }`}
        >
          {formatNumber(r.available)}
        </span>
      ),
    },
    { key: "status", header: COMMON_AR.status, render: (r) => <StockStatusBadge status={r.stockStatus} /> },
    {
      key: "actions",
      header: COMMON_AR.actions,
      className: "text-end",
      headerClassName: "text-end",
      render: (r) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <IconButton label="سجل الحركة" size="sm" onClick={() => setMovementsRow(r)}>
            <History className="size-3.5" />
          </IconButton>
          <Button size="sm" variant="outline" onClick={() => setAdjustRow(r)}>
            <SlidersHorizontal className="size-3.5" />
            تعديل
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-shell animate-in">
      <PageHeader title="المخزون" description="مراقبة المخزون الفعلي والمحجوز والمتاح مع سجل الحركة." />

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
              placeholder="ابحث بالمنتج أو رمز المنتج…"
              className="ps-9"
            />
          </div>
          <Select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
            className="w-44"
          >
            <option value="">كل الأقسام</option>
            {categoriesQuery.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameAr}
              </option>
            ))}
          </Select>
          <Select
            value={stockStatus}
            onChange={(e) => {
              setStockStatus(e.target.value as typeof stockStatus);
              setPage(1);
            }}
            className="w-44"
          >
            <option value="all">كل مستويات المخزون</option>
            <option value="low">مخزون منخفض</option>
            <option value="out">غير متوفر</option>
          </Select>
        </FilterBar>

        {inventoryQuery.isLoading && <SkeletonTable rows={8} cols={6} />}
        {inventoryQuery.isError && (
          <ErrorState message="تعذر تحميل المخزون." onRetry={() => inventoryQuery.refetch()} />
        )}
        {inventoryQuery.data && inventoryQuery.data.data.length === 0 && (
          <EmptyState
            icon={Boxes}
            title="لا توجد بيانات مخزون"
            description={stockStatus !== "all" || q ? "حاول تعديل عوامل التصفية." : undefined}
          />
        )}
        {inventoryQuery.data && inventoryQuery.data.data.length > 0 && (
          <>
            <DataTable columns={columns} rows={inventoryQuery.data.data} rowKey={(r) => r.id} dense />
            <Pagination
              page={page}
              totalPages={inventoryQuery.data.meta.totalPages}
              total={inventoryQuery.data.meta.total}
              limit={limit}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      {adjustRow && <AdjustModal row={adjustRow} onClose={() => setAdjustRow(null)} />}
      {movementsRow && <MovementsModal row={movementsRow} onClose={() => setMovementsRow(null)} />}
    </div>
  );
}

export default function InventoryPage() {
  return (
    <RequireRole navKey="inventory">
      <InventoryPageInner />
    </RequireRole>
  );
}
