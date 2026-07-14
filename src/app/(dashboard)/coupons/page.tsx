"use client";

import { useMemo, useState } from "react";
import { z } from "zod";
import { useZodForm } from "@/lib/forms/useZodForm";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Ticket, Trash2 } from "lucide-react";
import { RequireRole } from "@/components/layout/RequireRole";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { FilterBar } from "@/components/ui/FilterBar";
import { FormField, FormSection } from "@/components/ui/FormField";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { Badge, SchedulePhaseBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/LoadingState";
import { IconButton } from "@/components/ui/IconButton";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { createCoupon, deleteCoupon, listCoupons, updateCoupon } from "@/lib/api/coupons";
import type { Coupon } from "@/lib/types";
import { formatCurrency, formatDateTime, formatNumber, getSchedulePhase, type SchedulePhase } from "@/lib/utils/format";
import { getErrorMessage } from "@/lib/api/errors";
import { COMMON_AR, COUPON_APPLICABILITY_AR, DISCOUNT_TYPE_AR, labelOf } from "@/lib/ar/labels";

const couponSchema = z.object({
  code: z.string().min(2, "حرفان على الأقل"),
  discountType: z.enum(["PERCENTAGE", "FIXED"]),
  discountValue: z.coerce.number().min(0),
  minOrderAmount: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  maxDiscountAmount: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  usageLimit: z.union([z.coerce.number().int().min(1), z.literal("")]).optional(),
  perUserLimit: z.union([z.coerce.number().int().min(1), z.literal("")]).optional(),
  startsAt: z.string().min(1, "مطلوب"),
  expiresAt: z.string().min(1, "مطلوب"),
  applicability: z.enum(["ALL", "DELIVERY_ONLY", "PICKUP_ONLY"]).default("ALL"),
  isActive: z.boolean().default(true),
});

type CouponFormValues = z.infer<typeof couponSchema>;

function toDateTimeLocal(value?: string): string {
  if (!value) return "";
  return value.slice(0, 16);
}

function numOrNull(v: number | "" | undefined): number | null | undefined {
  if (v === "" || v === undefined) return null;
  return v;
}

function UsageCell({ coupon }: { coupon: Coupon }) {
  const used = coupon.usageCount ?? 0;
  const limit = coupon.usageLimit;
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;

  return (
    <div className="min-w-[7rem]">
      <p className="text-sm font-medium text-charcoal">
        {formatNumber(used)}
        {limit ? ` / ${formatNumber(limit)}` : ` · ${COMMON_AR.unlimited}`}
      </p>
      {limit != null && (
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-cream">
          <div
            className={`h-full rounded-full transition-all ${pct >= 90 ? "bg-danger" : pct >= 70 ? "bg-amber-500" : "bg-success"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      <p className="mt-0.5 text-xs text-charcoal-soft">
        {coupon.perUserLimit ? `${formatNumber(coupon.perUserLimit)}/مستخدم` : COMMON_AR.noLimit}
      </p>
    </div>
  );
}

function CouponsPageInner() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<"" | SchedulePhase>("");
  const [modal, setModal] = useState<{ mode: "create" | "edit"; coupon?: Coupon } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const limit = 20;

  const couponsQuery = useQuery({ queryKey: ["coupons", page], queryFn: () => listCoupons({ page, limit }) });

  const filteredCoupons = useMemo(() => {
    if (!couponsQuery.data) return [];
    let rows = [...couponsQuery.data.items];
    const needle = q.trim().toLowerCase();
    if (needle) rows = rows.filter((c) => c.code.toLowerCase().includes(needle));
    if (phaseFilter) {
      rows = rows.filter((c) => getSchedulePhase(c.isActive, c.startsAt, c.expiresAt) === phaseFilter);
    }
    return rows;
  }, [couponsQuery.data, q, phaseFilter]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useZodForm(couponSchema, {
    defaultValues: {
      code: "",
      discountType: "PERCENTAGE",
      discountValue: 10,
      startsAt: "",
      expiresAt: "",
      applicability: "ALL",
      isActive: true,
    },
  });

  const openCreate = () => {
    reset({
      code: "",
      discountType: "PERCENTAGE",
      discountValue: 10,
      startsAt: "",
      expiresAt: "",
      applicability: "ALL",
      isActive: true,
    });
    setFormError(null);
    setModal({ mode: "create" });
  };

  const openEdit = (coupon: Coupon) => {
    reset({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue),
      minOrderAmount: coupon.minOrderAmount != null ? Number(coupon.minOrderAmount) : "",
      maxDiscountAmount: coupon.maxDiscountAmount != null ? Number(coupon.maxDiscountAmount) : "",
      usageLimit: coupon.usageLimit ?? "",
      perUserLimit: coupon.perUserLimit ?? "",
      startsAt: toDateTimeLocal(coupon.startsAt),
      expiresAt: toDateTimeLocal(coupon.expiresAt),
      applicability: coupon.applicability,
      isActive: coupon.isActive,
    });
    setFormError(null);
    setModal({ mode: "edit", coupon });
  };

  const saveMutation = useMutation({
    mutationFn: async (values: CouponFormValues) => {
      const payload = {
        ...values,
        minOrderAmount: numOrNull(values.minOrderAmount),
        maxDiscountAmount: numOrNull(values.maxDiscountAmount),
        usageLimit: numOrNull(values.usageLimit) as number | null | undefined,
        perUserLimit: numOrNull(values.perUserLimit) as number | null | undefined,
        startsAt: new Date(values.startsAt).toISOString(),
        expiresAt: new Date(values.expiresAt).toISOString(),
      };
      if (modal?.mode === "edit" && modal.coupon) {
        return updateCoupon(modal.coupon.id, payload);
      }
      return createCoupon(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      setModal(null);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCoupon(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      setDeleteTarget(null);
    },
  });

  const columns: DataTableColumn<Coupon>[] = [
    {
      key: "code",
      header: COMMON_AR.code,
      render: (c) => <span className="font-mono font-semibold text-charcoal ltr-field">{c.code}</span>,
    },
    {
      key: "discount",
      header: COMMON_AR.discount,
      render: (c) => (
        <span className="font-medium">
          {c.discountType === "PERCENTAGE" ? `${c.discountValue}%` : formatCurrency(c.discountValue)}
        </span>
      ),
    },
    {
      key: "applicability",
      header: COMMON_AR.applicability,
      render: (c) => <Badge tone="blue">{labelOf(COUPON_APPLICABILITY_AR, c.applicability)}</Badge>,
    },
    { key: "usage", header: COMMON_AR.usage, render: (c) => <UsageCell coupon={c} /> },
    {
      key: "period",
      header: "الصلاحية",
      render: (c) => (
        <div className="text-xs leading-relaxed text-charcoal-soft">
          <p>{formatDateTime(c.startsAt)}</p>
          <p className="text-charcoal-soft/70">←</p>
          <p>{formatDateTime(c.expiresAt)}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: COMMON_AR.status,
      render: (c) => <SchedulePhaseBadge phase={getSchedulePhase(c.isActive, c.startsAt, c.expiresAt)} />,
    },
    {
      key: "actions",
      header: COMMON_AR.actions,
      className: "text-end",
      headerClassName: "text-end",
      render: (c) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <IconButton label={COMMON_AR.edit} tone="amber" size="sm" onClick={() => openEdit(c)}>
            <Pencil className="size-4" />
          </IconButton>
          <IconButton label={COMMON_AR.delete} tone="danger" size="sm" onClick={() => setDeleteTarget(c)}>
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div className="page-shell animate-in">
      <PageHeader
        title="الكوبونات"
        description="أكواد خصم مع تتبع الاستخدام والصلاحية."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            كوبون جديد
          </Button>
        }
      />

      <Card>
        <FilterBar>
          <div className="relative w-64">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-charcoal-soft" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث بالرمز…"
              className="ps-9 uppercase ltr-field"
            />
          </div>
          <Select
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value as typeof phaseFilter)}
            className="w-44"
          >
            <option value="">كل الكوبونات</option>
            <option value="active">فعّالة</option>
            <option value="upcoming">قادمة</option>
            <option value="expired">منتهية</option>
            <option value="inactive">معطّلة</option>
          </Select>
        </FilterBar>

        {couponsQuery.isLoading && <SkeletonTable rows={8} cols={7} />}
        {couponsQuery.isError && (
          <ErrorState message="تعذر تحميل الكوبونات." onRetry={() => couponsQuery.refetch()} />
        )}
        {couponsQuery.data && filteredCoupons.length === 0 && (
          <EmptyState
            icon={Ticket}
            title={couponsQuery.data.items.length === 0 ? "لا توجد كوبونات بعد" : "لا توجد نتائج"}
            description={couponsQuery.data.items.length === 0 ? undefined : "حاول تعديل عوامل التصفية."}
          />
        )}
        {filteredCoupons.length > 0 && (
          <>
            <DataTable columns={columns} rows={filteredCoupons} rowKey={(c) => c.id} dense />
            <Pagination
              page={page}
              totalPages={couponsQuery.data?.meta.totalPages ?? 1}
              total={couponsQuery.data?.meta.total ?? 0}
              limit={limit}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        title={modal?.mode === "edit" ? "تعديل الكوبون" : "كوبون جديد"}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setModal(null)}>
              {COMMON_AR.cancel}
            </Button>
            <Button
              isLoading={isSubmitting || saveMutation.isPending}
              onClick={handleSubmit((v: CouponFormValues) => saveMutation.mutate(v))}
            >
              {COMMON_AR.save}
            </Button>
          </>
        }
      >
        {formError && (
          <div className="mb-3 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
            {formError}
          </div>
        )}
        <div className="space-y-5">
          <FormSection title="الرمز والخصم">
            <FormField label={COMMON_AR.code} required error={errors.code?.message} hint="يُحوَّل تلقائياً لأحرف كبيرة">
              <Input {...register("code")} placeholder="WELCOME10" className="uppercase ltr-field" />
            </FormField>
            <FormField label="نوع الخصم" required>
              <Select {...register("discountType")}>
                <option value="PERCENTAGE">{DISCOUNT_TYPE_AR.PERCENTAGE}</option>
                <option value="FIXED">{DISCOUNT_TYPE_AR.FIXED}</option>
              </Select>
            </FormField>
            <FormField label="قيمة الخصم" required>
              <Input type="number" step="0.01" min={0} {...register("discountValue")} />
            </FormField>
          </FormSection>

          <FormSection title="شروط الاستخدام" description="حدود اختيارية على الطلب والخصم">
            <FormField label={COMMON_AR.minOrderAmount} hint="اتركه فارغاً لعدم وجود حد أدنى">
              <Input type="number" step="0.01" min={0} {...register("minOrderAmount")} placeholder="بدون حد أدنى" />
            </FormField>
            <FormField label={COMMON_AR.maxDiscountAmount} hint="للخصومات النسبية فقط">
              <Input type="number" step="0.01" min={0} {...register("maxDiscountAmount")} placeholder="بدون سقف" />
            </FormField>
            <FormField label={COMMON_AR.usageLimit} hint={COMMON_AR.unlimited}>
              <Input type="number" min={1} {...register("usageLimit")} placeholder={COMMON_AR.unlimited} />
            </FormField>
            <FormField label={COMMON_AR.perUserLimit} hint={COMMON_AR.noLimit}>
              <Input type="number" min={1} {...register("perUserLimit")} placeholder={COMMON_AR.noLimit} />
            </FormField>
          </FormSection>

          <FormSection title="الصلاحية والتطبيق">
            <FormField label={COMMON_AR.startsAt} required error={errors.startsAt?.message}>
              <Input type="datetime-local" {...register("startsAt")} />
            </FormField>
            <FormField label={COMMON_AR.expiresAt} required error={errors.expiresAt?.message}>
              <Input type="datetime-local" {...register("expiresAt")} />
            </FormField>
            <FormField label={COMMON_AR.applicability}>
              <Select {...register("applicability")}>
                <option value="ALL">{COUPON_APPLICABILITY_AR.ALL}</option>
                <option value="DELIVERY_ONLY">{COUPON_APPLICABILITY_AR.DELIVERY_ONLY}</option>
                <option value="PICKUP_ONLY">{COUPON_APPLICABILITY_AR.PICKUP_ONLY}</option>
              </Select>
            </FormField>
          </FormSection>

          <label className="flex items-center gap-2 text-sm text-charcoal">
            <input type="checkbox" className="size-4 accent-amber-500" {...register("isActive")} />
            {COMMON_AR.active}
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isLoading={deleteMutation.isPending}
        title="حذف الكوبون"
        description={`حذف كوبون «${deleteTarget?.code}»؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel={COMMON_AR.delete}
      />
    </div>
  );
}

export default function CouponsPage() {
  return (
    <RequireRole navKey="coupons">
      <CouponsPageInner />
    </RequireRole>
  );
}
