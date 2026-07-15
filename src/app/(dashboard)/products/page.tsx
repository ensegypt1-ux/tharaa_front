"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Eye,
  FolderInput,
  ImageIcon,
  ImageOff,
  Package,
  Plus,
  Search,
  Star,
  TrendingUp,
} from "lucide-react";
import { RequireRole } from "@/components/layout/RequireRole";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { BooleanBadge, StockStatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/LoadingState";
import { IconButton } from "@/components/ui/IconButton";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { bulkReassignProducts, listProducts } from "@/lib/api/products";
import { listCategories } from "@/lib/api/categories";
import type { Category, Product } from "@/lib/types";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils/format";
import { COMMON_AR } from "@/lib/ar/labels";
import { cn } from "@/lib/utils/cn";
import { getErrorMessage } from "@/lib/api/errors";
import { useToast } from "@/components/ui/Toaster";

type TriState = "" | "true" | "false";

function stockStatus(product: Product): "IN_STOCK" | "LOW" | "OUT" {
  if (product.availableQuantity <= 0) return "OUT";
  if (product.availableQuantity <= product.lowStockThreshold) return "LOW";
  return "IN_STOCK";
}

function imageCount(product: Product): number {
  return product.imageCount ?? product.images.length;
}

function buildCategoryOptions(categories: Category[]) {
  const parents = categories.filter((c) => !c.parentId);
  const childrenByParent = new Map<string, Category[]>();
  for (const c of categories) {
    if (!c.parentId) continue;
    const list = childrenByParent.get(c.parentId) ?? [];
    list.push(c);
    childrenByParent.set(c.parentId, list);
  }
  const options: { id: string; label: string }[] = [];
  for (const parent of parents) {
    options.push({ id: parent.id, label: parent.nameAr });
    for (const child of childrenByParent.get(parent.id) ?? []) {
      options.push({ id: child.id, label: `— ${child.nameAr}` });
    }
  }
  return options;
}

function ProductsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isActive, setIsActive] = useState<TriState>("");
  const [inStock, setInStock] = useState<TriState>("");
  const [missingImages, setMissingImages] = useState(false);
  const [lowStock, setLowStock] = useState(false);
  const [isFeatured, setIsFeatured] = useState<TriState>("");
  const [isBestSeller, setIsBestSeller] = useState<TriState>("");
  const [sortBy, setSortBy] = useState<"newest" | "name" | "price" | "stock">("newest");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkTargetCategoryId, setBulkTargetCategoryId] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const limit = 20;

  useEffect(() => {
    const fromUrl = searchParams.get("categoryId");
    if (fromUrl) {
      setCategoryId(fromUrl);
      setPage(1);
    }
  }, [searchParams]);

  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: listCategories });

  const categoryOptions = useMemo(
    () => buildCategoryOptions(categoriesQuery.data ?? []),
    [categoriesQuery.data],
  );

  const selectedCategoryIsParent = useMemo(() => {
    const cat = (categoriesQuery.data ?? []).find((c) => c.id === categoryId);
    return Boolean(cat && !cat.parentId && (cat.childrenCount ?? 0) > 0);
  }, [categoriesQuery.data, categoryId]);

  const productsQuery = useQuery({
    queryKey: [
      "products",
      {
        q,
        categoryId,
        isActive,
        inStock,
        missingImages,
        lowStock,
        isFeatured,
        isBestSeller,
        sortBy,
        sortDir,
        page,
        includeChildren: selectedCategoryIsParent,
      },
    ],
    queryFn: () =>
      listProducts({
        page,
        limit,
        q: q || undefined,
        categoryId: categoryId || undefined,
        includeChildren: selectedCategoryIsParent || undefined,
        isActive: isActive === "" ? undefined : isActive === "true",
        inStock: inStock === "" ? undefined : inStock === "true",
        missingImages: missingImages || undefined,
        lowStock: lowStock || undefined,
        isFeatured: isFeatured === "" ? undefined : isFeatured === "true",
        isBestSeller: isBestSeller === "" ? undefined : isBestSeller === "true",
        sortBy,
        sortDir,
      }),
  });

  const bulkMutation = useMutation({
    mutationFn: () => bulkReassignProducts(selectedIds, bulkTargetCategoryId),
    onSuccess: (result) => {
      pushToast(`تم نقل ${formatNumber(result.updated)} منتجًا.`, "success");
      setSelectedIds([]);
      setBulkOpen(false);
      setBulkTargetCategoryId("");
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (err) => pushToast(getErrorMessage(err), "error"),
  });

  const categoryName = (product: Product) => {
    const fromProduct = product.category;
    const cat =
      fromProduct ??
      categoriesQuery.data?.find((c) => c.id === product.categoryId);
    if (!cat) return COMMON_AR.uncategorized;
    const parentId = "parentId" in cat ? (cat as Category).parentId : undefined;
    if (parentId) {
      const parent = categoriesQuery.data?.find((c) => c.id === parentId);
      return parent ? `${parent.nameAr} ← ${cat.nameAr}` : cat.nameAr;
    }
    const full = categoriesQuery.data?.find((c) => c.id === cat.id);
    if (full?.parentId) {
      const parent = categoriesQuery.data?.find((c) => c.id === full.parentId);
      return parent ? `${parent.nameAr} ← ${full.nameAr}` : full.nameAr;
    }
    return cat.nameAr;
  };

  const pageIds = (productsQuery.data?.data ?? []).map((p) => p.id);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));

  const columns: DataTableColumn<Product>[] = [
    {
      key: "select",
      header: "حدد",
      className: "w-10",
      render: (p) => (
        <input
          type="checkbox"
          className="size-4 accent-amber-500"
          checked={selectedIds.includes(p.id)}
          onChange={() =>
            setSelectedIds((prev) =>
              prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id],
            )
          }
          onClick={(e) => e.stopPropagation()}
          aria-label="تحديد المنتج"
        />
      ),
    },
    {
      key: "image",
      header: "الصورة",
      className: "w-14",
      render: (p) => {
        const hasImage = imageCount(p) > 0 && p.images[0]?.url;
        return (
          <div
            className={cn(
              "relative flex size-10 items-center justify-center overflow-hidden rounded-lg border",
              hasImage ? "border-border-soft bg-cream" : "border-amber-200 bg-amber-50",
            )}
          >
            {hasImage ? (
              <Image src={p.images[0].url} alt={p.nameAr} fill className="object-cover" unoptimized />
            ) : (
              <ImageOff className="size-4 text-amber-700" />
            )}
          </div>
        );
      },
    },
    {
      key: "name",
      header: "الاسم",
      render: (p) => (
        <div className="min-w-[10rem]">
          <p className="font-medium text-charcoal">{p.nameAr}</p>
          <p className="text-xs text-charcoal-soft ltr-field">{p.nameEn}</p>
        </div>
      ),
    },
    {
      key: "sku",
      header: COMMON_AR.sku,
      render: (p) => (
        <span className="ltr-field text-sm text-charcoal-soft">{p.sku ?? COMMON_AR.noSku}</span>
      ),
    },
    {
      key: "category",
      header: COMMON_AR.category,
      render: (p) => <span className="text-sm">{categoryName(p)}</span>,
    },
    {
      key: "price",
      header: "السعر",
      render: (p) => (
        <div className="whitespace-nowrap">
          <p className="font-medium text-charcoal">{formatCurrency(p.effectivePrice ?? p.regularPrice)}</p>
          {p.salePrice != null && (
            <p className="text-xs text-charcoal-soft">
              <span className="line-through">{formatCurrency(p.regularPrice)}</span>
              <span className="ms-1 text-amber-700">عرض</span>
            </p>
          )}
        </div>
      ),
    },
    {
      key: "stock",
      header: COMMON_AR.stock,
      render: (p) => (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">
            {formatNumber(p.availableQuantity)} {p.unit}
          </span>
          <StockStatusBadge status={stockStatus(p)} />
        </div>
      ),
    },
    {
      key: "status",
      header: COMMON_AR.status,
      render: (p) => <BooleanBadge value={p.isActive} />,
    },
    {
      key: "featured",
      header: COMMON_AR.featured,
      align: "center",
      render: (p) =>
        p.isFeatured ? (
          <Star className="mx-auto size-4 fill-amber-500 text-amber-500" aria-label={COMMON_AR.featured} />
        ) : (
          <span className="text-charcoal-soft">—</span>
        ),
    },
    {
      key: "bestseller",
      header: COMMON_AR.bestSeller,
      align: "center",
      render: (p) =>
        p.isBestSeller ? (
          <TrendingUp className="mx-auto size-4 text-info" aria-label={COMMON_AR.bestSeller} />
        ) : (
          <span className="text-charcoal-soft">—</span>
        ),
    },
    {
      key: "images",
      header: "الصور",
      align: "center",
      render: (p) => {
        const count = imageCount(p);
        return (
          <span className={cn("text-sm", count === 0 && "font-medium text-danger")}>
            {formatNumber(count)}
          </span>
        );
      },
    },
    {
      key: "updated",
      header: COMMON_AR.updatedAt,
      render: (p) => (
        <span className="whitespace-nowrap text-xs text-charcoal-soft">{formatDate(p.updatedAt)}</span>
      ),
    },
    {
      key: "actions",
      header: "إجراءات",
      align: "end",
      headerClassName: "text-end",
      className: "text-end",
      render: (p) => (
        <IconButton
          label="تفاصيل المنتج"
          tone="amber"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/products/${p.id}`);
          }}
        >
          <Eye className="size-3.5" />
        </IconButton>
      ),
    },
  ];

  const activeFilterCount = [
    q,
    categoryId,
    isActive,
    inStock,
    isFeatured,
    isBestSeller,
    missingImages,
    lowStock,
  ].filter(Boolean).length;

  return (
    <div className="animate-in">
      <PageHeader
        title="المنتجات"
        description="كتالوج المنتجات — بحث، تصفية، ومتابعة المخزون والصور."
        actions={
          <>
            {selectedIds.length > 0 && (
              <Button variant="outline" onClick={() => setBulkOpen(true)}>
                <FolderInput className="size-4" />
                نقل المحدد ({formatNumber(selectedIds.length)})
              </Button>
            )}
            <Button variant="outline" onClick={() => router.push("/products/missing-images")}>
              <ImageIcon className="size-4" />
              الصور الناقصة
            </Button>
            <Button onClick={() => router.push("/products/new")}>
              <Plus className="size-4" />
              منتج جديد
            </Button>
          </>
        }
      />

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
              placeholder="ابحث بالاسم أو رمز المنتج…"
              className="ps-9"
            />
          </div>
          <Select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
            className="w-56"
          >
            <option value="">كل الأقسام</option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
          <label className="flex items-center gap-1.5 text-xs text-charcoal-soft">
            <input
              type="checkbox"
              className="size-4 accent-amber-500"
              checked={allPageSelected}
              onChange={() => {
                if (allPageSelected) {
                  setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
                } else {
                  setSelectedIds((prev) => [...new Set([...prev, ...pageIds])]);
                }
              }}
            />
            تحديد الصفحة
          </label>
          <Select
            value={isActive}
            onChange={(e) => {
              setIsActive(e.target.value as TriState);
              setPage(1);
            }}
            className="w-32"
          >
            <option value="">أي حالة</option>
            <option value="true">نشط</option>
            <option value="false">غير نشط</option>
          </Select>
          <Select
            value={inStock}
            onChange={(e) => {
              setInStock(e.target.value as TriState);
              setPage(1);
            }}
            className="w-36"
          >
            <option value="">أي مخزون</option>
            <option value="true">متوفر</option>
            <option value="false">غير متوفر</option>
          </Select>
          <Select
            value={isFeatured}
            onChange={(e) => {
              setIsFeatured(e.target.value as TriState);
              setPage(1);
            }}
            className="w-32"
          >
            <option value="">مميز؟</option>
            <option value="true">مميز</option>
            <option value="false">غير مميز</option>
          </Select>
          <Select
            value={isBestSeller}
            onChange={(e) => {
              setIsBestSeller(e.target.value as TriState);
              setPage(1);
            }}
            className="w-36"
          >
            <option value="">الأكثر مبيعًا؟</option>
            <option value="true">الأكثر مبيعًا</option>
            <option value="false">ليس من الأكثر مبيعًا</option>
          </Select>
          <label className="flex items-center gap-1.5 rounded-full border border-border-soft bg-surface px-3 py-1.5 text-sm text-charcoal-soft">
            <input
              type="checkbox"
              className="size-4 accent-amber-500"
              checked={missingImages}
              onChange={(e) => {
                setMissingImages(e.target.checked);
                setPage(1);
              }}
            />
            بلا صور
          </label>
          <label className="flex items-center gap-1.5 rounded-full border border-border-soft bg-surface px-3 py-1.5 text-sm text-charcoal-soft">
            <input
              type="checkbox"
              className="size-4 accent-amber-500"
              checked={lowStock}
              onChange={(e) => {
                setLowStock(e.target.checked);
                setPage(1);
              }}
            />
            مخزون منخفض
          </label>
          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="w-32">
            <option value="newest">الأحدث</option>
            <option value="name">الاسم</option>
            <option value="price">السعر</option>
            <option value="stock">المخزون</option>
          </Select>
          <Select value={sortDir} onChange={(e) => setSortDir(e.target.value as typeof sortDir)} className="w-28">
            <option value="desc">تنازلي</option>
            <option value="asc">تصاعدي</option>
          </Select>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQ("");
                setCategoryId("");
                setIsActive("");
                setInStock("");
                setIsFeatured("");
                setIsBestSeller("");
                setMissingImages(false);
                setLowStock(false);
                setPage(1);
              }}
            >
              مسح التصفية
            </Button>
          )}
        </FilterBar>

        {productsQuery.isLoading && <SkeletonTable rows={10} cols={12} />}
        {productsQuery.isError && (
          <ErrorState message="تعذر تحميل المنتجات." onRetry={() => productsQuery.refetch()} />
        )}
        {productsQuery.data && productsQuery.data.data.length === 0 && (
          <EmptyState
            icon={Package}
            title="لم يتم العثور على منتجات"
            description="حاول تعديل عوامل التصفية أو أضف منتجًا جديدًا."
          />
        )}
        {productsQuery.data && productsQuery.data.data.length > 0 && (
          <>
            <div className="flex items-center gap-2 border-b border-border-soft bg-cream/30 px-4 py-2 text-xs text-charcoal-soft">
              <AlertTriangle className="size-3.5 shrink-0 text-amber-600" />
              <span>
                الصفوف المميزة بلون كهرماني: بلا صور أو مخزون منخفض أو غير متوفر.
              </span>
            </div>
            <DataTable
              columns={columns}
              rows={productsQuery.data.data}
              rowKey={(p) => p.id}
              dense
              onRowClick={(p) => router.push(`/products/${p.id}`)}
              getRowClassName={(p) => {
                const status = stockStatus(p);
                const noImg = imageCount(p) === 0;
                if (noImg || status === "OUT") return "bg-red-50/60";
                if (status === "LOW") return "bg-amber-50/50";
                return undefined;
              }}
            />
            <Pagination
              page={page}
              totalPages={productsQuery.data.meta.totalPages}
              total={productsQuery.data.meta.total}
              limit={limit}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      <p className="mt-3 text-xs text-charcoal-soft">
        لمعالجة المنتجات بلا صور بسرعة، انتقل إلى{" "}
        <Link href="/products/missing-images" className="font-medium text-amber-700 hover:underline">
          سير عمل الصور الناقصة
        </Link>
        .
      </p>

      <Modal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="نقل المنتجات المحددة"
        footer={
          <>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>
              {COMMON_AR.cancel}
            </Button>
            <Button
              disabled={!bulkTargetCategoryId || selectedIds.length === 0}
              isLoading={bulkMutation.isPending}
              onClick={() => bulkMutation.mutate()}
            >
              نقل {formatNumber(selectedIds.length)} منتج
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-charcoal-soft">
          اختر القسم أو القسم الفرعي لنقل المنتجات المحددة إليه.
        </p>
        <Select
          value={bulkTargetCategoryId}
          onChange={(e) => setBulkTargetCategoryId(e.target.value)}
        >
          <option value="">اختر القسم…</option>
          {categoryOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>
      </Modal>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <RequireRole navKey="products">
      <ProductsPageInner />
    </RequireRole>
  );
}
