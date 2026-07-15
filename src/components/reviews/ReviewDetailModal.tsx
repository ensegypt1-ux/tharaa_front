"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Badge, BooleanBadge, ReviewStatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RatingStars } from "@/components/reviews/RatingStars";
import { deleteReviewReply, upsertReviewReply } from "@/lib/api/reviews";
import type { Review } from "@/lib/types";
import { formatDateTime } from "@/lib/utils/format";
import { getErrorMessage } from "@/lib/api/errors";
import { COMMON_AR } from "@/lib/ar/labels";
import { useToast } from "@/components/ui/Toaster";

export function ReviewDetailModal({
  review,
  open,
  onClose,
  onChanged,
}: {
  review: Review | null;
  open: boolean;
  onClose: () => void;
  onChanged?: (updated: Review) => void;
}) {
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const [replyText, setReplyText] = useState("");
  const [confirmDeleteReply, setConfirmDeleteReply] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setReplyText(review?.replyText ?? "");
    setError(null);
    setConfirmDeleteReply(false);
  }, [review]);

  const saveReplyMutation = useMutation({
    mutationFn: (text: string) => upsertReviewReply(review!.id, text),
    onSuccess: (updated) => {
      pushToast("تم حفظ رد المتجر.", "success");
      setError(null);
      onChanged?.(updated);
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const deleteReplyMutation = useMutation({
    mutationFn: () => deleteReviewReply(review!.id),
    onSuccess: (updated) => {
      pushToast("تم حذف رد المتجر.", "success");
      setConfirmDeleteReply(false);
      setReplyText("");
      onChanged?.(updated);
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  if (!review) return null;

  const orderId = review.orderItem?.orderId;
  const hasReply = Boolean(review.replyText);

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="تفاصيل التقييم"
        size="lg"
        footer={
          <Button variant="outline" onClick={onClose}>
            {COMMON_AR.close}
          </Button>
        }
      >
        <div className="space-y-5">
          {error && (
            <div className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          <section className="grid gap-3 sm:grid-cols-2">
            <MetaBlock label="العميل">
              <Link href={`/customers/${review.userId}`} className="font-medium text-amber-800 hover:underline">
                {review.user?.fullName ?? "—"}
                <ExternalLink className="ms-1 inline size-3.5" />
              </Link>
              {(review.user?.email || review.user?.phone) && (
                <p className="mt-0.5 text-xs text-charcoal-soft ltr-field">
                  {review.user.email ?? review.user.phone}
                </p>
              )}
            </MetaBlock>
            <MetaBlock label="المنتج">
              <Link
                href={`/products/${review.productId}`}
                className="font-medium text-amber-800 hover:underline"
              >
                {review.product?.nameAr ?? review.product?.nameEn ?? "—"}
                <ExternalLink className="ms-1 inline size-3.5" />
              </Link>
            </MetaBlock>
            <MetaBlock label="رقم الطلب">
              {orderId ? (
                <Link href={`/orders/${orderId}`} className="font-medium text-amber-800 hover:underline ltr-field">
                  {orderId.slice(0, 8)}…
                  <ExternalLink className="ms-1 inline size-3.5" />
                </Link>
              ) : (
                "—"
              )}
            </MetaBlock>
            <MetaBlock label="شراء موثق">
              <Badge tone="green">موثق</Badge>
            </MetaBlock>
          </section>

          <section className="rounded-[var(--radius-md)] border border-border-soft bg-cream/40 p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <RatingStars rating={review.rating} />
              <ReviewStatusBadge status={review.status} />
              <BooleanBadge value={review.isVisible} trueLabel="مرئي" falseLabel="مخفي" />
              {review.deletedAt && <Badge tone="red">محذوف</Badge>}
              {(review.openReportCount ?? 0) > 0 && (
                <Badge tone="amber">بلاغات: {review.openReportCount}</Badge>
              )}
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-charcoal">
              {review.comment?.trim() || "بدون تعليق نصي"}
            </p>
          </section>

          <section className="grid gap-2 text-sm sm:grid-cols-2">
            <MetaBlock label="تاريخ الإنشاء">{formatDateTime(review.createdAt)}</MetaBlock>
            <MetaBlock label="تاريخ المراجعة الإدارية">
              {review.moderatedAt ? formatDateTime(review.moderatedAt) : "—"}
            </MetaBlock>
            <MetaBlock label="تاريخ الحذف">
              {review.deletedAt ? formatDateTime(review.deletedAt) : "—"}
            </MetaBlock>
            <MetaBlock label="المراجع الإداري">
              {review.moderatedBy?.fullName ?? "—"}
            </MetaBlock>
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-charcoal">رد المتجر</h4>
            {hasReply && (
              <div className="rounded-[var(--radius-md)] border border-border-soft bg-surface px-3 py-2 text-sm">
                <p className="whitespace-pre-wrap text-charcoal">{review.replyText}</p>
                <p className="mt-1 text-xs text-charcoal-soft">
                  {review.replyByUser?.fullName ? `${review.replyByUser.fullName} · ` : ""}
                  {review.repliedAt ? formatDateTime(review.repliedAt) : ""}
                </p>
              </div>
            )}
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="اكتب رد المتجر هنا…"
              disabled={Boolean(review.deletedAt)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={!replyText.trim() || Boolean(review.deletedAt)}
                isLoading={saveReplyMutation.isPending}
                onClick={() => saveReplyMutation.mutate(replyText.trim())}
              >
                {hasReply ? "تحديث الرد" : "إضافة رد"}
              </Button>
              {hasReply && (
                <Button
                  size="sm"
                  variant="danger"
                  disabled={Boolean(review.deletedAt)}
                  onClick={() => setConfirmDeleteReply(true)}
                >
                  حذف الرد
                </Button>
              )}
            </div>
          </section>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDeleteReply}
        onClose={() => setConfirmDeleteReply(false)}
        onConfirm={() => deleteReplyMutation.mutate()}
        isLoading={deleteReplyMutation.isPending}
        title="حذف رد المتجر"
        description="حذف رد المتجر على هذا التقييم؟"
        confirmLabel={COMMON_AR.delete}
      />
    </>
  );
}

function MetaBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-charcoal-soft">{label}</p>
      <div className="mt-0.5 text-sm text-charcoal">{children}</div>
    </div>
  );
}
