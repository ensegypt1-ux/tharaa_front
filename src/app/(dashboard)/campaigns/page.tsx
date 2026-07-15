"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Controller } from "react-hook-form";
import { z } from "zod";
import { useZodForm } from "@/lib/forms/useZodForm";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageIcon, Megaphone, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
import { OfferImageUploader } from "@/components/offers/OfferImageUploader";
import { listCategories } from "@/lib/api/categories";
import { listProducts } from "@/lib/api/products";
import { listOffers } from "@/lib/api/offers";
import { listCoupons } from "@/lib/api/coupons";
import {
  createCampaign,
  deleteCampaign,
  deleteCampaignImage,
  listCampaigns,
  updateCampaign,
  uploadCampaignImage,
} from "@/lib/api/campaigns";
import type { Campaign, CampaignDestinationType } from "@/lib/types";
import {
  formatDateTime,
  formatNumber,
  getSchedulePhase,
  type SchedulePhase,
} from "@/lib/utils/format";
import { getErrorMessage } from "@/lib/api/errors";
import { CAMPAIGN_DESTINATION_AR, COMMON_AR } from "@/lib/ar/labels";

const DESTINATIONS_WITH_ID: CampaignDestinationType[] = [
  "OFFER",
  "CATEGORY",
  "PRODUCT",
  "COUPON",
];

const campaignSchema = z
  .object({
    titleAr: z.string().min(1, "مطلوب"),
    titleEn: z.string().min(1, "مطلوب"),
    subtitleAr: z.string().optional(),
    subtitleEn: z.string().optional(),
    buttonLabelAr: z.string().optional(),
    buttonLabelEn: z.string().optional(),
    startsAt: z.string().min(1, "مطلوب"),
    endsAt: z.string().min(1, "مطلوب"),
    isActive: z.boolean().default(true),
    sortOrder: z.coerce.number().int().min(0),
    destinationType: z.enum(["OFFER", "CATEGORY", "PRODUCT", "COUPON", "CART", "NONE"]),
    destinationId: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (DESTINATIONS_WITH_ID.includes(values.destinationType) && !values.destinationId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["destinationId"],
        message: "اختر الوجهة",
      });
    }
  });

type CampaignFormValues = z.infer<typeof campaignSchema>;
type CampaignFilter = "" | SchedulePhase | "no-image";

function toDateTimeLocal(value?: string): string {
  if (!value) return "";
  return value.slice(0, 16);
}

