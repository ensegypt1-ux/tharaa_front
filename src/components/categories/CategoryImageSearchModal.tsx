"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, ExternalLink, Search } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { assignCategoryImageFromUrl, searchCategoryImages } from "@/lib/api/categories";
import { getErrorCode, getErrorMessage } from "@/lib/api/errors";
import type { PexelsSearchResult } from "@/lib/types";
import { formatNumber } from "@/lib/utils/format";

const ERROR_MESSAGES: Record<string, string> = {
  PEXELS_MISSING_API_KEY: "مفتاح Pexels غير مُعد على الخادم.",
  PEXELS_RATE_LIMITED: "تم تجاوز حد طلبات Pexels. حاول لاحقًا.",
  PEXELS_UNAVAILABLE: "خدمة Pexels غير متاحة حاليًا.",
  IMAGE_DOWNLOAD_FAILED: "تعذر تنزيل الصورة المحددة.",
  INVALID_IMAGE: "الملف المحدد ليس صورة صالحة.",
};

export function CategoryImageSearchModal({
  open,
  onClose,
  categoryId,
  categoryName,
  defaultQuery,
  onSelected,
}: {
  open: boolean;
  onClose: () => void;
  categoryId: string;
  categoryName?: string;
  defaultQuery?: string;
  onSelected: () => void;
}) {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState<string>("");
  const [page, setPage] = useState(1);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [autoSearched, setAutoSearched] = useState(false);

  useEffect(() => {
    if (!open) {
      setAutoSearched(false);
      return;
    }
    if (defaultQuery && !autoSearched) {
      setQuery(defaultQuery);
      setSubmittedQuery(defaultQuery);
      setPage(1);
      setAutoSearched(true);
    }
  }, [open, defaultQuery, autoSearched]);

  const searchQuery = useQuery({
    queryKey: ["category-pexels-search", submittedQuery, page],
    queryFn: () => searchCategoryImages({ query: submittedQuery, page, perPage: 15 }),
    enabled: open && submittedQuery.trim().length > 0,
  });

  const selectMutation = useMutation({
    mutationFn: (result: PexelsSearchResult) =>
      assignCategoryImageFromUrl(categoryId, {
        imageUrl: result.imageUrl,
        photographer: result.photographer,
        photographerUrl: result.photographerUrl,
        sourceUrl: result.sourceUrl,
        sourceProvider: result.sourceProvider,
      }),
    onMutate: (result) => setSelectingId(result.id),
    onSettled: () => setSelectingId(null),
    onSuccess: () => onSelected(),
  });

  const errorCode = searchQuery.error ? getErrorCode(searchQuery.error) : undefined;
  const errorMessage = errorCode
    ? ERROR_MESSAGES[errorCode] ?? getErrorMessage(searchQuery.error)
    : selectMutation.error
      ? ERROR_MESSAGES[getErrorCode(selectMutation.error) ?? ""] ?? getErrorMessage(selectMutation.error)
      : undefined;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={categoryName ? `بحث صورة لقسم «${categoryName}»` : "بحث صورة القسم"}
      size="xl"
    >
      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const q = query.trim();
          if (!q) return;
          setSubmittedQuery(q);
          setPage(1);
        }}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-charcoal-soft" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="مثال: fresh vegetables"
            className="ps-9 ltr-field"
          />
        </div>
        <Button type="submit">بحث</Button>
      </form>

      <p className="mb-3 text-xs text-charcoal-soft">
        لن تُعيَّن أي صورة تلقائيًا — اختر صورة للموافقة والتنزيل إلى التخزين المحلي.
      </p>

      {errorMessage && (
        <div className="mb-3 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
          {errorMessage}
        </div>
      )}

      {!submittedQuery && <p className="py-10 text-center text-sm text-charcoal-soft">أدخل كلمة بحث للبدء.</p>}
      {searchQuery.isLoading && <LoadingState label="جارٍ البحث…" />}
      {searchQuery.data && searchQuery.data.results.length === 0 && (
        <p className="py-10 text-center text-sm text-charcoal-soft">لا توجد نتائج.</p>
      )}

      {searchQuery.data && searchQuery.data.results.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {searchQuery.data.results.map((result) => (
              <div
                key={result.id}
                className="overflow-hidden rounded-[var(--radius-lg)] border border-border-soft bg-surface"
              >
                <div className="relative aspect-[4/3]">
                  <Image src={result.previewUrl} alt={result.alt || ""} fill unoptimized className="object-cover" />
                </div>
                <div className="space-y-2 p-2.5">
                  <a
                    href={result.photographerUrl || result.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] text-charcoal-soft hover:text-amber-700"
                  >
                    <ExternalLink className="size-3 shrink-0" />
                    <span className="truncate">{result.photographer || "Pexels"}</span>
                  </a>
                  <Button
                    size="sm"
                    className="w-full"
                    isLoading={selectingId === result.id}
                    onClick={() => selectMutation.mutate(result)}
                  >
                    <Check className="size-3.5" />
                    اعتماد الصورة
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-charcoal-soft">
            <span>
              صفحة {formatNumber(page)} — {formatNumber(searchQuery.data.total)} نتيجة
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                السابق
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page * (searchQuery.data.perPage || 15) >= searchQuery.data.total}
                onClick={() => setPage((p) => p + 1)}
              >
                التالي
              </Button>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
