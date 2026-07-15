"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Copy,
  Eye,
  ImageIcon,
  Megaphone,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { RequireRole } from "@/components/layout/RequireRole";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Badge, SchedulePhaseBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/LoadingState";
import { IconButton } from "@/components/ui/IconButton";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CampaignMobileCard } from "@/components/campaigns/CampaignMobileCard";
import { CampaignEditorFields } from "@/components/campaigns/CampaignEditorFields";
import { CampaignVisualPreview } from "@/components/campaigns/CampaignVisualPreview";
import {
  ALL_PLACEMENTS,
} from "@/components/campaigns/constants";
import {
  campaignSchema,
  defaultsFromCampaign,
  duplicatePayload,
  EDITOR_TABS,
  toPayload,
  type CampaignFormValues,
  type EditorTab,
} from "@/components/campaigns/campaignForm";
import { useZodForm } from "@/lib/forms/useZodForm";
import { listCategories } from "@/lib/api/categories";
import { listProducts } from "@/lib/api/products";
import { listOffers } from "@/lib/api/offers";
import { listCoupons } from "@/lib/api/coupons";
import {
  createCampaign,
  deleteCampaign,
  deleteCampaignIcon,
  deleteCampaignImage,
  getCampaignAnalytics,
  listCampaigns,
  updateCampaign,
  uploadCampaignIcon,
  uploadCampaignImage,
} from "@/lib/api/campaigns";
import type { Campaign, CampaignPlacement } from "@/lib/types";
import {
  formatDateTime,
  formatNumber,
  getSchedulePhase,
  type SchedulePhase,
} from "@/lib/utils/format";
import { getErrorMessage } from "@/lib/api/errors";
import {
  CAMPAIGN_DESTINATION_AR,
  CAMPAIGN_LAYOUT_AR,
  CAMPAIGN_PLACEMENT_AR,
  COMMON_AR,
} from "@/lib/ar/labels";
import { DESTINATIONS_WITH_ID } from "@/components/campaigns/constants";
import { cn } from "@/lib/utils/cn";

type CampaignFilter = "" | SchedulePhase | "no-image" | CampaignPlacement;

