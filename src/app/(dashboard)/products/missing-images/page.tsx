"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  ImageOff,
  Images,
  SkipForward,
} from "lucide-react";
import { RequireRole } from "@/components/layout/RequireRole";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FilterBar } from "@/components/ui/FilterBar";
import { FileUploadButton } from "@/components/ui/FileUploadButton";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState, LoadingState } from "@/components/ui/LoadingState";
import { ImageSearchModal } from "@/components/images/ImageSearchModal";
import { listCategories } from "@/lib/api/categories";
import { listMissingImages, markProductImageReviewed } from "@/lib/api/productImages";
import { uploadProductImage } from "@/lib/api/products";
import type { MissingImageProduct } from "@/lib/types";
import { formatDate, formatNumber } from "@/lib/utils/format";
import { COMMON_AR } from "@/lib/ar/labels";

function MissingImagesPageInner() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [includeReviewed, setIncludeReviewed] = useState(false);
  const [page, setPage] = useState(1);
  const [queueIndex, setQueueIndex] = useState(0);
  const [pexelsOpen, setPexelsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const limit = 24;

  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: listCategories });

  const missingQuery = useQuery({
    queryKey: ["missing-images", { q, categoryId, includeReviewed, page }],
    queryFn: () => listMissingImages({ page, limit, q: q || undefined, categoryId: categoryId || undefined, includeReviewed }),
  });

  const items = missingQuery.data?.data ?? [];
  const current: MissingImageProduct | undefined = items[queueIndex];
  const globalPosition = (page - 1) * limit + queueIndex + 1;
  const total = missingQuery.data?.meta.total ?? 0;

  useEffect(() => {
    setQueueIndex(0);
  }, [page, q, categoryId, includeReviewed]);

  useEffect(() => {
    if (items.length > 0 && queueIndex >= items.length) {
      setQueueIndex(Math.max(0, items.length - 1));
    }
  }, [items.length, queueIndex]);

  const advanceQueue = () => {
    if (queueIndex < items.length - 1) {
      setQueueIndex((i) => i + 1);
    } else if (missingQuery.data && page < missingQuery.data.meta.totalPages) {
      setPage((p) => p + 1);
    }
  };

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadProductImage(current!.id, file, true),
    onMutate: () => setUploading(true),
    onSettled: () => setUploading(false),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["missing-images"] });
      advanceQueue();
    },
  });

  const reviewedMutation = useMutation({
    mutationFn: (id: string) => markProductImageReviewed(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["missing-images"] });
      advanceQueue();
    },
  });

  const handlePexelsSelected = () => {
    queryClient.invalidateQueries({ queryKey: ["missing-images"] });
    setPexelsOpen(false);
    advanceQueue();
  };

  return (
    <div className="animate-in">
      <PageHeader
        title="الصور الناقصة"
        description="سير عمل سريع — منتج واحد في كل مرة: ابحث في Pexels، ارفع صورة، أو ضع علامة مُراجَع."
        breadcrumbs={[{ label: "المنتجات", href: "/products" }, { label: "الصور الناقصة" }]}
      />

      <Card>
        <FilterBar>
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="ابحث بالاسم أو رمز المنتج…"
            className="w-64"
          />
          <Select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
            className="w-44"
          >
            <option value="">كل الأقسام</option>
            {(categoriesQuery.data ?? [])
              .slice()
              .sort((a, b) => {
                const aKey = a.parentId ? `${a.parentId}:1:${a.nameAr}` : `${a.id}:0`;
                const bKey = b.parentId ? `${b.parentId}:1:${b.nameAr}` : `${b.id}:0`;
                return aKey.localeCompare(bKey, "ar");
              })
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parentId ? `— ${c.nameAr}` : c.nameAr}
                </option>
              ))}
          </Select>
          <label className="flex items-center gap-1.5 rounded-full border border-border-soft bg-surface px-3 py-1.5 text-sm text-charcoal-soft">
            <input
              type="checkbox"
              className="size-4 accent-amber-500"
              checked={includeReviewed}
              onChange={(e) => {
                setIncludeReviewed(e.target.checked);
                setPage(1);
              }}
            />
            تضمين المُراجَعة
          </label>
          {total > 0 && (
            <span className="ms-auto text-sm text-charcoal-soft">
              {formatNumber(globalPosition)} من {formatNumber(total)}
            </span>
          )}
        </FilterBar>

        {missingQuery.isLoading && <LoadingState label="جاري تحميل المنتجات…" />}
        {missingQuery.isError && (
          <ErrorState message="تعذر تحميل المنتجات." onRetry={() => missingQuery.refetch()} />
        )}
        {missingQuery.data && missingQuery.data.data.length === 0 && (
          <EmptyState
            icon={CheckCircle2}
            title="لا يوجد نواقص!"
            description="جميع المنتجات لديها صورة واحدة على الأقل."
          />
        )}

        {current && (
          <CardBody className="space-y-5">
            <div className="flex flex-col gap-4 rounded-[var(--radius-xl)] border border-amber-200 bg-amber-50/40 p-5 md:flex-row md:items-start">
              <div className="flex size-20 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-cream">
                <ImageOff className="size-8 text-amber-700" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-amber-800">
                  المنتج {formatNumber(globalPosition)} من {formatNumber(total)}
                </p>
                <Link
                  href={`/products/${current.id}`}
                  className="mt-1 block text-xl font-semibold text-charcoal hover:text-amber-700"
                >
                  {current.nameAr}
                </Link>
                <p className="text-sm text-charcoal-soft ltr-field">{current.nameEn}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-charcoal-soft">
                  <span>{current.category?.nameAr ?? COMMON_AR.uncategorized}</span>
                  <span>·</span>
                  <span className="ltr-field">{current.sku ?? COMMON_AR.noSku}</span>
                  {current.adminImageReviewedAt && (
                    <>
                      <span>·</span>
                      <span className="text-amber-700">مُراجَع {formatDate(current.adminImageReviewedAt)}</span>
                    </>
                  )}
                </div>
              </div>
              <Link
                href={`/products/${current.id}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-amber-700 hover:underline"
              >
                تفاصيل المنتج
                <ChevronRight className="size-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Button className="h-12" onClick={() => setPexelsOpen(true)}>
                <Images className="size-4" />
                بحث Pexels
              </Button>
              <FileUploadButton
                variant="outline"
                label="رفع صورة"
                isLoading={uploading}
                onFileSelected={(file) => uploadMutation.mutate(file)}
              />
              <Button
                variant="secondary"
                className="h-12"
                onClick={advanceQueue}
                disabled={queueIndex >= items.length - 1 && page >= (missingQuery.data?.meta.totalPages ?? 1)}
              >
                <SkipForward className="size-4" />
                تخطي
              </Button>
              {!current.adminImageReviewedAt && (
                <Button
                  variant="outline"
                  className="h-12"
                  isLoading={reviewedMutation.isPending}
                  onClick={() => reviewedMutation.mutate(current.id)}
                >
                  <CheckCircle2 className="size-4" />
                  تمت المراجعة
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border-soft pt-4">
              <Button
                variant="ghost"
                size="sm"
                disabled={queueIndex === 0 && page === 1}
                onClick={() => {
                  if (queueIndex > 0) {
                    setQueueIndex((i) => i - 1);
                  } else if (page > 1) {
                    setPage((p) => p - 1);
                  }
                }}
              >
                <ArrowRight className="size-4" />
                السابق
              </Button>
              <span className="text-xs text-charcoal-soft">
                {formatNumber(queueIndex + 1)} من {formatNumber(items.length)} في هذه الصفحة
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={queueIndex >= items.length - 1 && page >= (missingQuery.data?.meta.totalPages ?? 1)}
                onClick={advanceQueue}
              >
                التالي
                <ArrowLeft className="size-4" />
              </Button>
            </div>
          </CardBody>
        )}

        {missingQuery.data && missingQuery.data.data.length > 0 && (
          <Pagination
            page={page}
            totalPages={missingQuery.data.meta.totalPages}
            total={missingQuery.data.meta.total}
            limit={limit}
            onPageChange={setPage}
          />
        )}
      </Card>

      {current && (
        <ImageSearchModal
          open={pexelsOpen}
          onClose={() => setPexelsOpen(false)}
          productId={current.id}
          productName={current.nameAr}
          defaultQuery={current.nameEn}
          onSelected={handlePexelsSelected}
        />
      )}

      <p className="mt-3 text-center text-[11px] text-charcoal-soft">
        الصور من Pexels تُنسب تلقائيًا للمصور —{" "}
        <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer" className="text-amber-700 hover:underline">
          pexels.com
        </a>
      </p>
    </div>
  );
}

export default function MissingImagesPage() {
  return (
    <RequireRole navKey="missingImages">
      <MissingImagesPageInner />
    </RequireRole>
  );
}
