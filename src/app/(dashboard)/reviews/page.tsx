"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Eye, EyeOff, Star, X } from "lucide-react";
import { RequireRole } from "@/components/layout/RequireRole";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { BooleanBadge, ReviewStatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/LoadingState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { approveReview, hideReview, listReviews, rejectReview, showReview } from "@/lib/api/reviews";
import type { Review, ReviewStatus } from "@/lib/types";
import { formatDateTime } from "@/lib/utils/format";
import { getErrorMessage } from "@/lib/api/errors";
import { COMMON_AR, REVIEW_STATUS_AR, labelOf } from "@/lib/ar/labels";

type ModerationAction = "approve" | "reject" | "hide" | "show";

function ReviewsPageInner() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ReviewStatus | "">("");
  const [page, setPage] = useState(1);
  const [pendingAction, setPendingAction] = useState<{ review: Review; action: ModerationAction } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const limit = 20;

  const reviewsQuery = useQuery({
    queryKey: ["reviews", { status, page }],
    queryFn: () => listReviews({ page, limit, status: status || undefined }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["reviews"] });

  const approveMutation = useMutation({
    mutationFn: approveReview,
    onSuccess: () => {
      invalidate();
      setPendingAction(null);
      setActionError(null);
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  });
  const rejectMutation = useMutation({
    mutationFn: rejectReview,
    onSuccess: () => {
      invalidate();
      setPendingAction(null);
      setActionError(null);
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  });
  const hideMutation = useMutation({
    mutationFn: hideReview,
    onSuccess: () => {
      invalidate();
      setPendingAction(null);
      setActionError(null);
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  });
  const showMutation = useMutation({
    mutationFn: showReview,
    onSuccess: () => {
      invalidate();
      setPendingAction(null);
      setActionError(null);
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  });

  const isActionPending =
    approveMutation.isPending || rejectMutation.isPending || hideMutation.isPending || showMutation.isPending;

  const confirmAction = () => {
    if (!pendingAction) return;
    const { review, action } = pendingAction;
    if (action === "approve") approveMutation.mutate(review.id);
    else if (action === "reject") rejectMutation.mutate(review.id);
    else if (action === "hide") hideMutation.mutate(review.id);
    else showMutation.mutate(review.id);
  };

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
  };

  const columns: DataTableColumn<Review>[] = [
    {
      key: "product",
      header: COMMON_AR.product,
      render: (r) => (
        <span className="font-medium text-charcoal">{r.product?.nameAr ?? r.product?.nameEn ?? "—"}</span>
      ),
    },
    {
      key: "customer",
      header: COMMON_AR.customer,
      render: (r) => <span className="text-sm text-charcoal-soft">{r.user?.fullName ?? "—"}</span>,
    },
    {
      key: "rating",
      header: COMMON_AR.rating,
      render: (r) => (
        <div className="flex items-center gap-0.5 text-amber-500" aria-label={`${r.rating} من 5`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="size-3.5" fill={i < r.rating ? "currentColor" : "none"} />
          ))}
        </div>
      ),
    },
    {
      key: "comment",
      header: COMMON_AR.comment,
      render: (r) => (
        <span className="line-clamp-2 max-w-xs text-sm text-charcoal-soft">{r.comment ?? "—"}</span>
      ),
    },
    { key: "status", header: "حالة المراجعة", render: (r) => <ReviewStatusBadge status={r.status} /> },
    {
      key: "visible",
      header: COMMON_AR.visible,
      render: (r) => (
        <BooleanBadge value={r.isVisible} trueLabel="مرئي" falseLabel="مخفي" />
      ),
    },
    {
      key: "date",
      header: COMMON_AR.date,
      render: (r) => <span className="text-sm text-charcoal-soft">{formatDateTime(r.createdAt)}</span>,
    },
    {
      key: "actions",
      header: COMMON_AR.actions,
      className: "text-end",
      headerClassName: "text-end",
      render: (r) => (
        <div className="flex flex-wrap items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {r.status !== "APPROVED" && (
            <Button
              size="sm"
              variant="outline"
              isLoading={isActionPending}
              onClick={() => setPendingAction({ review: r, action: "approve" })}
            >
              <Check className="size-3.5" />
              قبول
            </Button>
          )}
          {r.status !== "REJECTED" && (
            <Button
              size="sm"
              variant="danger"
              isLoading={isActionPending}
              onClick={() => setPendingAction({ review: r, action: "reject" })}
            >
              <X className="size-3.5" />
              رفض
            </Button>
          )}
          {r.status === "APPROVED" &&
            (r.isVisible ? (
              <Button
                size="sm"
                variant="ghost"
                isLoading={isActionPending}
                onClick={() => setPendingAction({ review: r, action: "hide" })}
              >
                <EyeOff className="size-3.5" />
                إخفاء
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                isLoading={isActionPending}
                onClick={() => setPendingAction({ review: r, action: "show" })}
              >
                <Eye className="size-3.5" />
                إظهار
              </Button>
            ))}
        </div>
      ),
    },
  ];

  return (
    <div className="page-shell animate-in">
      <PageHeader title="التقييمات" description="مراجعة تقييمات العملاء واعتمادها أو رفضها." />

      {actionError && (
        <div className="mb-3 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-danger">
          {actionError}
        </div>
      )}

      <Card>
        <FilterBar>
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as ReviewStatus | "");
              setPage(1);
            }}
            className="w-48"
          >
            <option value="">كل الحالات</option>
            {(["PENDING", "APPROVED", "REJECTED"] as ReviewStatus[]).map((s) => (
              <option key={s} value={s}>
                {labelOf(REVIEW_STATUS_AR, s)}
              </option>
            ))}
          </Select>
        </FilterBar>

        {reviewsQuery.isLoading && <SkeletonTable rows={8} cols={8} />}
        {reviewsQuery.isError && (
          <ErrorState message="تعذر تحميل التقييمات." onRetry={() => reviewsQuery.refetch()} />
        )}
        {reviewsQuery.data && reviewsQuery.data.items.length === 0 && (
          <EmptyState icon={Star} title="لا توجد تقييمات" description={status ? "حاول تعديل التصفية." : undefined} />
        )}
        {reviewsQuery.data && reviewsQuery.data.items.length > 0 && (
          <>
            <DataTable columns={columns} rows={reviewsQuery.data.items} rowKey={(r) => r.id} dense />
            <Pagination
              page={page}
              totalPages={reviewsQuery.data.meta.totalPages}
              total={reviewsQuery.data.meta.total}
              limit={limit}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      {pendingAction && (
        <ConfirmDialog
          open
          onClose={() => setPendingAction(null)}
          onConfirm={confirmAction}
          isLoading={isActionPending}
          title={actionCopy[pendingAction.action].title}
          description={actionCopy[pendingAction.action].description(pendingAction.review)}
          confirmLabel={actionCopy[pendingAction.action].confirm}
          variant={actionCopy[pendingAction.action].variant}
        />
      )}
    </div>
  );
}

export default function ReviewsPage() {
  return (
    <RequireRole navKey="reviews">
      <ReviewsPageInner />
    </RequireRole>
  );
}
