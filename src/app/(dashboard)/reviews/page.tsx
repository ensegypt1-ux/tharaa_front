"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Clock3,
  Eye,
  EyeOff,
  Flag,
  MessageSquare,
  RotateCcw,
  Star,
  X,
} from "lucide-react";
import { RequireRole } from "@/components/layout/RequireRole";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { Badge, BooleanBadge, ReviewStatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState, LoadingState } from "@/components/ui/LoadingState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IconButton } from "@/components/ui/IconButton";
import { RatingStars } from "@/components/reviews/RatingStars";
import { ReviewDetailModal } from "@/components/reviews/ReviewDetailModal";
import {
  approveReview,
  getReviewAdminStats,
  hideReview,
  listReviewReports,
  listReviews,
  rejectReview,
  resolveReviewReport,
  restoreReview,
  showReview,
} from "@/lib/api/reviews";
import type {
  Review,
  ReviewReport,
  ReviewReportStatus,
  ReviewSort,
  ReviewStatus,
} from "@/lib/types";
import { formatDateTime, formatNumber } from "@/lib/utils/format";
import { getErrorMessage } from "@/lib/api/errors";
import { COMMON_AR, REVIEW_STATUS_AR, labelOf } from "@/lib/ar/labels";
import { useToast } from "@/components/ui/Toaster";

type TabKey = "reviews" | "reports";
type ModerationAction = "approve" | "reject" | "hide" | "show" | "restore";

function boolParam(value: string | null): boolean | undefined {
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return undefined;
}

function buildReviewsUrl(params: URLSearchParams): string {
  const qs = params.toString();
  return qs ? `/reviews?${qs}` : "/reviews";
}

function ReviewsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const tab = (searchParams.get("tab") as TabKey) || "reviews";
  const status = (searchParams.get("status") as ReviewStatus | "") || "";
  const isVisible = boolParam(searchParams.get("isVisible"));
  const rating = searchParams.get("rating") ? Number(searchParams.get("rating")) : undefined;
  const productId = searchParams.get("productId") ?? "";
  const userId = searchParams.get("userId") ?? "";
  const reported = boolParam(searchParams.get("reported"));
  const includeDeleted = boolParam(searchParams.get("includeDeleted")) === true;
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const sort = (searchParams.get("sort") as ReviewSort) || "newest";
  const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
  const detailId = searchParams.get("reviewId") ?? "";
  const reportStatus = (searchParams.get("reportStatus") as ReviewReportStatus | "") || "OPEN";
  const reportsPage = Math.max(1, Number(searchParams.get("reportsPage") || "1") || 1);
  const limit = 20;

  const [pendingAction, setPendingAction] = useState<{
    review: Review;
    action: ModerationAction;
  } | null>(null);
  const [resolveTarget, setResolveTarget] = useState<{
    report: ReviewReport;
    status: "RESOLVED" | "DISMISSED";
  } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [detailOverride, setDetailOverride] = useState<Review | null>(null);

  const setParams = useCallback(
    (patch: Record<string, string | null | undefined>, resetPage = true) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === undefined || value === "") next.delete(key);
        else next.set(key, value);
      }
      if (resetPage && !("page" in patch)) next.delete("page");
      router.replace(buildReviewsUrl(next));
    },
    [router, searchParams],
  );

  const statsQuery = useQuery({
    queryKey: ["review-admin-stats"],
    queryFn: getReviewAdminStats,
  });

  const reviewsQuery = useQuery({
    queryKey: [
      "reviews",
      {
        status,
        isVisible,
        rating,
        productId,
        userId,
        reported,
        includeDeleted,
        from,
        to,
        sort,
        page,
      },
    ],
    queryFn: () =>
      listReviews({
        page,
        limit,
        status: status || undefined,
        isVisible,
        rating: rating && rating >= 1 && rating <= 5 ? rating : undefined,
        productId: productId || undefined,
        userId: userId || undefined,
        reported,
        includeDeleted: includeDeleted || undefined,
        from: from || undefined,
        to: to || undefined,
        sort,
      }),
    enabled: tab === "reviews",
  });

  const reportsQuery = useQuery({
    queryKey: ["review-reports", { reportStatus, reportsPage }],
    queryFn: () =>
      listReviewReports({
        page: reportsPage,
        limit,
        status: reportStatus || undefined,
      }),
    enabled: tab === "reports",
  });

  const detailReview = useMemo(() => {
    if (detailOverride && detailOverride.id === detailId) return detailOverride;
    return reviewsQuery.data?.items.find((r) => r.id === detailId) ?? detailOverride;
  }, [detailId, detailOverride, reviewsQuery.data?.items]);

  const invalidateReviews = () => {
    queryClient.invalidateQueries({ queryKey: ["reviews"] });
    queryClient.invalidateQueries({ queryKey: ["review-admin-stats"] });
    queryClient.invalidateQueries({ queryKey: ["analytics-overview"] });
  };

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: ModerationAction }) => {
      if (action === "approve") return approveReview(id);
      if (action === "reject") return rejectReview(id);
      if (action === "hide") return hideReview(id);
      if (action === "show") return showReview(id);
      return restoreReview(id);
    },
    onSuccess: (_data, vars) => {
      const labels: Record<ModerationAction, string> = {
        approve: "تم قبول التقييم.",
        reject: "تم رفض التقييم.",
        hide: "تم إخفاء التقييم.",
        show: "تم إظهار التقييم.",
        restore: "تم استعادة التقييم.",
      };
      pushToast(labels[vars.action], "success");
      setPendingAction(null);
      setActionError(null);
      invalidateReviews();
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  });

  const resolveMutation = useMutation({
    mutationFn: ({
      reportId,
      status: nextStatus,
    }: {
      reportId: string;
      status: "RESOLVED" | "DISMISSED";
    }) => resolveReviewReport(reportId, { status: nextStatus }),
    onSuccess: (_data, vars) => {
      pushToast(vars.status === "RESOLVED" ? "تم حل البلاغ." : "تم صرف النظر عن البلاغ.", "success");
      setResolveTarget(null);
      queryClient.invalidateQueries({ queryKey: ["review-reports"] });
      queryClient.invalidateQueries({ queryKey: ["review-admin-stats"] });
      invalidateReviews();
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  });

  const actionCopy: Record<
    ModerationAction,
    { title: string; description: (r: Review) => string; confirm: string; variant: "danger" | "primary" }
  > = {
    approve: {
      title: "قبول التقييم",
      description: (r) =>
        `قبول تقييم «${r.product?.nameAr ?? "المنتج"}» من ${r.user?.fullName ?? "العميل"}؟ سيصبح مرئياً للعملاء.`,
      confirm: "قبول",
      variant: "primary",
    },
    reject: {
      title: "رفض التقييم",
      description: (r) =>
        `رفض تقييم «${r.product?.nameAr ?? "المنتج"}» من ${r.user?.fullName ?? "العميل"}؟ لن يظهر في التطبيق.`,
      confirm: "رفض",
      variant: "danger",
    },
    hide: {
      title: "إخفاء التقييم",
      description: (r) => `إخفاء تقييم «${r.product?.nameAr ?? "المنتج"}» مؤقتاً؟ يبقى مقبولاً لكن غير مرئي.`,
      confirm: "إخفاء",
      variant: "danger",
    },
    show: {
      title: "إظهار التقييم",
      description: (r) => `إظهار تقييم «${r.product?.nameAr ?? "المنتج"}» للعملاء مرة أخرى؟`,
      confirm: "إظهار",
      variant: "primary",
    },
    restore: {
      title: "استعادة التقييم",
      description: (r) =>
        `استعادة تقييم «${r.product?.nameAr ?? "المنتج"}»؟ سيعود بحالة قيد المراجعة.`,
      confirm: "استعادة",
      variant: "primary",
    },
  };

  const openAction = (review: Review, action: ModerationAction) => {
    if (action === "approve" || action === "show") {
      actionMutation.mutate({ id: review.id, action });
      return;
    }
    setPendingAction({ review, action });
  };

  const reviewColumns: DataTableColumn<Review>[] = [
    {
      key: "rating",
      header: COMMON_AR.rating,
      render: (r) => <RatingStars rating={r.rating} size="sm" />,
    },
    {
      key: "comment",
      header: COMMON_AR.comment,
      render: (r) => (
        <button
          type="button"
          className="line-clamp-2 max-w-xs text-start text-sm text-charcoal hover:text-amber-800"
          onClick={() => setParams({ reviewId: r.id }, false)}
        >
          {r.comment?.trim() || "بدون تعليق"}
        </button>
      ),
    },
    {
      key: "customer",
      header: COMMON_AR.customer,
      render: (r) => (
        <Link href={`/customers/${r.userId}`} className="text-sm text-amber-800 hover:underline">
          {r.user?.fullName ?? "—"}
        </Link>
      ),
    },
    {
      key: "product",
      header: COMMON_AR.product,
      render: (r) => (
        <Link href={`/products/${r.productId}`} className="text-sm font-medium text-amber-800 hover:underline">
          {r.product?.nameAr ?? r.product?.nameEn ?? "—"}
        </Link>
      ),
    },
    {
      key: "order",
      header: "رقم الطلب",
      render: (r) =>
        r.orderItem?.orderId ? (
          <Link
            href={`/orders/${r.orderItem.orderId}`}
            className="text-xs text-amber-800 hover:underline ltr-field"
          >
            {r.orderItem.orderId.slice(0, 8)}…
          </Link>
        ) : (
          "—"
        ),
    },
    {
      key: "verified",
      header: "شراء موثق",
      render: () => <Badge tone="green">موثق</Badge>,
    },
    {
      key: "status",
      header: "الحالة",
      render: (r) => (
        <div className="flex flex-col gap-1">
          <ReviewStatusBadge status={r.status} />
          {r.deletedAt && <Badge tone="red">محذوف</Badge>}
        </div>
      ),
    },
    {
      key: "visible",
      header: "الظهور",
      render: (r) => <BooleanBadge value={r.isVisible} trueLabel="مرئي" falseLabel="مخفي" />,
    },
    {
      key: "reported",
      header: "بلاغات",
      render: (r) =>
        (r.openReportCount ?? 0) > 0 ? (
          <Badge tone="amber">{r.openReportCount}</Badge>
        ) : (
          <span className="text-xs text-charcoal-soft">لا</span>
        ),
    },
    {
      key: "reply",
      header: "رد المتجر",
      render: (r) =>
        r.replyText ? (
          <span className="line-clamp-2 max-w-[10rem] text-xs text-charcoal-soft">{r.replyText}</span>
        ) : (
          <span className="text-xs text-charcoal-soft">—</span>
        ),
    },
    {
      key: "createdAt",
      header: "تاريخ الإنشاء",
      render: (r) => <span className="text-xs text-charcoal-soft">{formatDateTime(r.createdAt)}</span>,
    },
    {
      key: "moderatedAt",
      header: "تاريخ المراجعة",
      render: (r) => (
        <span className="text-xs text-charcoal-soft">
          {r.moderatedAt ? formatDateTime(r.moderatedAt) : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: COMMON_AR.actions,
      className: "text-end",
      headerClassName: "text-end",
      render: (r) => (
        <div className="flex flex-wrap items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <IconButton
            label="التفاصيل"
            size="sm"
            tone="amber"
            onClick={() => {
              setDetailOverride(r);
              setParams({ reviewId: r.id }, false);
            }}
          >
            <MessageSquare className="size-4" />
          </IconButton>
          {r.deletedAt ? (
            <Button size="sm" variant="outline" onClick={() => openAction(r, "restore")}>
              <RotateCcw className="size-3.5" />
              استعادة
            </Button>
          ) : (
            <>
              {r.status !== "APPROVED" && (
                <Button size="sm" variant="outline" onClick={() => openAction(r, "approve")}>
                  <Check className="size-3.5" />
                  قبول
                </Button>
              )}
              {r.status !== "REJECTED" && (
                <Button size="sm" variant="danger" onClick={() => openAction(r, "reject")}>
                  <X className="size-3.5" />
                  رفض
                </Button>
              )}
              {r.status === "APPROVED" &&
                (r.isVisible ? (
                  <Button size="sm" variant="ghost" onClick={() => openAction(r, "hide")}>
                    <EyeOff className="size-3.5" />
                    إخفاء
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => openAction(r, "show")}>
                    <Eye className="size-3.5" />
                    إظهار
                  </Button>
                ))}
            </>
          )}
        </div>
      ),
    },
  ];

  const reportColumns: DataTableColumn<ReviewReport>[] = [
    {
      key: "review",
      header: "التقييم",
      render: (r) => (
        <button
          type="button"
          className="line-clamp-2 max-w-xs text-start text-sm text-amber-800 hover:underline"
          onClick={() =>
            setParams({
              tab: "reviews",
              reviewId: r.reviewId,
              productId: r.review?.productId ?? null,
            })
          }
        >
          {r.review?.comment?.trim() || `تقييم ${r.review?.rating ?? "—"} نجوم`}
        </button>
      ),
    },
    {
      key: "reporter",
      header: "المبلّغ",
      render: (r) => (
        <div>
          <p className="text-sm text-charcoal">{r.reporter?.fullName ?? "—"}</p>
          <p className="text-xs text-charcoal-soft ltr-field">{r.reporter?.email ?? r.reporter?.phone}</p>
        </div>
      ),
    },
    {
      key: "reason",
      header: "السبب",
      render: (r) => <span className="line-clamp-2 max-w-xs text-sm text-charcoal-soft">{r.reason}</span>,
    },
    {
      key: "status",
      header: COMMON_AR.status,
      render: (r) => (
        <Badge tone={r.status === "OPEN" ? "amber" : r.status === "RESOLVED" ? "green" : "gray"}>
          {r.status === "OPEN" ? "مفتوح" : r.status === "RESOLVED" ? "محلول" : "مُتجاهل"}
        </Badge>
      ),
    },
    {
      key: "product",
      header: COMMON_AR.product,
      render: (r) =>
        r.review?.productId ? (
          <Link href={`/products/${r.review.productId}`} className="text-sm text-amber-800 hover:underline">
            {r.review.product?.nameAr ?? "—"}
          </Link>
        ) : (
          "—"
        ),
    },
    {
      key: "customer",
      header: "صاحب التقييم",
      render: (r) =>
        r.review?.user?.id ? (
          <Link href={`/customers/${r.review.user.id}`} className="text-sm text-amber-800 hover:underline">
            {r.review.user.fullName}
          </Link>
        ) : (
          "—"
        ),
    },
    {
      key: "createdAt",
      header: "تاريخ البلاغ",
      render: (r) => <span className="text-xs text-charcoal-soft">{formatDateTime(r.createdAt)}</span>,
    },
    {
      key: "resolvedAt",
      header: "تاريخ الحل",
      render: (r) => (
        <span className="text-xs text-charcoal-soft">
          {r.resolvedAt ? formatDateTime(r.resolvedAt) : "—"}
        </span>
      ),
    },
    {
      key: "resolver",
      header: "المسؤول",
      render: (r) => <span className="text-sm text-charcoal-soft">{r.resolvedBy?.fullName ?? "—"}</span>,
    },
    {
      key: "actions",
      header: COMMON_AR.actions,
      className: "text-end",
      headerClassName: "text-end",
      render: (r) =>
        r.status === "OPEN" ? (
          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="outline" onClick={() => setResolveTarget({ report: r, status: "RESOLVED" })}>
              حل
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setResolveTarget({ report: r, status: "DISMISSED" })}>
              تجاهل
            </Button>
          </div>
        ) : (
          <span className="text-xs text-charcoal-soft">—</span>
        ),
    },
  ];

  const stats = statsQuery.data;

  return (
    <div className="page-shell animate-in">
      <PageHeader
        title="التقييمات"
        description="مراجعة تقييمات العملاء، البلاغات، وردود المتجر."
      />

      {actionError && (
        <div className="mb-3 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-danger">
          {actionError}
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="المراجعات المعلقة"
          value={statsQuery.isLoading ? "…" : formatNumber(stats?.pending)}
          icon={Clock3}
          tone="amber"
          href="/reviews?status=PENDING&tab=reviews"
          loading={statsQuery.isLoading}
        />
        <StatCard
          label="المراجعات المقبولة"
          value={statsQuery.isLoading ? "…" : formatNumber(stats?.approved)}
          icon={Check}
          tone="green"
          href="/reviews?status=APPROVED&tab=reviews"
          loading={statsQuery.isLoading}
        />
        <StatCard
          label="المراجعات المرفوضة"
          value={statsQuery.isLoading ? "…" : formatNumber(stats?.rejected)}
          icon={X}
          tone="red"
          href="/reviews?status=REJECTED&tab=reviews"
          loading={statsQuery.isLoading}
        />
        <StatCard
          label="المراجعات المخفية"
          value={statsQuery.isLoading ? "…" : formatNumber(stats?.hidden)}
          icon={EyeOff}
          tone="charcoal"
          href="/reviews?status=APPROVED&isVisible=false&tab=reviews"
          loading={statsQuery.isLoading}
        />
        <StatCard
          label="المراجعات المبلغ عنها"
          value={statsQuery.isLoading ? "…" : formatNumber(stats?.reported)}
          icon={Flag}
          tone="amber"
          href="/reviews?tab=reports&reportStatus=OPEN"
          loading={statsQuery.isLoading}
        />
        <StatCard
          label="متوسط وقت المراجعة"
          value={
            statsQuery.isLoading
              ? "…"
              : stats?.averageModerationTimeMinutes != null
                ? `${formatNumber(stats.averageModerationTimeMinutes)} د`
                : "—"
          }
          icon={Clock3}
          tone="info"
          href="/reviews?tab=reviews"
          loading={statsQuery.isLoading}
          hint="بالدقائق"
        />
      </div>

      <div className="mb-3 flex gap-2">
        <Button
          size="sm"
          variant={tab === "reviews" ? "primary" : "outline"}
          onClick={() => setParams({ tab: "reviews", reportsPage: null })}
        >
          قائمة التقييمات
        </Button>
        <Button
          size="sm"
          variant={tab === "reports" ? "primary" : "outline"}
          onClick={() => setParams({ tab: "reports", page: null })}
        >
          البلاغات
        </Button>
      </div>

      {tab === "reviews" && (
        <Card>
          <FilterBar>
            <Select
              value={status}
              onChange={(e) => setParams({ status: e.target.value || null })}
              className="w-40"
            >
              <option value="">كل الحالات</option>
              {(["PENDING", "APPROVED", "REJECTED"] as ReviewStatus[]).map((s) => (
                <option key={s} value={s}>
                  {labelOf(REVIEW_STATUS_AR, s)}
                </option>
              ))}
            </Select>
            <Select
              value={isVisible === undefined ? "" : String(isVisible)}
              onChange={(e) => setParams({ isVisible: e.target.value || null })}
              className="w-36"
            >
              <option value="">كل الظهور</option>
              <option value="true">مرئي</option>
              <option value="false">مخفي</option>
            </Select>
            <Select
              value={rating ? String(rating) : ""}
              onChange={(e) => setParams({ rating: e.target.value || null })}
              className="w-32"
            >
              <option value="">كل النجوم</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} نجوم
                </option>
              ))}
            </Select>
            <Select
              value={reported === undefined ? "" : String(reported)}
              onChange={(e) => setParams({ reported: e.target.value || null })}
              className="w-36"
            >
              <option value="">كل البلاغات</option>
              <option value="true">مبلّغ عنها</option>
            </Select>
            <Select
              value={sort}
              onChange={(e) => setParams({ sort: e.target.value })}
              className="w-40"
            >
              <option value="newest">الأحدث</option>
              <option value="oldest">الأقدم</option>
              <option value="highest">الأعلى تقييماً</option>
              <option value="lowest">الأقل تقييماً</option>
            </Select>
            <Input
              type="date"
              value={from}
              onChange={(e) => setParams({ from: e.target.value || null })}
              className="w-40 ltr-field"
              title="من تاريخ"
            />
            <Input
              type="date"
              value={to}
              onChange={(e) => setParams({ to: e.target.value || null })}
              className="w-40 ltr-field"
              title="إلى تاريخ"
            />
            <label className="flex items-center gap-2 text-sm text-charcoal">
              <input
                type="checkbox"
                className="size-4 accent-amber-500"
                checked={includeDeleted}
                onChange={(e) =>
                  setParams({ includeDeleted: e.target.checked ? "true" : null })
                }
              />
              تضمين المحذوف
            </label>
            {(productId || userId) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setParams({ productId: null, userId: null })}
              >
                مسح فلتر المنتج/العميل
              </Button>
            )}
          </FilterBar>

          {(productId || userId) && (
            <div className="mb-3 flex flex-wrap gap-2 px-1 text-xs text-charcoal-soft">
              {productId && (
                <Badge tone="blue">
                  منتج: <span className="ltr-field">{productId.slice(0, 8)}…</span>
                </Badge>
              )}
              {userId && (
                <Badge tone="blue">
                  عميل: <span className="ltr-field">{userId.slice(0, 8)}…</span>
                </Badge>
              )}
            </div>
          )}

          {reviewsQuery.isLoading && <SkeletonTable rows={8} cols={10} />}
          {reviewsQuery.isError && (
            <ErrorState message="تعذر تحميل التقييمات." onRetry={() => reviewsQuery.refetch()} />
          )}
          {reviewsQuery.data && reviewsQuery.data.items.length === 0 && (
            <EmptyState
              icon={Star}
              title="لا توجد تقييمات"
              description="حاول تعديل عوامل التصفية."
            />
          )}
          {reviewsQuery.data && reviewsQuery.data.items.length > 0 && (
            <>
              <DataTable
                columns={reviewColumns}
                rows={reviewsQuery.data.items}
                rowKey={(r) => r.id}
                dense
                onRowClick={(r) => {
                  setDetailOverride(r);
                  setParams({ reviewId: r.id }, false);
                }}
              />
              <Pagination
                page={page}
                totalPages={reviewsQuery.data.meta.totalPages}
                total={reviewsQuery.data.meta.total}
                limit={limit}
                onPageChange={(p) => setParams({ page: String(p) }, false)}
              />
            </>
          )}
        </Card>
      )}

      {tab === "reports" && (
        <Card>
          <CardHeader>
            <CardTitle>بلاغات التقييمات</CardTitle>
          </CardHeader>
          <CardBody>
            <FilterBar>
              <Select
                value={reportStatus}
                onChange={(e) =>
                  setParams({ reportStatus: e.target.value || null, reportsPage: null })
                }
                className="w-40"
              >
                <option value="">كل الحالات</option>
                <option value="OPEN">مفتوح</option>
                <option value="RESOLVED">محلول</option>
                <option value="DISMISSED">مُتجاهل</option>
              </Select>
            </FilterBar>

            {reportsQuery.isLoading && <SkeletonTable rows={6} cols={8} />}
            {reportsQuery.isError && (
              <ErrorState message="تعذر تحميل البلاغات." onRetry={() => reportsQuery.refetch()} />
            )}
            {reportsQuery.data && reportsQuery.data.items.length === 0 && (
              <EmptyState icon={Flag} title="لا توجد بلاغات" />
            )}
            {reportsQuery.data && reportsQuery.data.items.length > 0 && (
              <>
                <DataTable columns={reportColumns} rows={reportsQuery.data.items} rowKey={(r) => r.id} dense />
                <Pagination
                  page={reportsPage}
                  totalPages={reportsQuery.data.meta.totalPages}
                  total={reportsQuery.data.meta.total}
                  limit={limit}
                  onPageChange={(p) => setParams({ reportsPage: String(p) }, false)}
                />
              </>
            )}
          </CardBody>
        </Card>
      )}

      <ReviewDetailModal
        open={Boolean(detailId)}
        review={detailReview}
        onClose={() => {
          setDetailOverride(null);
          setParams({ reviewId: null }, false);
        }}
        onChanged={(updated) => setDetailOverride(updated)}
      />

      {pendingAction && (
        <ConfirmDialog
          open
          onClose={() => setPendingAction(null)}
          onConfirm={() =>
            actionMutation.mutate({ id: pendingAction.review.id, action: pendingAction.action })
          }
          isLoading={actionMutation.isPending}
          title={actionCopy[pendingAction.action].title}
          description={actionCopy[pendingAction.action].description(pendingAction.review)}
          confirmLabel={actionCopy[pendingAction.action].confirm}
          variant={actionCopy[pendingAction.action].variant}
        />
      )}

      {resolveTarget && (
        <ConfirmDialog
          open
          onClose={() => setResolveTarget(null)}
          onConfirm={() =>
            resolveMutation.mutate({
              reportId: resolveTarget.report.id,
              status: resolveTarget.status,
            })
          }
          isLoading={resolveMutation.isPending}
          title={resolveTarget.status === "RESOLVED" ? "حل البلاغ" : "تجاهل البلاغ"}
          description={
            resolveTarget.status === "RESOLVED"
              ? "تأكيد حل هذا البلاغ؟"
              : "تأكيد صرف النظر عن هذا البلاغ؟"
          }
          confirmLabel={resolveTarget.status === "RESOLVED" ? "حل" : "تجاهل"}
          variant={resolveTarget.status === "DISMISSED" ? "danger" : "primary"}
        />
      )}
    </div>
  );
}

export default function ReviewsPage() {
  return (
    <RequireRole navKey="reviews">
      <Suspense fallback={<LoadingState label={COMMON_AR.loading} />}>
        <ReviewsPageInner />
      </Suspense>
    </RequireRole>
  );
}
