"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useZodForm } from "@/lib/forms/useZodForm";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  ExternalLink,
  FolderTree,
  ImageIcon,
  ImageOff,
  Pencil,
  Plus,
  Power,
  Search,
  Trash2,
} from "lucide-react";
import { RequireRole } from "@/components/layout/RequireRole";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { FilterBar } from "@/components/ui/FilterBar";
import { FormField } from "@/components/ui/FormField";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { BooleanBadge, Badge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/LoadingState";
import { IconButton } from "@/components/ui/IconButton";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Pagination } from "@/components/ui/Pagination";
import { StatCard } from "@/components/ui/StatCard";
import { CategoryImageUploader } from "@/components/categories/CategoryImageUploader";
import { CategoryImageSearchModal } from "@/components/categories/CategoryImageSearchModal";
import {
  createCategory,
  deleteCategory,
  deleteCategoryImage,
  getCategoryStats,
  listCategories,
  updateCategory,
  uploadCategoryImage,
} from "@/lib/api/categories";
import type { Category } from "@/lib/types";
import { getErrorMessage } from "@/lib/api/errors";
import { COMMON_AR } from "@/lib/ar/labels";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/utils/format";
import { useToast } from "@/components/ui/Toaster";
import { prepareImageForUpload } from "@/lib/utils/imageUpload";