function CampaignsPageInner() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<CampaignFilter>("");
  const [modal, setModal] = useState<{ mode: "create" | "edit"; campaign?: Campaign } | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);
  const [removeImageTarget, setRemoveImageTarget] = useState<Campaign | null>(null);
  const [destinationSearch, setDestinationSearch] = useState("");
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const campaignsQuery = useQuery({ queryKey: ["campaigns"], queryFn: listCampaigns });
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: listCategories });
  const offersQuery = useQuery({ queryKey: ["offers"], queryFn: listOffers });
  const couponsQuery = useQuery({
    queryKey: ["coupons", "campaign-labels"],
    queryFn: () => listCoupons({ page: 1, limit: 100 }),
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useZodForm(campaignSchema, {
    defaultValues: {
      titleAr: "",
      titleEn: "",
      subtitleAr: "",
      subtitleEn: "",
      buttonLabelAr: "",
      buttonLabelEn: "",
      startsAt: "",
      endsAt: "",
      isActive: true,
      sortOrder: 0,
      destinationType: "NONE",
      destinationId: "",
    },
  });

  const destinationType = watch("destinationType");
  const destinationId = watch("destinationId");

  const productsQuery = useQuery({
    queryKey: ["products", "campaign-picker", destinationSearch],
    queryFn: () => listProducts({ page: 1, limit: 50, q: destinationSearch || undefined }),
    enabled: Boolean(modal) && destinationType === "PRODUCT",
  });

  useEffect(() => {
    if (!DESTINATIONS_WITH_ID.includes(destinationType)) {
      setValue("destinationId", "");
    }
  }, [destinationType, setValue]);

  const filteredCampaigns = useMemo(() => {
    if (!campaignsQuery.data) return [];
    let rows = [...campaignsQuery.data];
    const needle = q.trim().toLowerCase();
    if (needle) {
      rows = rows.filter(
        (c) =>
          c.titleAr.toLowerCase().includes(needle) ||
          c.titleEn.toLowerCase().includes(needle) ||
          (c.subtitleAr ?? "").toLowerCase().includes(needle) ||
          (c.subtitleEn ?? "").toLowerCase().includes(needle),
      );
    }
    if (phaseFilter === "no-image") {
      rows = rows.filter((c) => !c.imageUrl);
    } else if (phaseFilter) {
      rows = rows.filter(
        (c) => getSchedulePhase(c.isActive, c.startsAt, c.endsAt) === phaseFilter,
      );
    }
    return rows.sort((a, b) => a.sortOrder - b.sortOrder || b.startsAt.localeCompare(a.startsAt));
  }, [campaignsQuery.data, q, phaseFilter]);

  const categoryMap = useMemo(
    () => new Map(categoriesQuery.data?.map((c) => [c.id, c.nameAr]) ?? []),
    [categoriesQuery.data],
  );
  const offerMap = useMemo(
    () => new Map(offersQuery.data?.map((o) => [o.id, o.titleAr]) ?? []),
    [offersQuery.data],
  );
  const couponMap = useMemo(
    () => new Map(couponsQuery.data?.items.map((c) => [c.id, c.code]) ?? []),
    [couponsQuery.data],
  );
  const productMap = useMemo(() => {
    const map = new Map<string, string>();
    productsQuery.data?.data.forEach((p) => map.set(p.id, p.nameAr));
    return map;
  }, [productsQuery.data]);

  const destinationLabel = (campaign: Campaign): string => {
    const typeLabel = CAMPAIGN_DESTINATION_AR[campaign.destinationType] ?? campaign.destinationType;
    if (!DESTINATIONS_WITH_ID.includes(campaign.destinationType) || !campaign.destinationId) {
      return typeLabel;
    }
    const resolved =
      campaign.destinationType === "OFFER"
        ? offerMap.get(campaign.destinationId)
        : campaign.destinationType === "CATEGORY"
          ? categoryMap.get(campaign.destinationId)
          : campaign.destinationType === "COUPON"
            ? couponMap.get(campaign.destinationId)
            : productMap.get(campaign.destinationId);
    return resolved ? `${typeLabel}: ${resolved}` : typeLabel;
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["campaigns"] });

  const openCreate = () => {
    reset({
      titleAr: "",
      titleEn: "",
      subtitleAr: "",
      subtitleEn: "",
      buttonLabelAr: "",
      buttonLabelEn: "",
      startsAt: "",
      endsAt: "",
      isActive: true,
      sortOrder: 0,
      destinationType: "NONE",
      destinationId: "",
    });
    setDestinationSearch("");
    setPendingImageFile(null);
    setFormError(null);
    setActionError(null);
    setModal({ mode: "create" });
  };

  const openEdit = (campaign: Campaign) => {
    reset({
      titleAr: campaign.titleAr,
      titleEn: campaign.titleEn,
      subtitleAr: campaign.subtitleAr ?? "",
      subtitleEn: campaign.subtitleEn ?? "",
      buttonLabelAr: campaign.buttonLabelAr ?? "",
      buttonLabelEn: campaign.buttonLabelEn ?? "",
      startsAt: toDateTimeLocal(campaign.startsAt),
      endsAt: toDateTimeLocal(campaign.endsAt),
      isActive: campaign.isActive,
      sortOrder: campaign.sortOrder,
      destinationType: campaign.destinationType,
      destinationId: campaign.destinationId ?? "",
    });
    setDestinationSearch("");
    setPendingImageFile(null);
    setFormError(null);
    setActionError(null);
    setModal({ mode: "edit", campaign });
  };

  const uploadFor = async (id: string, file: File) => {
    setUploadingId(id);
    setUploadProgress(0);
    setActionError(null);
    try {
      const updated = await uploadCampaignImage(id, file, setUploadProgress);
      invalidate();
      if (modal?.mode === "edit" && modal.campaign?.id === id) {
        setModal({ mode: "edit", campaign: updated });
      }
    } catch (err) {
      setActionError(getErrorMessage(err));
      throw err;
    } finally {
      setUploadingId(null);
      setUploadProgress(null);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (values: CampaignFormValues) => {
      const needsId = DESTINATIONS_WITH_ID.includes(values.destinationType);
      const payload = {
        titleAr: values.titleAr,
        titleEn: values.titleEn,
        subtitleAr: values.subtitleAr?.trim() || null,
        subtitleEn: values.subtitleEn?.trim() || null,
        buttonLabelAr: values.buttonLabelAr?.trim() || null,
        buttonLabelEn: values.buttonLabelEn?.trim() || null,
        startsAt: new Date(values.startsAt).toISOString(),
        endsAt: new Date(values.endsAt).toISOString(),
        isActive: values.isActive,
        sortOrder: values.sortOrder,
        destinationType: values.destinationType,
        destinationId: needsId ? values.destinationId || null : null,
      };
      if (modal?.mode === "edit" && modal.campaign) {
        return updateCampaign(modal.campaign.id, payload);
      }
      const created = await createCampaign(payload);
      if (pendingImageFile) {
        try {
          return await uploadCampaignImage(created.id, pendingImageFile, setUploadProgress);
        } catch (err) {
          invalidate();
          setModal({ mode: "edit", campaign: created });
          setPendingImageFile(null);
          throw new Error(
            `تم إنشاء الحملة لكن تعذر رفع الصورة: ${getErrorMessage(err)}`,
          );
        }
      }
      return created;
    },
    onMutate: () => {
      if (pendingImageFile) setUploadingId("pending");
    },
    onSuccess: () => {
      invalidate();
      setPendingImageFile(null);
      setModal(null);
      setFormError(null);
      setActionError(null);
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : getErrorMessage(err)),
    onSettled: () => {
      setUploadingId(null);
      setUploadProgress(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCampaign(id),
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
    },
  });

  const removeImageMutation = useMutation({
    mutationFn: (id: string) => deleteCampaignImage(id),
    onSuccess: (updated) => {
      invalidate();
      setRemoveImageTarget(null);
      setActionError(null);
      if (modal?.mode === "edit" && modal.campaign?.id === updated.id) {
        setModal({ mode: "edit", campaign: updated });
      }
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateCampaign(id, { isActive }),
    onSuccess: () => {
      invalidate();
      setActionError(null);
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  });

  const filteredOffers = useMemo(() => {
    const rows = offersQuery.data ?? [];
    const needle = destinationSearch.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (o) =>
        o.titleAr.toLowerCase().includes(needle) || o.titleEn.toLowerCase().includes(needle),
    );
  }, [offersQuery.data, destinationSearch]);

  const filteredCategories = useMemo(() => {
    const rows = categoriesQuery.data ?? [];
    const needle = destinationSearch.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (c) =>
        c.nameAr.toLowerCase().includes(needle) || c.nameEn.toLowerCase().includes(needle),
    );
  }, [categoriesQuery.data, destinationSearch]);

  const filteredCoupons = useMemo(() => {
    const rows = couponsQuery.data?.items ?? [];
    const needle = destinationSearch.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((c) => c.code.toLowerCase().includes(needle));
  }, [couponsQuery.data, destinationSearch]);

  const columns: DataTableColumn<Campaign>[] = [
    {
      key: "image",
      header: COMMON_AR.image,
      className: "w-16",
      render: (c) => (
        <div className="relative flex size-11 items-center justify-center overflow-hidden rounded-[var(--radius-md)] border border-border-soft bg-cream">
          {c.imageUrl ? (
            <Image src={c.imageUrl} alt={c.titleAr} fill className="object-cover" unoptimized />
          ) : (
            <ImageIcon className="size-5 text-charcoal-soft" />
          )}
        </div>
      ),
    },
    {
      key: "titleAr",
      header: COMMON_AR.titleAr,
      render: (c) => <p className="font-medium text-charcoal">{c.titleAr}</p>,
    },
    {
      key: "destination",
      header: "الوجهة",
      render: (c) => (
        <Badge tone="blue">
          {destinationLabel(c)}
        </Badge>
      ),
    },
    {
      key: "startsAt",
      header: COMMON_AR.startsAt,
      render: (c) => <span className="text-xs text-charcoal-soft">{formatDateTime(c.startsAt)}</span>,
    },
    {
      key: "endsAt",
      header: COMMON_AR.endsAt,
      render: (c) => <span className="text-xs text-charcoal-soft">{formatDateTime(c.endsAt)}</span>,
    },
    {
      key: "phase",
      header: COMMON_AR.status,
      render: (c) => <SchedulePhaseBadge phase={getSchedulePhase(c.isActive, c.startsAt, c.endsAt)} />,
    },
    {
      key: "sortOrder",
      header: "الترتيب",
      render: (c) => <span className="tabular-nums">{formatNumber(c.sortOrder)}</span>,
    },
    {
      key: "actions",
      header: COMMON_AR.actions,
      className: "text-end",
      headerClassName: "text-end",
      render: (c) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            disabled={toggleActiveMutation.isPending}
            onClick={() => toggleActiveMutation.mutate({ id: c.id, isActive: !c.isActive })}
          >
            {c.isActive ? "تعطيل" : "تفعيل"}
          </Button>
          <IconButton label={COMMON_AR.edit} tone="amber" size="sm" onClick={() => openEdit(c)}>
            <Pencil className="size-4" />
          </IconButton>
          <IconButton
            label={COMMON_AR.delete}
            tone="danger"
            size="sm"
            onClick={() => setDeleteTarget(c)}
          >
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      ),
    },
  ];

  const renderDestinationPicker = () => {
    if (destinationType === "CART" || destinationType === "NONE") {
      return (
        <p className="text-sm text-charcoal-soft md:col-span-2">
          لا يلزم اختيار معرّف وجهة لهذا النوع.
        </p>
      );
    }

    return (
      <FormField
        label="معرّف الوجهة"
        required
        error={errors.destinationId?.message}
        className="md:col-span-2"
      >
        <Input
          value={destinationSearch}
          onChange={(e) => setDestinationSearch(e.target.value)}
          placeholder={
            destinationType === "OFFER"
              ? "ابحث عن عرض…"
              : destinationType === "CATEGORY"
                ? "ابحث عن قسم…"
                : destinationType === "COUPON"
                  ? "ابحث عن كوبون…"
                  : "ابحث عن منتج…"
          }
          className="mb-2"
        />
        <Controller
          control={control}
          name="destinationId"
          render={({ field }) => (
            <div className="scrollbar-thin max-h-48 overflow-y-auto rounded-[var(--radius-md)] border border-border-soft">
              {destinationType === "OFFER" &&
                filteredOffers.map((o) => (
                  <label
                    key={o.id}
                    className="flex items-center gap-2 border-b border-border-soft/70 px-3 py-2 text-sm last:border-0 hover:bg-cream/60"
                  >
                    <input
                      type="radio"
                      className="size-4 accent-amber-500"
                      checked={field.value === o.id}
                      onChange={() => field.onChange(o.id)}
                    />
                    {o.titleAr}
                  </label>
                ))}
              {destinationType === "CATEGORY" &&
                filteredCategories.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 border-b border-border-soft/70 px-3 py-2 text-sm last:border-0 hover:bg-cream/60"
                  >
                    <input
                      type="radio"
                      className="size-4 accent-amber-500"
                      checked={field.value === c.id}
                      onChange={() => field.onChange(c.id)}
                    />
                    {c.nameAr}
                  </label>
                ))}
              {destinationType === "COUPON" &&
                filteredCoupons.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 border-b border-border-soft/70 px-3 py-2 text-sm last:border-0 hover:bg-cream/60"
                  >
                    <input
                      type="radio"
                      className="size-4 accent-amber-500"
                      checked={field.value === c.id}
                      onChange={() => field.onChange(c.id)}
                    />
                    <span className="ltr-field font-medium">{c.code}</span>
                  </label>
                ))}
              {destinationType === "PRODUCT" &&
                productsQuery.data?.data.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 border-b border-border-soft/70 px-3 py-2 text-sm last:border-0 hover:bg-cream/60"
                  >
                    <input
                      type="radio"
                      className="size-4 accent-amber-500"
                      checked={field.value === p.id}
                      onChange={() => field.onChange(p.id)}
                    />
                    {p.nameAr}
                  </label>
                ))}

              {((destinationType === "OFFER" && filteredOffers.length === 0) ||
                (destinationType === "CATEGORY" && filteredCategories.length === 0) ||
                (destinationType === "COUPON" && filteredCoupons.length === 0) ||
                (destinationType === "PRODUCT" &&
                  (productsQuery.data?.data.length ?? 0) === 0)) && (
                <p className="px-3 py-4 text-center text-sm text-charcoal-soft">لا توجد نتائج.</p>
              )}
            </div>
          )}
        />
        {destinationId && (
          <p className="mt-2 text-xs text-charcoal-soft">
            المحدد: <span className="ltr-field">{destinationId}</span>
          </p>
        )}
      </FormField>
    );
  };

  return (
    <div className="page-shell animate-in">
      <PageHeader
        title="الحملات"
        description="شرائط ترويجية للشاشة الرئيسية مع وجهة وجدول عرض وصورة."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            حملة جديدة
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
              placeholder="ابحث بالعنوان…"
              className="ps-9"
            />
          </div>
          <Select
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value as CampaignFilter)}
            className="w-48"
          >
            <option value="">كل الحملات</option>
            <option value="active">فعّالة</option>
            <option value="inactive">معطّلة</option>
            <option value="upcoming">قادمة</option>
            <option value="expired">منتهية</option>
            <option value="no-image">بلا صورة</option>
          </Select>
        </FilterBar>

        {actionError && !modal && (
          <div className="mb-3 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
            {actionError}
          </div>
        )}

        {campaignsQuery.isLoading && <SkeletonTable rows={8} cols={8} />}
        {campaignsQuery.isError && (
          <ErrorState message="تعذر تحميل الحملات." onRetry={() => campaignsQuery.refetch()} />
        )}
        {campaignsQuery.data && filteredCampaigns.length === 0 && (
          <EmptyState
            icon={Megaphone}
            title={campaignsQuery.data.length === 0 ? "لا توجد حملات بعد" : "لا توجد نتائج"}
            description={
              campaignsQuery.data.length === 0
                ? undefined
                : phaseFilter === "no-image"
                  ? "لا توجد حملات بلا صورة حاليًا."
                  : "حاول تعديل عوامل التصفية."
            }
          />
        )}
        {filteredCampaigns.length > 0 && (
          <DataTable columns={columns} rows={filteredCampaigns} rowKey={(c) => c.id} dense />
        )}
      </Card>

      <Modal
        open={Boolean(modal)}
        onClose={() => {
          setModal(null);
          setPendingImageFile(null);
        }}
        title={modal?.mode === "edit" ? "تعديل الحملة" : "حملة جديدة"}
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setModal(null);
                setPendingImageFile(null);
              }}
            >
              {COMMON_AR.cancel}
            </Button>
            <Button
              isLoading={isSubmitting || saveMutation.isPending || uploadingId === "pending"}
              onClick={handleSubmit((v: CampaignFormValues) => saveMutation.mutate(v))}
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
        {actionError && (
          <div className="mb-3 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
            {actionError}
          </div>
        )}
        <div className="space-y-5">
          <FormSection title="معلومات الحملة">
            <FormField label={COMMON_AR.titleAr} required error={errors.titleAr?.message}>
              <Input {...register("titleAr")} dir="rtl" />
            </FormField>
            <FormField label={COMMON_AR.titleEn} required error={errors.titleEn?.message}>
              <Input {...register("titleEn")} className="ltr-field" />
            </FormField>
            <FormField label="العنوان الفرعي بالعربية">
              <Input {...register("subtitleAr")} dir="rtl" />
            </FormField>
            <FormField label="العنوان الفرعي بالإنجليزية">
              <Input {...register("subtitleEn")} className="ltr-field" />
            </FormField>
            <FormField label="نص الزر بالعربية">
              <Input {...register("buttonLabelAr")} dir="rtl" />
            </FormField>
            <FormField label="نص الزر بالإنجليزية">
              <Input {...register("buttonLabelEn")} className="ltr-field" />
            </FormField>
            <FormField label="الترتيب" required error={errors.sortOrder?.message}>
              <Input type="number" min={0} step={1} {...register("sortOrder")} />
            </FormField>
          </FormSection>

          <FormSection title="صورة الحملة" description="JPG / PNG / WebP — حتى 5 ميغابايت">
            <div className="md:col-span-2">
              {modal?.mode === "edit" && modal.campaign ? (
                <OfferImageUploader
                  imageUrl={modal.campaign.imageUrl}
                  isUploading={uploadingId === modal.campaign.id}
                  progress={uploadingId === modal.campaign.id ? uploadProgress : null}
                  onUpload={(file) => uploadFor(modal.campaign!.id, file)}
                  onDelete={() => setRemoveImageTarget(modal.campaign!)}
                />
              ) : (
                <OfferImageUploader
                  pendingOnly
                  pendingHint="سيتم رفع الصورة بعد حفظ الحملة."
                  isUploading={uploadingId === "pending"}
                  progress={uploadingId === "pending" ? uploadProgress : null}
                  onSelectPending={setPendingImageFile}
                />
              )}
            </div>
          </FormSection>

          <FormSection title="الوجهة" description="حدد أين يذهب المستخدم عند الضغط على الحملة">
            <FormField label="نوع الوجهة" required>
              <Select
                value={destinationType}
                onChange={(e) => {
                  setValue("destinationType", e.target.value as CampaignDestinationType, {
                    shouldValidate: true,
                  });
                  setDestinationSearch("");
                }}
              >
                <option value="NONE">{CAMPAIGN_DESTINATION_AR.NONE}</option>
                <option value="OFFER">{CAMPAIGN_DESTINATION_AR.OFFER}</option>
                <option value="CATEGORY">{CAMPAIGN_DESTINATION_AR.CATEGORY}</option>
                <option value="PRODUCT">{CAMPAIGN_DESTINATION_AR.PRODUCT}</option>
                <option value="COUPON">{CAMPAIGN_DESTINATION_AR.COUPON}</option>
                <option value="CART">{CAMPAIGN_DESTINATION_AR.CART}</option>
              </Select>
            </FormField>
            {renderDestinationPicker()}
          </FormSection>

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
        title="حذف الحملة"
        description={`حذف حملة «${deleteTarget?.titleAr}»؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel={COMMON_AR.delete}
      />

      <ConfirmDialog
        open={Boolean(removeImageTarget)}
        onClose={() => setRemoveImageTarget(null)}
        onConfirm={() => removeImageTarget && removeImageMutation.mutate(removeImageTarget.id)}
        isLoading={removeImageMutation.isPending}
        title="حذف صورة الحملة"
        description={`حذف صورة حملة «${removeImageTarget?.titleAr}»؟ يمكن رفع صورة جديدة لاحقًا.`}
        confirmLabel={COMMON_AR.delete}
      />
    </div>
  );
}

export default function CampaignsPage() {
  return (
    <RequireRole navKey="campaigns">
      <CampaignsPageInner />
    </RequireRole>
  );
}
