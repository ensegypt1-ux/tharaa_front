"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, ExternalLink, Search, TriangleAlert } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { searchProductImages, selectProductImage } from "@/lib/api/productImages";
import { getErrorCode, getErrorMessage } from "@/lib/api/errors";
import type { PexelsSearchResult } from "@/lib/types";
import { COMMON_AR } from "@/lib/ar/labels";
import { formatNumber } from "@/lib/utils/format";

const ERROR_MESSAGES: Record<string, string> = {
  PEXELS_MISSING_API_KEY: "مفتاح Pexels غير مُعد على الخادم.",
  PEXELS_RATE_LIMITED: "تم تجاوز حد طلبات Pexels. حاول لاحقًا.",
  PEXELS_UNAVAILABLE: "خدمة Pexels غير متاحة حاليًا.",
  IMAGE_DOWNLOAD_FAILED: "تعذر تنزيل الصورة المحددة.",
  INVALID_IMAGE: "الملف المحدد ليس صورة صالحة.",
};

export function ImageSearchModal({
  open,
  onClose,
  productId,
  productName,
  defaultQuery,
  onSelected,
}: {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName?: string;
  defaultQuery?: string;
  onSelected: () => void;
}) {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState<string | undefined>(undefined);
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
    queryKey: ["pexels-search", productId, submittedQuery, page],
    queryFn: () => searchProductImages({ productId, query: submittedQuery, page, perPage: 15 }),
    enabled: open,
  });

  const selectMutation = useMutation({
    mutationFn: (result: PexelsSearchResult) =>
      selectProductImage({
        productId,
        imageUrl: result.imageUrl,
        photographer: result.photographer,
        photographerUrl: result.photographerUrl,
        sourceUrl: result.sourceUrl,
        sourceProvider: result.sourceProvider,
      }),
    onMutate: (result) => setSelectingId(result.id),
    onSettled: () => setSelectingId(null),
    onSuccess: () => {
      onSelected();
    },
  });

  const errorCode = searchQuery.error ? getErrorCode(searchQuery.error) : undefined;
  const errorMessage = errorCode
    ? ERROR_MESSAGES[errorCode] ?? getErrorMessage(searchQuery.error)
    : undefined;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={productName ? `البحث عن صورة لـ «${productName}»` : "البحث عن صورة"}
      size="xl"
    >
      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmittedQuery(query.trim() || undefined);
          setPage(1);
        }}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-charcoal-soft" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث باسم المنتج أو كلمة مفتاحية…"
            className="ps-9"
          />
        </div>
        <Button type="submit" variant="outline">
          {COMMON_AR.search}
        </Button>
      </form>

      {selectMutation.isError && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
          <TriangleAlert className="size-4 shrink-0" />
          {getErrorMessage(selectMutation.error)}
        </div>
      )}

      {searchQuery.isLoading && <LoadingState label="جاري البحث في Pexels…" />}

      {searchQuery.isError && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-8 text-center">
          <TriangleAlert className="size-6 text-danger" />
          <p className="text-sm font-medium text-danger">{errorMessage}</p>
        </div>
      )}

      {searchQuery.data && (
        <>
          {searchQuery.data.results.length === 0 ? (
            <p className="py-10 text-center text-sm text-charcoal-soft">لا توجد صور لهذه العبارة.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {searchQuery.data.results.map((result) => (
                <div
                  key={result.id}
                  className="group relative overflow-hidden rounded-xl border border-border-soft bg-cream"
                >
                  <div className="relative aspect-square w-full">
                    <Image
                      src={result.previewUrl}
                      alt={result.alt || "صورة من Pexels"}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="absolute inset-0 flex flex-col justify-between bg-charcoal/0 p-2 opacity-0 transition group-hover:bg-charcoal/50 group-hover:opacity-100">
                    <div className="rounded bg-charcoal/70 px-1.5 py-1 text-[10px] text-cream">
                      <p className="truncate">{result.photographer}</p>
                      {result.photographerUrl && (
                        <a
                          href={result.photographerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 inline-flex items-center gap-0.5 text-amber-200 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          المصور
                          <ExternalLink className="size-2.5" />
                        </a>
                      )}
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      isLoading={selectingId === result.id}
                      onClick={() => selectMutation.mutate(result)}
                    >
                      <Check className="size-3.5" />
                      اختيار
                    </Button>
                  </div>
                  <p className="truncate px-2 py-1 text-[10px] text-charcoal-soft group-hover:invisible">
                    {result.photographer}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-charcoal-soft">
            <span>
              {COMMON_AR.page} {formatNumber(searchQuery.data.page)} · {formatNumber(searchQuery.data.total)} نتيجة
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                {COMMON_AR.previous}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={searchQuery.data.results.length < searchQuery.data.perPage}
                onClick={() => setPage((p) => p + 1)}
              >
                {COMMON_AR.next}
              </Button>
            </div>
          </div>
        </>
      )}

      <p className="mt-4 border-t border-border-soft pt-3 text-center text-[11px] text-charcoal-soft">
        الصور مقدّمة من{" "}
        <a
          href="https://www.pexels.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-amber-700 hover:underline"
        >
          Pexels
        </a>
        — يُحفظ اسم المصور مع كل صورة مختارة.
      </p>
    </Modal>
  );
}
