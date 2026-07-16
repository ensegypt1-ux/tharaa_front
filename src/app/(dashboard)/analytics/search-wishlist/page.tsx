"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { Heart, ImageIcon, Search } from "lucide-react";
import { RequireRole } from "@/components/layout/RequireRole";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Input, Select } from "@/components/ui/Input";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { Badge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/LoadingState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { getSearchAnalytics, getWishlistAnalytics } from "@/lib/api/analytics";
import type {
  AnalyticsSortDir,
  SearchAnalyticsSortBy,
  SearchAnalyticsTerm,
  WishlistAnalyticsProduct,
} from "@/lib/types";
import { formatDateTime, formatNumber } from "@/lib/utils/format";
import { COMMON_AR } from "@/lib/ar/labels";

const PAGE_SIZE = 20;

function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

function SearchWishlistAnalyticsInner() {
  const [searchQ, setSearchQ] = useState("");
  const [searchSortBy, setSearchSortBy] = useState<SearchAnalyticsSortBy>("count");
  const [searchSortDir, setSearchSortDir] = useState<AnalyticsSortDir>("desc");
  const [searchPage, setSearchPage] = useState(1);

  const [wishlistQ, setWishlistQ] = useState("");
  const [wishlistSortDir, setWishlistSortDir] = useState<AnalyticsSortDir>("desc");
  const [wishlistPage, setWishlistPage] = useState(1);

  const debouncedSearchQ = useDebouncedValue(searchQ.trim());
  const debouncedWishlistQ = useDebouncedValue(wishlistQ.trim());

  useEffect(() => {
    setSearchPage(1);
  }, [debouncedSearchQ, searchSortBy, searchSortDir]);

  useEffect(() => {
    setWishlistPage(1);
  }, [debouncedWishlistQ, wishlistSortDir]);

  const searchQuery = useQuery({
    queryKey: [
      "analytics",
      "search",
      {
        page: searchPage,
        q: debouncedSearchQ || undefined,
        sortBy: searchSortBy,
        sortDir: searchSortDir,
      },
    ],
    queryFn: () =>
      getSearchAnalytics({
        page: searchPage,
        limit: PAGE_SIZE,
        q: debouncedSearchQ || undefined,
        sortBy: searchSortBy,
        sortDir: searchSortDir,
        recentLimit: 12,
      }),
  });

  const wishlistQuery = useQuery({
    queryKey: [
      "analytics",
      "wishlist",
      {
        page: wishlistPage,
        q: debouncedWishlistQ || undefined,
        sortDir: wishlistSortDir,
      },
    ],
    queryFn: () =>
      getWishlistAnalytics({
        page: wishlistPage,
        limit: PAGE_SIZE,
        q: debouncedWishlistQ || undefined,
        sortBy: "wishlistCount",
        sortDir: wishlistSortDir,
      }),
  });

  const searchColumns: DataTableColumn<SearchAnalyticsTerm>[] = useMemo(
    () => [
      {
        key: "term",
        header: "كلمة البحث",
        render: (row) => <span className="font-medium text-charcoal">{row.term}</span>,
      },
      {
        key: "count",
        header: "عدد مرات البحث",
        render: (row) => (
          <span className="tabular-nums font-medium">{formatNumber(row.count)}</span>
        ),
      },
      {
        key: "lastSearchedAt",
        header: "آخر نشاط",
        render: (row) => (
          <span className="text-xs text-charcoal-soft">{formatDateTime(row.lastSearchedAt)}</span>
        ),
      },
    ],
    [],
  );

  const wishlistColumns: DataTableColumn<WishlistAnalyticsProduct>[] = useMemo(
    () => [
      {
        key: "image",
        header: COMMON_AR.image,
        className: "w-16",
        render: (row) => (
          <div className="relative flex size-11 items-center justify-center overflow-hidden rounded-[var(--radius-md)] border border-border-soft bg-cream">
            {row.imageUrl ? (
              <Image
                src={row.imageUrl}
                alt={row.nameAr}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <ImageIcon className="size-5 text-charcoal-soft" />
            )}
          </div>
        ),
      },
      {
        key: "nameAr",
        header: COMMON_AR.nameAr,
        render: (row) => <p className="font-medium text-charcoal">{row.nameAr}</p>,
      },
      {
        key: "nameEn",
        header: COMMON_AR.nameEn,
        render: (row) => (
          <p className="text-sm text-charcoal-soft ltr-field">{row.nameEn}</p>
        ),
      },
      {
        key: "isActive",
        header: COMMON_AR.status,
        render: (row) => (
          <Badge tone={row.isActive ? "green" : "gray"}>
            {row.isActive ? COMMON_AR.active : COMMON_AR.inactive}
          </Badge>
        ),
      },
      {
        key: "wishlistCount",
        header: "مرات الإضافة للمفضلة",
        render: (row) => (
          <span className="tabular-nums font-medium">{formatNumber(row.wishlistCount)}</span>
        ),
      },
    ],
    [],
  );

  const popularMeta = searchQuery.data?.popularSearches.meta;
  const wishlistMeta = wishlistQuery.data?.topWishlistedProducts.meta;
  const recentSearches = searchQuery.data?.recentSearches ?? [];
  const popularRows = searchQuery.data?.popularSearches.data ?? [];
  const wishlistRows = wishlistQuery.data?.topWishlistedProducts.data ?? [];

  return (
    <div className="page-shell animate-in min-w-0 overflow-x-hidden">
      <PageHeader
        title="تحليلات البحث والمفضلة"
        description="ملخص مجمّع لكلمات البحث ومنتجات المفضلة دون عرض هويات المستخدمين أو سجلاتهم الفردية."
      />

      {/* Search analytics */}
      <section className="mb-6 space-y-4">
        <h2 className="text-lg font-semibold text-charcoal">تحليلات البحث</h2>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-2">
          <StatCard
            label="إجمالي عمليات البحث المسجّلة"
            value={
              searchQuery.isLoading
                ? "…"
                : formatNumber(searchQuery.data?.totals.totalSearches ?? 0)
            }
            icon={Search}
            loading={searchQuery.isLoading}
          />
          <StatCard
            label="إجمالي الكلمات الفريدة"
            value={
              searchQuery.isLoading
                ? "…"
                : formatNumber(searchQuery.data?.totals.uniqueTerms ?? 0)
            }
            icon={Search}
            loading={searchQuery.isLoading}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>أحدث عمليات البحث</CardTitle>
          </CardHeader>
          <CardBody>
            {searchQuery.isLoading && (
              <p className="text-sm text-charcoal-soft">{COMMON_AR.loading}</p>
            )}
            {searchQuery.isError && (
              <ErrorState
                message="تعذر تحميل أحدث عمليات البحث."
                onRetry={() => searchQuery.refetch()}
              />
            )}
            {searchQuery.isSuccess && recentSearches.length === 0 && (
              <EmptyState
                icon={Search}
                title="لا توجد عمليات بحث مسجّلة بعد"
                description="ستظهر هنا أحدث الكلمات بعد بدء المستخدمين بالبحث في التطبيق."
              />
            )}
            {recentSearches.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((item) => (
                  <button
                    key={`${item.term}-${item.lastSearchedAt}`}
                    type="button"
                    onClick={() => setSearchQ(item.term)}
                    className="inline-flex max-w-full items-center gap-2 rounded-full border border-border-soft bg-cream/70 px-3 py-1.5 text-sm text-charcoal transition hover:border-amber-300 hover:bg-amber-50"
                    title={formatDateTime(item.lastSearchedAt)}
                  >
                    <span className="truncate">{item.term}</span>
                    <Badge tone="amber">{formatNumber(item.count)}</Badge>
                  </button>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>الكلمات الأكثر بحثًا</CardTitle>
          </CardHeader>
          <FilterBar className="flex-col items-stretch sm:flex-row sm:items-center">
            <div className="relative w-full min-w-0 sm:w-64">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-charcoal-soft" />
              <Input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="تصفية حسب كلمة البحث…"
                className="ps-9"
              />
            </div>
            <Select
              value={searchSortBy}
              onChange={(e) => setSearchSortBy(e.target.value as SearchAnalyticsSortBy)}
              className="w-full min-w-0 sm:w-48"
            >
              <option value="count">ترتيب حسب عدد مرات البحث</option>
              <option value="lastSearchedAt">ترتيب حسب آخر نشاط</option>
            </Select>
            <Select
              value={searchSortDir}
              onChange={(e) => setSearchSortDir(e.target.value as AnalyticsSortDir)}
              className="w-full min-w-0 sm:w-40"
            >
              <option value="desc">تنازلي</option>
              <option value="asc">تصاعدي</option>
            </Select>
          </FilterBar>

          {searchQuery.isLoading && (
            <div className="p-4">
              <SkeletonTable rows={6} cols={3} />
            </div>
          )}
          {searchQuery.isError && (
            <div className="p-4">
              <ErrorState
                message="تعذر تحميل كلمات البحث الشائعة."
                onRetry={() => searchQuery.refetch()}
              />
            </div>
          )}
          {searchQuery.isSuccess && popularRows.length === 0 && (
            <EmptyState
              icon={Search}
              title={debouncedSearchQ ? COMMON_AR.noResults : "لا توجد كلمات بحث بعد"}
              description={
                debouncedSearchQ
                  ? "جرّب كلمة أخرى أو امسح عامل التصفية."
                  : undefined
              }
            />
          )}
          {popularRows.length > 0 && (
            <>
              <DataTable
                columns={searchColumns}
                rows={popularRows}
                rowKey={(row) => `${row.term}-${row.lastSearchedAt}`}
                dense
              />
              {popularMeta && (
                <Pagination
                  page={popularMeta.page}
                  totalPages={popularMeta.totalPages}
                  total={popularMeta.total}
                  limit={popularMeta.limit}
                  onPageChange={setSearchPage}
                />
              )}
            </>
          )}
        </Card>
      </section>

      {/* Wishlist analytics */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-charcoal">تحليلات المفضلة</h2>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-2">
          <StatCard
            label="إجمالي عناصر المفضلة"
            value={
              wishlistQuery.isLoading
                ? "…"
                : formatNumber(wishlistQuery.data?.totals.totalWishlistItems ?? 0)
            }
            icon={Heart}
            loading={wishlistQuery.isLoading}
          />
          <StatCard
            label="عدد المستخدمين لديهم مفضلة"
            value={
              wishlistQuery.isLoading
                ? "…"
                : formatNumber(wishlistQuery.data?.totals.usersWithWishlist ?? 0)
            }
            icon={Heart}
            loading={wishlistQuery.isLoading}
          />
        </div>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>أكثر المنتجات إضافةً للمفضلة</CardTitle>
          </CardHeader>
          <FilterBar className="flex-col items-stretch sm:flex-row sm:items-center">
            <div className="relative w-full min-w-0 sm:w-64">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-charcoal-soft" />
              <Input
                value={wishlistQ}
                onChange={(e) => setWishlistQ(e.target.value)}
                placeholder="تصفية باسم المنتج…"
                className="ps-9"
              />
            </div>
            <Select
              value={wishlistSortDir}
              onChange={(e) => setWishlistSortDir(e.target.value as AnalyticsSortDir)}
              className="w-full min-w-0 sm:w-52"
            >
              <option value="desc">الأكثر في المفضلة أولًا</option>
              <option value="asc">الأقل في المفضلة أولًا</option>
            </Select>
          </FilterBar>

          {wishlistQuery.isLoading && (
            <div className="p-4">
              <SkeletonTable rows={6} cols={5} />
            </div>
          )}
          {wishlistQuery.isError && (
            <div className="p-4">
              <ErrorState
                message="تعذر تحميل منتجات المفضلة."
                onRetry={() => wishlistQuery.refetch()}
              />
            </div>
          )}
          {wishlistQuery.isSuccess && wishlistRows.length === 0 && (
            <EmptyState
              icon={Heart}
              title={
                debouncedWishlistQ ? COMMON_AR.noResults : "لا توجد عناصر في المفضلة بعد"
              }
              description={
                debouncedWishlistQ
                  ? "جرّب اسم منتج آخر أو امسح عامل التصفية."
                  : undefined
              }
            />
          )}
          {wishlistRows.length > 0 && (
            <>
              <DataTable
                columns={wishlistColumns}
                rows={wishlistRows}
                rowKey={(row) => row.productId}
                dense
              />
              {wishlistMeta && (
                <Pagination
                  page={wishlistMeta.page}
                  totalPages={wishlistMeta.totalPages}
                  total={wishlistMeta.total}
                  limit={wishlistMeta.limit}
                  onPageChange={setWishlistPage}
                />
              )}
            </>
          )}
        </Card>
      </section>
    </div>
  );
}

export default function SearchWishlistAnalyticsPage() {
  return (
    <RequireRole navKey="searchWishlistAnalytics">
      <SearchWishlistAnalyticsInner />
    </RequireRole>
  );
}
