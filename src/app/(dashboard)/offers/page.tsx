"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Controller } from "react-hook-form";
import { z } from "zod";
import { useZodForm } from "@/lib/forms/useZodForm";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageIcon, Pencil, Plus, Search, Tag, Trash2 } from "lucide-react";
import { RequireRole } from "@/components/layout/RequireRole";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { FilterBar } from "@/components/ui/FilterBar";
import { FormField, FormSection } from "@/components/ui/FormField";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Badge, SchedulePhaseBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/LoadingState";
import { IconButton } from "@/components/ui/IconButton";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FileUploadButton } from "@/components/ui/FileUploadButton";
import { listCategories } from "@/lib/api/categories";
import { listProducts } from "@/lib/api/products";
import { createOffer, deleteOffer, listOffers, updateOffer, uploadOfferImage } from "@/lib/api/offers";
import type { Offer } from "@/lib/types";
import { formatCurrency, formatDateTime, getSchedulePhase, type SchedulePhase } from "@/lib/utils/format";
import { getErrorMessage } from "@/lib/api/errors";
import { COMMON_AR, DISCOUNT_TYPE_AR, OFFER_SCOPE_AR } from "@/lib/ar/labels";

const offerSchema = z.object({
  titleEn: z.string().min(1, "مطلوب"),
  titleAr: z.string().min(1, "مطلوب"),
  scope: z.enum(["PRODUCT", "CATEGORY"]),
  discountType: z.enum(["PERCENTAGE", "FIXED"]),
  discountValue: z.coerce.number().min(0),
  categoryId: z.string().optional(),
  productIds: z.array(z.string()).default([]),
  startsAt: z.string().min(1, "مطلوب"),
  endsAt: z.string().min(1, "مطلوب"),
  isActive: z.boolean().default(true),
});

type OfferFormValues = z.infer<typeof offerSchema>;

function toDateTimeLocal(value?: string): string {
  if (!value) return "";
  return value.slice(0, 16);
}