const categorySchema = z.object({
  nameAr: z.string().min(1, "الاسم بالعربية مطلوب"),
  nameEn: z.string().min(1, "الاسم بالإنجليزية مطلوب"),
  parentId: z.string().uuid().optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

const PAGE_SIZE = 12;

function CategoryImageCell({ category }: { category: Category }) {
  const [broken, setBroken] = useState(false);
  const showImage = Boolean(category.imageUrl) && !broken;

  return (
    <div className="relative flex size-12 items-center justify-center overflow-hidden rounded-[var(--radius-md)] border border-border-soft bg-cream">
      {showImage ? (
        <Image
          src={category.imageUrl!}
          alt={category.nameAr}
          fill
          className="object-cover"
          unoptimized
          onError={() => setBroken(true)}
        />
      ) : (
        <>
          <ImageIcon className="size-5 text-charcoal-soft" />
          <span className="absolute inset-x-0 bottom-0 bg-charcoal/70 py-0.5 text-center text-[10px] font-medium text-cream">
            {COMMON_AR.noImage}
          </span>
        </>
      )}
    </div>
  );
}

function CategoriesPageInner() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "inactive">("");
  const [emptyOnly, setEmptyOnly] = useState(false);
  const [missingImageOnly, setMissingImageOnly] = useState(false);
  const [sort, setSort] = useState<"sortOrder" | "name" | "products" | "updated">("sortOrder");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<{ mode: "create" | "edit"; category?: Category } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [toggleTarget, setToggleTarget] = useState<Category | null>(null);
  const [removeImageTarget, setRemoveImageTarget] = useState<Category | null>(null);
  const [pexelsTarget, setPexelsTarget] = useState<Category | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: listCategories });

  const statsQuery = useQuery({
    queryKey: ["category-stats", modal?.category?.id],
    queryFn: () => getCategoryStats(modal!.category!.id),
    enabled: modal?.mode === "edit" && Boolean(modal.category?.id),
  });

  const filteredCategories = useMemo(() => {
    if (!categoriesQuery.data) return [];
    let rows = [...categoriesQuery.data];
    const needle = q.trim().toLowerCase();
    if (needle) {
      rows = rows.filter(
        (c) =>
          c.nameAr.toLowerCase().includes(needle) ||
          c.nameEn.toLowerCase().includes(needle) ||
          c.id.toLowerCase().includes(needle),
      );
    }
    if (statusFilter === "active") rows = rows.filter((c) => c.isActive);
    if (statusFilter === "inactive") rows = rows.filter((c) => !c.isActive);
    if (emptyOnly) rows = rows.filter((c) => (c.productCount ?? 0) === 0);
    if (missingImageOnly) rows = rows.filter((c) => !c.imageUrl && !c.hasImage);
    rows.sort((a, b) => {
      const aParent = a.parentId ?? "";
      const bParent = b.parentId ?? "";
      // Tree order: parents first, children under their parent
      const aKey = a.parentId
        ? `${a.parentId}:1:${a.nameAr}`
        : `${a.id}:0:${a.nameAr}`;
      const bKey = b.parentId
        ? `${b.parentId}:1:${b.nameAr}`
        : `${b.id}:0:${b.nameAr}`;
      if (sort === "name") return a.nameAr.localeCompare(b.nameAr, "ar");
      if (sort === "products") {
        return (b.totalProductCount ?? b.productCount ?? 0) - (a.totalProductCount ?? a.productCount ?? 0);
      }
      if (sort === "updated") {
        return String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? ""));
      }
      if (aParent !== bParent && (a.parentId === b.id || b.parentId === a.id || aParent || bParent)) {
        return aKey.localeCompare(bKey, "ar");
      }
      return a.sortOrder - b.sortOrder || aKey.localeCompare(bKey, "ar");
    });
    return rows;
  }, [categoriesQuery.data, q, statusFilter, emptyOnly, missingImageOnly, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / PAGE_SIZE));
  const pagedCategories = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredCategories.slice(start, start + PAGE_SIZE);
  }, [filteredCategories, page]);

  const missingImageCount = useMemo(
    () => (categoriesQuery.data ?? []).filter((c) => !c.imageUrl && !c.hasImage).length,
    [categoriesQuery.data],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useZodForm(categorySchema, {
    defaultValues: { nameAr: "", nameEn: "", parentId: "", sortOrder: 0, isActive: true },
  });

  const parentOptions = useMemo(
    () => (categoriesQuery.data ?? []).filter((c) => !c.parentId),
    [categoriesQuery.data],
  );

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["categories"] });
    void queryClient.invalidateQueries({ queryKey: ["category-stats"] });
  };

  const openCreate = () => {
    reset({
      nameAr: "",
      nameEn: "",
      parentId: "",
      sortOrder: parentOptions.length,
      isActive: true,
    });
    setFormError(null);
    setModal({ mode: "create" });
  };

  const openEdit = (category: Category) => {
    reset({
      nameAr: category.nameAr,
      nameEn: category.nameEn,
      parentId: category.parentId ?? "",
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    });
    setFormError(null);
    setModal({ mode: "edit", category });
  };

  const saveMutation = useMutation({
    mutationFn: async (values: CategoryFormValues) => {
      const payload = {
        nameAr: values.nameAr,
        nameEn: values.nameEn,
        sortOrder: values.sortOrder,
        isActive: values.isActive,
        parentId: values.parentId ? values.parentId : null,
      };
      if (modal?.mode === "edit" && modal.category) {
        return updateCategory(modal.category.id, payload);
      }
      return createCategory(payload);
    },
    onSuccess: (saved) => {
      invalidate();
      setFormError(null);
      if (modal?.mode === "create") {
        setModal({ mode: "edit", category: saved });
        pushToast("تم إنشاء القسم — يمكنك رفع صورة الآن.", "success");
      } else {
        setModal(null);
        pushToast("تم حفظ القسم.", "success");
      }
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
      setActionError(null);
      pushToast("تم حذف القسم.", "success");
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updateCategory(id, { isActive }),
    onSuccess: () => {
      invalidate();
      setToggleTarget(null);
      setActionError(null);
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  });

  const uploadFor = async (id: string, file: File) => {
    setUploadingId(id);
    setUploadProgress(0);
    setActionError(null);
    try {
      const prepared = await prepareImageForUpload(file);
      const updated = await uploadCategoryImage(id, prepared, setUploadProgress);
      invalidate();
      if (modal?.mode === "edit" && modal.category?.id === id) {
        setModal({ mode: "edit", category: updated });
      }
      pushToast("تم رفع صورة القسم.", "success");
    } catch (err) {
      setActionError(err instanceof Error && !("isAxiosError" in err) ? err.message : getErrorMessage(err));
    } finally {
      setUploadingId(null);
      setUploadProgress(null);
    }
  };

  const removeImageMutation = useMutation({
    mutationFn: (id: string) => deleteCategoryImage(id),
    onSuccess: (updated) => {
      invalidate();
      setRemoveImageTarget(null);
      setActionError(null);
      if (modal?.mode === "edit" && modal.category?.id === updated.id) {
        setModal({ mode: "edit", category: updated });
      }
      pushToast("تم حذف صورة القسم.", "success");
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  });

  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      pushToast("تم نسخ معرّف القسم.", "success");
    } catch {
      setActionError("تعذر نسخ المعرّف.");
    }
  };

  const columns: DataTableColumn<Category>[] = [
    {
      key: "image",
      header: COMMON_AR.image,
      className: "w-16",
      render: (c) => <CategoryImageCell category={c} />,
    },
    {
      key: "nameAr",
      header: "الاسم العربي",
      render: (c) => (
        <div className={c.parentId ? "ps-5" : undefined}>
          <p className="font-medium text-charcoal">
            {c.parentId ? `↳ ${c.nameAr}` : c.nameAr}
          </p>
          {c.parentId && c.parentNameAr ? (
            <p className="text-xs text-charcoal-soft">ضمن: {c.parentNameAr}</p>
          ) : (c.childrenCount ?? 0) > 0 ? (
            <p className="text-xs text-charcoal-soft">
              {formatNumber(c.childrenCount ?? 0)} أقسام فرعية
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "nameEn",
      header: "الاسم الإنجليزي",
      render: (c) => <p className="text-sm text-charcoal-soft ltr-field">{c.nameEn}</p>,
    },
    {
      key: "productCount",
      header: "المنتجات",
      render: (c) => (
        <div className="space-y-0.5">
          <Badge tone={(c.productCount ?? 0) > 0 ? "blue" : "gray"}>
            مباشر: {formatNumber(c.productCount ?? 0)}
          </Badge>
          {!c.parentId && (c.childrenProductCount ?? 0) > 0 ? (
            <p className="text-xs text-charcoal-soft">
              إجمالي: {formatNumber(c.totalProductCount ?? c.productCount ?? 0)}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "active",
      header: "نشطة",
      render: (c) => (
        <span className="tabular-nums text-success">{formatNumber(c.activeProductCount ?? 0)}</span>
      ),
    },
    {
      key: "inactive",
      header: "غير نشطة",
      render: (c) => (
        <span className="tabular-nums text-charcoal-soft">{formatNumber(c.inactiveProductCount ?? 0)}</span>
      ),
    },
    {
      key: "sortOrder",
      header: COMMON_AR.sortOrder,
      render: (c) => <span className="font-medium tabular-nums">{formatNumber(c.sortOrder)}</span>,
    },
    { key: "isActive", header: COMMON_AR.status, render: (c) => <BooleanBadge value={c.isActive} /> },
    {
      key: "updatedAt",
      header: "آخر تحديث",
      render: (c) => (
        <span className="text-xs text-charcoal-soft">{c.updatedAt ? formatDateTime(c.updatedAt) : "—"}</span>
      ),
    },
    {
      key: "actions",
      header: COMMON_AR.actions,
      className: "text-end",
      headerClassName: "text-end",
      render: (c) => (
        <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
          <IconButton
            label={c.imageUrl ? "استبدال الصورة" : "رفع صورة"}
            tone="amber"
            size="sm"
            disabled={uploadingId === c.id}
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "image/jpeg,image/png,image/webp";
              input.onchange = () => {
                const file = input.files?.[0];
                if (file) void uploadFor(c.id, file);
              };
              input.click();
            }}
          >
            {uploadingId === c.id ? <ImageIcon className="size-4 animate-pulse" /> : <ImageIcon className="size-4" />}
          </IconButton>
          {!c.imageUrl && (
            <IconButton label="بحث Pexels" tone="amber" size="sm" onClick={() => setPexelsTarget(c)}>
              <Search className="size-4" />
            </IconButton>
          )}
          {c.imageUrl && (
            <IconButton
              label="حذف الصورة"
              tone="danger"
              size="sm"
              onClick={() => setRemoveImageTarget(c)}
              disabled={removeImageMutation.isPending}
            >
              <ImageOff className="size-4" />
            </IconButton>
          )}
          <IconButton
            label="فتح المنتجات"
            tone="amber"
            size="sm"
            onClick={() => router.push(`/products?categoryId=${encodeURIComponent(c.id)}`)}
          >
            <ExternalLink className="size-4" />
          </IconButton>
          <IconButton label="نسخ المعرّف" tone="amber" size="sm" onClick={() => void copyId(c.id)}>
            <Copy className="size-4" />
          </IconButton>
          <IconButton label={c.isActive ? "تعطيل القسم" : "تفعيل القسم"} tone="amber" size="sm" onClick={() => setToggleTarget(c)}>
            <Power className="size-4" />
          </IconButton>
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
        title="الأقسام"
        description="إدارة الأقسام، الصور، الترتيب، والإحصائيات التشغيلية."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            قسم جديد
          </Button>
        }
      />

      {actionError && (
        <div className="mb-3 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-danger">
          {actionError}
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="إجمالي الأقسام" value={formatNumber(categoriesQuery.data?.length ?? 0)} icon={FolderTree} loading={categoriesQuery.isLoading} />
        <button
          type="button"
          className="text-start"
          onClick={() => {
            setMissingImageOnly(true);
            setEmptyOnly(false);
            setPage(1);
          }}
        >
          <StatCard
            label="الأقسام بدون صورة"
            value={formatNumber(missingImageCount)}
            icon={ImageOff}
            tone="amber"
            loading={categoriesQuery.isLoading}
            hint="اضغط للتصفية"
          />
        </button>
        <StatCard
          label="أقسام نشطة"
          value={formatNumber((categoriesQuery.data ?? []).filter((c) => c.isActive).length)}
          tone="green"
          loading={categoriesQuery.isLoading}
        />
        <StatCard
          label="أقسام فارغة"
          value={formatNumber((categoriesQuery.data ?? []).filter((c) => (c.productCount ?? 0) === 0).length)}
          loading={categoriesQuery.isLoading}
        />
      </div>

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
              placeholder="ابحث بالاسم أو المعرّف…"
              className="ps-9"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as typeof statusFilter);
              setPage(1);
            }}
            className="w-40"
          >
            <option value="">كل الحالات</option>
            <option value="active">{COMMON_AR.active}</option>
            <option value="inactive">{COMMON_AR.inactive}</option>
          </Select>
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="w-44"
          >
            <option value="sortOrder">ترتيب العرض</option>
            <option value="name">الاسم</option>
            <option value="products">عدد المنتجات</option>
            <option value="updated">آخر تحديث</option>
          </Select>
          <label className="flex items-center gap-2 text-sm text-charcoal">
            <input
              type="checkbox"
              className="size-4 accent-amber-500"
              checked={emptyOnly}
              onChange={(e) => {
                setEmptyOnly(e.target.checked);
                setPage(1);
              }}
            />
            أقسام فارغة
          </label>
          <label className="flex items-center gap-2 text-sm text-charcoal">
            <input
              type="checkbox"
              className="size-4 accent-amber-500"
              checked={missingImageOnly}
              onChange={(e) => {
                setMissingImageOnly(e.target.checked);
                setPage(1);
              }}
            />
            الأقسام بدون صورة
          </label>
          {(missingImageOnly || emptyOnly || statusFilter || q) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQ("");
                setStatusFilter("");
                setEmptyOnly(false);
                setMissingImageOnly(false);
                setPage(1);
              }}
            >
              مسح التصفية
            </Button>
          )}
        </FilterBar>

        {categoriesQuery.isLoading && <SkeletonTable rows={8} cols={8} />}
        {categoriesQuery.isError && (
          <ErrorState message="تعذر تحميل الأقسام." onRetry={() => categoriesQuery.refetch()} />
        )}
        {categoriesQuery.data && filteredCategories.length === 0 && (
          <EmptyState
            icon={FolderTree}
            title={categoriesQuery.data.length === 0 ? "لا توجد أقسام بعد" : "لا توجد نتائج"}
            description={
              missingImageOnly
                ? "لا توجد أقسام بلا صورة حاليًا."
                : categoriesQuery.data.length === 0
                  ? "أنشئ أول قسم للبدء."
                  : "حاول تعديل عوامل التصفية."
            }
            action={
              !missingImageOnly ? (
                <Button onClick={openCreate}>
                  <Plus className="size-4" />
                  قسم جديد
                </Button>
              ) : undefined
            }
          />
        )}
        {pagedCategories.length > 0 && (
          <>
            <DataTable
              columns={columns}
              rows={pagedCategories}
              rowKey={(c) => c.id}
              dense
              onRowClick={(c) => openEdit(c)}
            />
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              total={filteredCategories.length}
              limit={PAGE_SIZE}
            />
          </>
        )}
      </Card>

      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        title={modal?.mode === "edit" ? "تعديل القسم" : "قسم جديد"}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setModal(null)}>
              {COMMON_AR.cancel}
            </Button>
            <Button
              isLoading={isSubmitting || saveMutation.isPending}
              onClick={handleSubmit((values: CategoryFormValues) => saveMutation.mutate(values))}
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

        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-charcoal">المعلومات الأساسية</h3>
            <FormField label={COMMON_AR.nameAr} required error={errors.nameAr?.message}>
              <Input {...register("nameAr")} placeholder="خضروات" dir="rtl" />
            </FormField>
            <FormField label={COMMON_AR.nameEn} required error={errors.nameEn?.message}>
              <Input {...register("nameEn")} placeholder="Vegetables" className="ltr-field" />
            </FormField>
            <FormField
              label="القسم الرئيسي (اختياري)"
              hint="اتركه فارغًا للقسم الرئيسي. اختر قسمًا رئيسيًا لإنشاء قسم فرعي."
            >
              <Select
                {...register("parentId")}
                disabled={
                  modal?.mode === "edit" && (modal.category?.childrenCount ?? 0) > 0
                }
              >
                <option value="">— قسم رئيسي —</option>
                {parentOptions
                  .filter((p) => p.id !== modal?.category?.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nameAr}
                    </option>
                  ))}
              </Select>
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label={COMMON_AR.sortOrder} hint="الأرقام الأصغر تظهر أولاً في التطبيق">
                <Input type="number" min={0} {...register("sortOrder")} />
              </FormField>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-sm text-charcoal">
                  <input type="checkbox" className="size-4 accent-amber-500" {...register("isActive")} />
                  {COMMON_AR.active}
                </label>
              </div>
            </div>
          </section>

          {modal?.mode === "edit" && modal.category && (
            <>
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-charcoal">الصورة</h3>
                <CategoryImageUploader
                  imageUrl={modal.category.imageUrl}
                  isUploading={uploadingId === modal.category.id}
                  progress={uploadingId === modal.category.id ? uploadProgress : null}
                  onUpload={(file) => uploadFor(modal.category!.id, file)}
                  onDelete={() => setRemoveImageTarget(modal.category!)}
                  onSearchPexels={() => setPexelsTarget(modal.category!)}
                />
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-charcoal">إحصائيات القسم</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      router.push(`/products?categoryId=${encodeURIComponent(modal.category!.id)}`)
                    }
                  >
                    <ExternalLink className="size-3.5" />
                    فتح المنتجات
                  </Button>
                </div>
                {statsQuery.isLoading && <p className="text-sm text-charcoal-soft">جارٍ تحميل الإحصائيات…</p>}
                {statsQuery.data && (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <MiniStat label="المنتجات" value={formatNumber(statsQuery.data.productCount)} />
                    <MiniStat label="نشطة" value={formatNumber(statsQuery.data.activeProductCount)} />
                    <MiniStat label="غير متوفرة" value={formatNumber(statsQuery.data.outOfStockProductCount)} />
                    <MiniStat label="متوسط السعر" value={formatCurrency(statsQuery.data.averageProductPrice)} />
                    <MiniStat
                      label="أدنى سعر"
                      value={
                        statsQuery.data.lowestPrice != null
                          ? formatCurrency(statsQuery.data.lowestPrice)
                          : "—"
                      }
                    />
                    <MiniStat
                      label="أعلى سعر"
                      value={
                        statsQuery.data.highestPrice != null
                          ? formatCurrency(statsQuery.data.highestPrice)
                          : "—"
                      }
                    />
                  </div>
                )}
                {statsQuery.data?.lastUpdatedProduct && (
                  <p className="text-xs text-charcoal-soft">
                    آخر منتج محدّث:{" "}
                    <span className="font-medium text-charcoal">
                      {statsQuery.data.lastUpdatedProduct.nameAr}
                    </span>{" "}
                    — {formatDateTime(statsQuery.data.lastUpdatedProduct.updatedAt)}
                  </p>
                )}
              </section>

              <section>
                <Card className="border-dashed">
                  <CardHeader>
                    <CardTitle className="text-sm">معاينة</CardTitle>
                  </CardHeader>
                  <CardBody className="flex items-center gap-3">
                    <CategoryImageCell category={modal.category} />
                    <div>
                      <p className="font-medium text-charcoal">{modal.category.nameAr}</p>
                      <p className="text-xs text-charcoal-soft ltr-field">{modal.category.nameEn}</p>
                      <p className="mt-1 text-[11px] text-charcoal-muted ltr-field">{modal.category.id}</p>
                    </div>
                  </CardBody>
                </Card>
              </section>
            </>
          )}

          {modal?.mode === "create" && (
            <p className="rounded-[var(--radius-md)] bg-amber-50 px-3 py-2 text-xs text-amber-800">
              بعد الحفظ يمكنك رفع صورة القسم أو اختيارها من Pexels.
            </p>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isLoading={deleteMutation.isPending}
        title="حذف القسم"
        description={`هل تريد حذف قسم «${deleteTarget?.nameAr}»؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel={COMMON_AR.delete}
      />

      <ConfirmDialog
        open={Boolean(toggleTarget)}
        onClose={() => setToggleTarget(null)}
        onConfirm={() =>
          toggleTarget && toggleMutation.mutate({ id: toggleTarget.id, isActive: !toggleTarget.isActive })
        }
        isLoading={toggleMutation.isPending}
        variant="primary"
        title={toggleTarget?.isActive ? "تعطيل القسم" : "تفعيل القسم"}
        description={
          toggleTarget?.isActive
            ? `سيتم إخفاء قسم «${toggleTarget.nameAr}» من التطبيق. المنتجات المرتبطة لن تُحذف.`
            : `سيتم إظهار قسم «${toggleTarget?.nameAr}» في التطبيق مرة أخرى.`
        }
        confirmLabel={toggleTarget?.isActive ? "تعطيل" : "تفعيل"}
      />

      <ConfirmDialog
        open={Boolean(removeImageTarget)}
        onClose={() => setRemoveImageTarget(null)}
        onConfirm={() => removeImageTarget && removeImageMutation.mutate(removeImageTarget.id)}
        isLoading={removeImageMutation.isPending}
        title="حذف صورة القسم"
        description={`إزالة صورة قسم «${removeImageTarget?.nameAr}»؟`}
        confirmLabel="حذف الصورة"
      />

      <CategoryImageSearchModal
        open={Boolean(pexelsTarget)}
        onClose={() => setPexelsTarget(null)}
        categoryId={pexelsTarget?.id ?? ""}
        categoryName={pexelsTarget?.nameAr}
        defaultQuery={pexelsTarget?.nameEn || pexelsTarget?.nameAr}
        onSelected={() => {
          const editingId = modal?.mode === "edit" ? modal.category?.id : undefined;
          invalidate();
          setPexelsTarget(null);
          pushToast("تم اعتماد صورة القسم من Pexels.", "success");
          if (editingId) {
            void listCategories().then((list) => {
              const updated = list.find((c) => c.id === editingId);
              if (updated) setModal({ mode: "edit", category: updated });
            });
          }
        }}
      />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border-soft bg-cream/50 px-3 py-2">
      <p className="text-[11px] text-charcoal-soft">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-charcoal">{value}</p>
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <RequireRole navKey="categories">
      <CategoriesPageInner />
    </RequireRole>
  );
}