function CampaignsPageInner() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<CampaignFilter>("");
  const [layoutFilter, setLayoutFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editorTab, setEditorTab] = useState<EditorTab>("content");
  const [modal, setModal] = useState<{ mode: "create" | "edit"; campaign?: Campaign } | null>(
    null,
  );
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [removeImageTarget, setRemoveImageTarget] = useState<Campaign | null>(null);
  const [removeIconTarget, setRemoveIconTarget] = useState<Campaign | null>(null);
  const [destinationSearch, setDestinationSearch] = useState("");
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const campaignsQuery = useQuery({ queryKey: ["campaigns"], queryFn: listCampaigns });
  const analyticsQuery = useQuery({
    queryKey: ["campaigns", "analytics"],
    queryFn: getCampaignAnalytics,
  });
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
    defaultValues: defaultsFromCampaign(),
  });

  const productsQuery = useQuery({
    queryKey: ["products", "campaign-picker", destinationSearch],
    queryFn: () =>
      listProducts({
        page: 1,
        limit: 40,
        q: destinationSearch || undefined,
      }),
    enabled: Boolean(modal),
  });

  const filteredCampaigns = useMemo(() => {
    if (!campaignsQuery.data) return [];
    let rows = [...campaignsQuery.data];
    if (phaseFilter === "no-image") {
      rows = rows.filter((c) => !c.imageUrl);
    } else if (ALL_PLACEMENTS.includes(phaseFilter as CampaignPlacement)) {
      rows = rows.filter((c) => c.placements?.includes(phaseFilter as CampaignPlacement));
    } else if (phaseFilter) {
      rows = rows.filter(
        (c) => getSchedulePhase(c.isActive, c.startsAt, c.endsAt) === phaseFilter,
      );
    }
    if (layoutFilter) {
      rows = rows.filter((c) => c.layout === layoutFilter);
    }
    const needle = q.trim().toLowerCase();
    if (needle) {
      rows = rows.filter(
        (c) =>
          c.titleAr.toLowerCase().includes(needle) ||
          c.titleEn.toLowerCase().includes(needle) ||
          c.placements?.some((p) => (CAMPAIGN_PLACEMENT_AR[p] ?? p).includes(q.trim())),
      );
    }
    return rows.sort(
      (a, b) =>
        (b.priority ?? 0) - (a.priority ?? 0) || a.sortOrder - b.sortOrder,
    );
  }, [campaignsQuery.data, q, phaseFilter, layoutFilter]);

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categoriesQuery.data ?? []) map.set(c.id, c.nameAr);
    return map;
  }, [categoriesQuery.data]);

  const offerMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of offersQuery.data ?? []) map.set(o.id, o.titleAr);
    return map;
  }, [offersQuery.data]);

  const couponMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of couponsQuery.data?.items ?? []) map.set(c.id, c.code);
    return map;
  }, [couponsQuery.data]);

  const productMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of productsQuery.data?.data ?? []) map.set(p.id, p.nameAr);
    return map;
  }, [productsQuery.data]);

  const destinationLabel = (campaign: Campaign): string => {
    const typeLabel = CAMPAIGN_DESTINATION_AR[campaign.destinationType] ?? campaign.destinationType;
    if (campaign.destinationType === "EXTERNAL_URL") {
      return `${typeLabel}: ${campaign.destinationUrl ?? ""}`;
    }
    if (campaign.destinationType === "INTERNAL_ROUTE") {
      return `${typeLabel}: ${campaign.destinationRoute ?? ""}`;
    }
    if (!DESTINATIONS_WITH_ID.includes(campaign.destinationType) || !campaign.destinationId) {
      return typeLabel;
    }
    const name =
      campaign.destinationType === "OFFER"
        ? offerMap.get(campaign.destinationId)
        : campaign.destinationType === "CATEGORY"
          ? categoryMap.get(campaign.destinationId)
          : campaign.destinationType === "COUPON"
            ? couponMap.get(campaign.destinationId)
            : productMap.get(campaign.destinationId);
    return name ? `${typeLabel}: ${name}` : typeLabel;
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["campaigns"] });
  };

  useEffect(() => {
    if (!modal) return;
    reset(defaultsFromCampaign(modal.mode === "edit" ? modal.campaign : undefined));
    setDestinationSearch("");
    setFormError(null);
    setActionError(null);
    setPendingImageFile(null);
    setPendingPreviewUrl(null);
    setEditorTab("content");
  }, [modal, reset]);

  useEffect(() => {
    return () => {
      if (pendingPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(pendingPreviewUrl);
    };
  }, [pendingPreviewUrl]);

  const openCreate = () => setModal({ mode: "create" });
  const openEdit = (campaign: Campaign) => setModal({ mode: "edit", campaign });

  const handlePendingImage = (file: File | null) => {
    setPendingImageFile(file);
    if (pendingPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingPreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  const livePreviewUrl =
    pendingPreviewUrl ||
    (modal?.mode === "edit" ? modal.campaign?.imageUrl : null) ||
    previewCampaign?.imageUrl ||
    null;

  const uploadFor = async (id: string, file: File) => {
    setUploadingId(id);
    setUploadProgress(0);
    try {
      const updated = await uploadCampaignImage(id, file, setUploadProgress);
      invalidate();
      if (modal?.mode === "edit" && modal.campaign?.id === id) {
        setModal({ mode: "edit", campaign: updated });
      }
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setUploadingId(null);
      setUploadProgress(null);
    }
  };

  const uploadIconFor = async (id: string, file: File) => {
    setUploadingId(`icon-${id}`);
    setUploadProgress(0);
    try {
      const updated = await uploadCampaignIcon(id, file, setUploadProgress);
      invalidate();
      if (modal?.mode === "edit" && modal.campaign?.id === id) {
        setModal({ mode: "edit", campaign: updated });
      }
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setUploadingId(null);
      setUploadProgress(null);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (values: CampaignFormValues) => {
      const payload = toPayload(values);
      if (modal?.mode === "edit" && modal.campaign) {
        return updateCampaign(modal.campaign.id, payload);
      }
      const created = await createCampaign(payload);
      if (pendingImageFile) {
        try {
          return await uploadCampaignImage(created.id, pendingImageFile, setUploadProgress);
        } catch {
          setModal({ mode: "edit", campaign: created });
          throw new Error("تم إنشاء الحملة لكن فشل رفع الصورة.");
        }
      }
      return created;
    },
    onSuccess: () => {
      invalidate();
      setModal(null);
      setPendingImageFile(null);
      setFormError(null);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCampaign(id),
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (deleteTarget) next.delete(deleteTarget.id);
        return next;
      });
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  });

  const duplicateMutation = useMutation({
    mutationFn: (campaign: Campaign) => createCampaign(duplicatePayload(campaign)),
    onSuccess: () => {
      invalidate();
      setActionError(null);
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  });

  const bulkMutation = useMutation({
    mutationFn: async ({
      ids,
      action,
    }: {
      ids: string[];
      action: "activate" | "deactivate" | "delete";
    }) => {
      if (action === "delete") {
        await Promise.all(ids.map((id) => deleteCampaign(id)));
        return;
      }
      await Promise.all(
        ids.map((id) => updateCampaign(id, { isActive: action === "activate" })),
      );
    },
    onSuccess: () => {
      invalidate();
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      setActionError(null);
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  });

  const removeImageMutation = useMutation({
    mutationFn: (id: string) => deleteCampaignImage(id),
    onSuccess: (updated) => {
      invalidate();
      setRemoveImageTarget(null);
      if (modal?.mode === "edit" && modal.campaign?.id === updated.id) {
        setModal({ mode: "edit", campaign: updated });
      }
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  });

  const removeIconMutation = useMutation({
    mutationFn: (id: string) => deleteCampaignIcon(id),
    onSuccess: (updated) => {
      invalidate();
      setRemoveIconTarget(null);
      if (modal?.mode === "edit" && modal.campaign?.id === updated.id) {
        setModal({ mode: "edit", campaign: updated });
      }
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateCampaign(id, { isActive }),
    onSuccess: () => invalidate(),
    onError: (err) => setActionError(getErrorMessage(err)),
  });

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    if (!checked) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(filteredCampaigns.map((c) => c.id)));
  };

  const selectedCount = selectedIds.size;

  const columns: DataTableColumn<Campaign>[] = [
    {
      key: "select",
      header: (
        <input
          type="checkbox"
          className="size-4 accent-amber-500"
          checked={filteredCampaigns.length > 0 && selectedCount === filteredCampaigns.length}
          onChange={(e) => toggleSelectAll(e.target.checked)}
          aria-label="تحديد الكل"
        />
      ),
      className: "w-10",
      render: (c) => (
        <input
          type="checkbox"
          className="size-4 accent-amber-500"
          checked={selectedIds.has(c.id)}
          onChange={(e) => toggleSelect(c.id, e.target.checked)}
          onClick={(e) => e.stopPropagation()}
          aria-label="تحديد"
        />
      ),
    },
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
      render: (c) => (
        <div className="min-w-0">
          <p className="font-medium text-charcoal">{c.titleAr}</p>
          <p className="text-xs text-charcoal-soft">
            {CAMPAIGN_LAYOUT_AR[c.layout] ?? c.layout}
          </p>
        </div>
      ),
    },
    {
      key: "placements",
      header: "المواضع",
      render: (c) => (
        <div className="flex max-w-[200px] flex-wrap gap-1">
          {(c.placements ?? []).slice(0, 2).map((p) => (
            <Badge key={p} tone="blue">
              {CAMPAIGN_PLACEMENT_AR[p] ?? p}
            </Badge>
          ))}
          {(c.placements?.length ?? 0) > 2 && (
            <Badge tone="amber">+{(c.placements?.length ?? 0) - 2}</Badge>
          )}
        </div>
      ),
    },
    {
      key: "analytics",
      header: "التحليلات",
      render: (c) => (
        <div className="text-xs text-charcoal-soft">
          <div>ظهور: {formatNumber(c.impressionCount ?? 0)}</div>
          <div>
            نقر: {formatNumber(c.clickCount ?? 0)} · CTR {formatNumber(c.ctr ?? 0)}%
          </div>
        </div>
      ),
    },
    {
      key: "phase",
      header: COMMON_AR.status,
      render: (c) => (
        <SchedulePhaseBadge phase={getSchedulePhase(c.isActive, c.startsAt, c.endsAt)} />
      ),
    },
    {
      key: "priority",
      header: "أولوية",
      render: (c) => <span className="tabular-nums">{formatNumber(c.priority ?? 0)}</span>,
    },
    {
      key: "actions",
      header: COMMON_AR.actions,
      className: "text-end",
      headerClassName: "text-end",
      render: (c) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <IconButton label="معاينة" size="sm" onClick={() => setPreviewCampaign(c)}>
            <Eye className="size-4" />
          </IconButton>
          <IconButton
            label="تكرار"
            size="sm"
            onClick={() => duplicateMutation.mutate(c)}
          >
            <Copy className="size-4" />
          </IconButton>
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

  const analyticsItems = analyticsQuery.data?.items ?? [];

  return (
    <div className="page-shell animate-in min-w-0 overflow-x-hidden">
      <PageHeader
        title="محرك الحملات الترويجية"
        description="إدارة بانرات ومواضع واستهداف وتصميم وتحليلات — بواجهة متجاوبة لجميع الشاشات."
        actions={
          <Button onClick={openCreate} className="w-full sm:w-auto">
            <Plus className="size-4" />
            حملة جديدة
          </Button>
        }
      />

      {analyticsQuery.data && (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              label: "إجمالي الظهور",
              value: formatNumber(analyticsQuery.data.totals.impressions),
              icon: true,
            },
            {
              label: "إجمالي النقرات",
              value: formatNumber(analyticsQuery.data.totals.clicks),
            },
            {
              label: "متوسط CTR",
              value: `${formatNumber(analyticsQuery.data.totals.ctr)}%`,
            },
            {
              label: "عدد الحملات",
              value: formatNumber(analyticsQuery.data.totals.campaigns),
            },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardBody className="flex items-center gap-3 py-3 sm:py-4">
                {stat.icon && <BarChart3 className="hidden size-5 shrink-0 text-amber-600 sm:block" />}
                <div className="min-w-0">
                  <p className="text-[11px] text-charcoal-soft sm:text-xs">{stat.label}</p>
                  <p className="truncate text-base font-semibold tabular-nums sm:text-lg">
                    {stat.value}
                  </p>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {analyticsItems.length > 0 && (
        <Card className="mb-4">
          <CardBody className="space-y-3 py-4">
            <h3 className="text-sm font-semibold text-charcoal">أداء الحملات</h3>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {analyticsItems.slice(0, 6).map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    const full = campaignsQuery.data?.find((c) => c.id === item.id);
                    if (full) setPreviewCampaign(full);
                  }}
                  className="rounded-[var(--radius-lg)] border border-border-soft p-3 text-start transition hover:border-amber-300 hover:bg-amber-50/50"
                >
                  <p className="truncate text-sm font-medium text-charcoal">{item.titleAr}</p>
                  <p className="mt-1 text-[11px] text-charcoal-soft">
                    ظهور {formatNumber(item.impressionCount)} · نقر{" "}
                    {formatNumber(item.clickCount)} · CTR {formatNumber(item.ctr)}%
                  </p>
                  <p className="mt-1 text-[11px] text-charcoal-soft">
                    آخر ظهور: {formatDateTime(item.lastViewedAt)}
                  </p>
                </button>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <Card className="min-w-0 overflow-hidden">
        <FilterBar className="flex-col items-stretch sm:flex-row sm:items-center">
          <div className="relative w-full min-w-0 sm:w-64">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-charcoal-soft" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث بالعنوان أو الموضع…"
              className="ps-9"
            />
          </div>
          <Select
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value as CampaignFilter)}
            className="w-full min-w-0 sm:w-48"
          >
            <option value="">كل الحالات</option>
            <option value="active">فعّالة</option>
            <option value="inactive">معطّلة</option>
            <option value="upcoming">قادمة</option>
            <option value="expired">منتهية</option>
            <option value="no-image">بلا صورة</option>
            {ALL_PLACEMENTS.map((p) => (
              <option key={p} value={p}>
                موضع: {CAMPAIGN_PLACEMENT_AR[p]}
              </option>
            ))}
          </Select>
          <Select
            value={layoutFilter}
            onChange={(e) => setLayoutFilter(e.target.value)}
            className="w-full min-w-0 sm:w-44"
          >
            <option value="">كل الأنماط</option>
            {Object.entries(CAMPAIGN_LAYOUT_AR).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </FilterBar>

        {selectedCount > 0 && (
          <div className="flex flex-col gap-2 border-b border-border-soft bg-amber-50/60 px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:px-4">
            <span className="text-sm text-charcoal">تم تحديد {formatNumber(selectedCount)}</span>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={bulkMutation.isPending}
                onClick={() =>
                  bulkMutation.mutate({
                    ids: [...selectedIds],
                    action: "activate",
                  })
                }
              >
                تفعيل جماعي
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={bulkMutation.isPending}
                onClick={() =>
                  bulkMutation.mutate({
                    ids: [...selectedIds],
                    action: "deactivate",
                  })
                }
              >
                تعطيل جماعي
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={bulkMutation.isPending}
                onClick={() => setBulkDeleteOpen(true)}
              >
                حذف جماعي
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                إلغاء التحديد
              </Button>
            </div>
          </div>
        )}

        {actionError && !modal && (
          <div className="mx-3 my-3 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger sm:mx-4">
            {actionError}
          </div>
        )}

        {campaignsQuery.isLoading && (
          <div className="p-4">
            <SkeletonTable rows={6} cols={6} />
          </div>
        )}
        {campaignsQuery.isError && (
          <div className="p-4">
            <ErrorState message="تعذر تحميل الحملات." onRetry={() => campaignsQuery.refetch()} />
          </div>
        )}
        {campaignsQuery.data && filteredCampaigns.length === 0 && (
          <EmptyState
            icon={Megaphone}
            title={campaignsQuery.data.length === 0 ? "لا توجد حملات بعد" : "لا توجد نتائج"}
            description={
              campaignsQuery.data.length === 0
                ? "أنشئ أول حملة ترويجية للشاشة الرئيسية والمواضع الأخرى."
                : "حاول تعديل عوامل التصفية."
            }
          />
        )}

        {/* Mobile / tablet cards — no horizontal scroll */}
        {filteredCampaigns.length > 0 && (
          <div className="space-y-3 p-3 lg:hidden">
            <label className="flex items-center gap-2 text-sm text-charcoal">
              <input
                type="checkbox"
                className="size-5 accent-amber-500"
                checked={
                  filteredCampaigns.length > 0 && selectedCount === filteredCampaigns.length
                }
                onChange={(e) => toggleSelectAll(e.target.checked)}
              />
              تحديد الكل
            </label>
            {filteredCampaigns.map((c) => (
              <CampaignMobileCard
                key={c.id}
                campaign={c}
                selected={selectedIds.has(c.id)}
                onSelect={(checked) => toggleSelect(c.id, checked)}
                destinationLabel={destinationLabel(c)}
                onEdit={() => openEdit(c)}
                onDelete={() => setDeleteTarget(c)}
                onToggle={() =>
                  toggleActiveMutation.mutate({ id: c.id, isActive: !c.isActive })
                }
                onDuplicate={() => duplicateMutation.mutate(c)}
                onPreview={() => setPreviewCampaign(c)}
                toggling={toggleActiveMutation.isPending}
              />
            ))}
          </div>
        )}

        {/* Desktop table */}
        {filteredCampaigns.length > 0 && (
          <div className="hidden lg:block">
            <DataTable columns={columns} rows={filteredCampaigns} rowKey={(c) => c.id} dense />
          </div>
        )}
      </Card>

      <Modal
        open={Boolean(modal)}
        onClose={() => {
          setModal(null);
          setPendingImageFile(null);
        }}
        title={modal?.mode === "edit" ? "تعديل الحملة" : "حملة جديدة"}
        size="full"
        footer={
          <>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                setModal(null);
                setPendingImageFile(null);
              }}
            >
              {COMMON_AR.cancel}
            </Button>
            <Button
              className="w-full sm:w-auto"
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

        <div className="-mx-1 mb-4 flex gap-1 overflow-x-auto pb-1">
          {EDITOR_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setEditorTab(t.id)}
              className={cn(
                "shrink-0 rounded-full px-3 py-2 text-sm whitespace-nowrap transition",
                editorTab === t.id
                  ? "bg-amber-500 text-charcoal font-medium"
                  : "bg-cream text-charcoal-soft hover:bg-amber-100",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <CampaignEditorFields
          tab={editorTab}
          register={register}
          control={control}
          watch={watch}
          setValue={setValue}
          errors={errors}
          mode={modal?.mode ?? "create"}
          campaign={modal?.campaign}
          previewImageUrl={livePreviewUrl}
          uploadingId={uploadingId}
          uploadProgress={uploadProgress}
          destinationSearch={destinationSearch}
          setDestinationSearch={setDestinationSearch}
          onUploadImage={(file) => modal?.campaign && uploadFor(modal.campaign.id, file)}
          onUploadIcon={(file) => modal?.campaign && uploadIconFor(modal.campaign.id, file)}
          onDeleteImage={() => modal?.campaign && setRemoveImageTarget(modal.campaign)}
          onDeleteIcon={() => modal?.campaign && setRemoveIconTarget(modal.campaign)}
          onSelectPending={handlePendingImage}
          categories={(categoriesQuery.data ?? []).map((c) => ({
            id: c.id,
            nameAr: c.nameAr,
          }))}
          offers={(offersQuery.data ?? []).map((o) => ({ id: o.id, titleAr: o.titleAr }))}
          coupons={(couponsQuery.data?.items ?? []).map((c) => ({ id: c.id, code: c.code }))}
          products={(productsQuery.data?.data ?? []).map((p) => ({
            id: p.id,
            nameAr: p.nameAr,
          }))}
        />
      </Modal>

      <Modal
        open={Boolean(previewCampaign)}
        onClose={() => setPreviewCampaign(null)}
        title="معاينة الحملة"
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setPreviewCampaign(null)}
            >
              إغلاق
            </Button>
            {previewCampaign && (
              <Button
                className="w-full sm:w-auto"
                onClick={() => {
                  openEdit(previewCampaign);
                  setPreviewCampaign(null);
                }}
              >
                تعديل
              </Button>
            )}
          </>
        }
      >
        {previewCampaign && (
          <div className="space-y-4">
            <CampaignVisualPreview
              values={defaultsFromCampaign(previewCampaign)}
              imageUrl={previewCampaign.imageUrl}
            />
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-charcoal-soft">الوجهة</p>
                <p className="break-words">{destinationLabel(previewCampaign)}</p>
              </div>
              <div>
                <p className="text-xs text-charcoal-soft">CTR</p>
                <p className="tabular-nums">{formatNumber(previewCampaign.ctr ?? 0)}%</p>
              </div>
              <div>
                <p className="text-xs text-charcoal-soft">آخر ظهور</p>
                <p>{formatDateTime(previewCampaign.lastViewedAt)}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isLoading={deleteMutation.isPending}
        title="حذف الحملة"
        description={`حذف حملة «${deleteTarget?.titleAr}»؟`}
        confirmLabel={COMMON_AR.delete}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={() =>
          bulkMutation.mutate({ ids: [...selectedIds], action: "delete" })
        }
        isLoading={bulkMutation.isPending}
        title="حذف جماعي"
        description={`حذف ${formatNumber(selectedCount)} حملة محددة؟ لا يمكن التراجع.`}
        confirmLabel={COMMON_AR.delete}
      />

      <ConfirmDialog
        open={Boolean(removeImageTarget)}
        onClose={() => setRemoveImageTarget(null)}
        onConfirm={() =>
          removeImageTarget && removeImageMutation.mutate(removeImageTarget.id)
        }
        isLoading={removeImageMutation.isPending}
        title="حذف صورة الحملة"
        description="يمكن رفع صورة جديدة لاحقًا."
        confirmLabel={COMMON_AR.delete}
      />

      <ConfirmDialog
        open={Boolean(removeIconTarget)}
        onClose={() => setRemoveIconTarget(null)}
        onConfirm={() =>
          removeIconTarget && removeIconMutation.mutate(removeIconTarget.id)
        }
        isLoading={removeIconMutation.isPending}
        title="حذف أيقونة الحملة"
        description="يمكن رفع أيقونة جديدة لاحقًا."
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