function OffersPageInner() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<"" | SchedulePhase>("");
  const [modal, setModal] = useState<{ mode: "create" | "edit"; offer?: Offer } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Offer | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const offersQuery = useQuery({ queryKey: ["offers"], queryFn: listOffers });
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: listCategories });
  const productsQuery = useQuery({
    queryKey: ["products", "offer-picker", productSearch],
    queryFn: () => listProducts({ page: 1, limit: 50, q: productSearch || undefined }),
    enabled: Boolean(modal),
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useZodForm(offerSchema, {
    defaultValues: {
      titleEn: "",
      titleAr: "",
      scope: "PRODUCT",
      discountType: "PERCENTAGE",
      discountValue: 10,
      productIds: [],
      startsAt: "",
      endsAt: "",
      isActive: true,
    },
  });

  const scope = watch("scope");
  const selectedProductIds = watch("productIds");

  const filteredOffers = useMemo(() => {
    if (!offersQuery.data) return [];
    let rows = [...offersQuery.data];
    const needle = q.trim().toLowerCase();
    if (needle) {
      rows = rows.filter(
        (o) => o.titleAr.toLowerCase().includes(needle) || o.titleEn.toLowerCase().includes(needle),
      );
    }
    if (phaseFilter) {
      rows = rows.filter((o) => getSchedulePhase(o.isActive, o.startsAt, o.endsAt) === phaseFilter);
    }
    return rows.sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
  }, [offersQuery.data, q, phaseFilter]);

  const openCreate = () => {
    reset({
      titleEn: "",
      titleAr: "",
      scope: "PRODUCT",
      discountType: "PERCENTAGE",
      discountValue: 10,
      productIds: [],
      startsAt: "",
      endsAt: "",
      isActive: true,
    });
    setFormError(null);
    setModal({ mode: "create" });
  };

  const openEdit = (offer: Offer) => {
    reset({
      titleEn: offer.titleEn,
      titleAr: offer.titleAr,
      scope: offer.scope,
      discountType: offer.discountType,
      discountValue: offer.discountValue,
      categoryId: offer.categoryId ?? undefined,
      productIds: offer.productIds,
      startsAt: toDateTimeLocal(offer.startsAt),
      endsAt: toDateTimeLocal(offer.endsAt),
      isActive: offer.isActive,
    });
    setFormError(null);
    setModal({ mode: "edit", offer });
  };

  const saveMutation = useMutation({
    mutationFn: async (values: OfferFormValues) => {
      const payload = {
        ...values,
        startsAt: new Date(values.startsAt).toISOString(),
        endsAt: new Date(values.endsAt).toISOString(),
        categoryId: values.scope === "CATEGORY" ? values.categoryId : undefined,
        productIds: values.scope === "PRODUCT" ? values.productIds : undefined,
      };
      if (modal?.mode === "edit" && modal.offer) {
        return updateOffer(modal.offer.id, payload);
      }
      return createOffer(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      setModal(null);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteOffer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      setDeleteTarget(null);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => uploadOfferImage(id, file),
    onMutate: ({ id }) => setUploadingId(id),
    onSettled: () => setUploadingId(null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["offers"] }),
  });

  const categoryMap = useMemo(
    () => new Map(categoriesQuery.data?.map((c) => [c.id, c.nameAr])),
    [categoriesQuery.data],
  );

  const columns: DataTableColumn<Offer>[] = [
    {
      key: "image",
      header: COMMON_AR.image,
      className: "w-16",
      render: (o) => (
        <div className="relative flex size-11 items-center justify-center overflow-hidden rounded-[var(--radius-md)] border border-border-soft bg-cream">
          {o.imageUrl ? (
            <Image src={o.imageUrl} alt={o.titleAr} fill className="object-cover" unoptimized />
          ) : (
            <ImageIcon className="size-5 text-charcoal-soft" />
          )}
        </div>
      ),
    },
    {
      key: "title",
      header: "العرض",
      render: (o) => (
        <div>
          <p className="font-medium text-charcoal">{o.titleAr}</p>
          <p className="text-xs text-charcoal-soft ltr-field">{o.titleEn}</p>
        </div>
      ),
    },
    {
      key: "scope",
      header: COMMON_AR.scope,
      render: (o) => (
        <Badge tone={o.scope === "CATEGORY" ? "blue" : "amber"}>
          {o.scope === "CATEGORY"
            ? categoryMap.get(o.categoryId ?? "") ?? OFFER_SCOPE_AR.CATEGORY
            : `${o.productIds.length} ${COMMON_AR.productsWord}`}
        </Badge>
      ),
    },
    {
      key: "discount",
      header: COMMON_AR.discount,
      render: (o) => (
        <span className="font-medium">
          {o.discountType === "PERCENTAGE" ? `${o.discountValue}%` : formatCurrency(o.discountValue)}
        </span>
      ),
    },
    {
      key: "period",
      header: COMMON_AR.period,
      render: (o) => (
        <div className="text-xs leading-relaxed text-charcoal-soft">
          <p>{formatDateTime(o.startsAt)}</p>
          <p className="text-charcoal-soft/70">←</p>
          <p>{formatDateTime(o.endsAt)}</p>
        </div>
      ),
    },
    {
      key: "phase",
      header: COMMON_AR.status,
      render: (o) => <SchedulePhaseBadge phase={getSchedulePhase(o.isActive, o.startsAt, o.endsAt)} />,
    },
    {
      key: "actions",
      header: COMMON_AR.actions,
      className: "text-end",
      headerClassName: "text-end",
      render: (o) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <FileUploadButton
            variant="ghost"
            label=""
            isLoading={uploadingId === o.id}
            onFileSelected={(file) => uploadMutation.mutate({ id: o.id, file })}
          />
          <IconButton label={COMMON_AR.edit} tone="amber" size="sm" onClick={() => openEdit(o)}>
            <Pencil className="size-4" />
          </IconButton>
          <IconButton label={COMMON_AR.delete} tone="danger" size="sm" onClick={() => setDeleteTarget(o)}>
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div className="page-shell animate-in">
      <PageHeader
        title="العروض"
        description="خصومات محدودة بفترة زمنية على المنتجات أو الأقسام."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            عرض جديد
          </Button>
        }
      />

      <Card>
        <FilterBar>
          <div className="relative w-64">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-charcoal-soft" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالعنوان…" className="ps-9" />
          </div>
          <Select
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value as typeof phaseFilter)}
            className="w-44"
          >
            <option value="">كل العروض</option>
            <option value="active">فعّالة</option>
            <option value="upcoming">قادمة</option>
            <option value="expired">منتهية</option>
            <option value="inactive">معطّلة</option>
          </Select>
        </FilterBar>

        {offersQuery.isLoading && <SkeletonTable rows={8} cols={7} />}
        {offersQuery.isError && (
          <ErrorState message="تعذر تحميل العروض." onRetry={() => offersQuery.refetch()} />
        )}
        {offersQuery.data && filteredOffers.length === 0 && (
          <EmptyState
            icon={Tag}
            title={offersQuery.data.length === 0 ? "لا توجد عروض بعد" : "لا توجد نتائج"}
            description={offersQuery.data.length === 0 ? undefined : "حاول تعديل عوامل التصفية."}
          />
        )}
        {filteredOffers.length > 0 && (
          <DataTable columns={columns} rows={filteredOffers} rowKey={(o) => o.id} dense />
        )}
      </Card>

      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        title={modal?.mode === "edit" ? "تعديل العرض" : "عرض جديد"}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setModal(null)}>
              {COMMON_AR.cancel}
            </Button>
            <Button
              isLoading={isSubmitting || saveMutation.isPending}
              onClick={handleSubmit((v: OfferFormValues) => saveMutation.mutate(v))}
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
          <FormSection title="معلومات العرض">
            <FormField label={COMMON_AR.titleAr} required error={errors.titleAr?.message}>
              <Input {...register("titleAr")} dir="rtl" />
            </FormField>
            <FormField label={COMMON_AR.titleEn} required error={errors.titleEn?.message}>
              <Input {...register("titleEn")} className="ltr-field" />
            </FormField>
          </FormSection>

          <FormSection title="الخصم والنطاق" description="حدد نوع الخصم وما يشمله العرض">
            <FormField label={COMMON_AR.scope} required>
              <Select {...register("scope")}>
                <option value="PRODUCT">منتجات محددة</option>
                <option value="CATEGORY">قسم كامل</option>
              </Select>
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

          {scope === "CATEGORY" ? (
            <FormField label={COMMON_AR.category} required>
              <Select {...register("categoryId")}>
                <option value="">اختر…</option>
                {categoriesQuery.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameAr}
                  </option>
                ))}
              </Select>
            </FormField>
          ) : (
            <FormField
              label={`المنتجات (${selectedProductIds.length} ${COMMON_AR.selected})`}
              required
              className="md:col-span-2"
            >
              <Input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="ابحث عن منتجات…"
                className="mb-2"
              />
              <Controller
                control={control}
                name="productIds"
                render={({ field }) => (
                  <div className="scrollbar-thin max-h-48 overflow-y-auto rounded-[var(--radius-md)] border border-border-soft">
                    {productsQuery.data?.data.map((p) => (
                      <label
                        key={p.id}
                        className="flex items-center gap-2 border-b border-border-soft/70 px-3 py-2 text-sm last:border-0 hover:bg-cream/60"
                      >
                        <input
                          type="checkbox"
                          className="size-4 accent-amber-500"
                          checked={field.value.includes(p.id)}
                          onChange={(e) => {
                            if (e.target.checked) field.onChange([...field.value, p.id]);
                            else field.onChange(field.value.filter((id: string) => id !== p.id));
                          }}
                        />
                        {p.nameAr}
                      </label>
                    ))}
                    {productsQuery.data?.data.length === 0 && (
                      <p className="px-3 py-4 text-center text-sm text-charcoal-soft">لم يتم العثور على منتجات.</p>
                    )}
                  </div>
                )}
              />
            </FormField>
          )}

          <FormSection title="الفترة الزمنية">
            <FormField label={COMMON_AR.startsAt} required error={errors.startsAt?.message}>
              <Input type="datetime-local" {...register("startsAt")} />
            </FormField>
            <FormField label={COMMON_AR.endsAt} required error={errors.endsAt?.message}>
              <Input type="datetime-local" {...register("endsAt")} />
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
        title="حذف العرض"
        description={`حذف عرض «${deleteTarget?.titleAr}»؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel={COMMON_AR.delete}
      />
    </div>
  );
}

export default function OffersPage() {
  return (
    <RequireRole navKey="offers">
      <OffersPageInner />
    </RequireRole>
  );
}
