"use client";

import { useState } from "react";
import { z } from "zod";
import { useZodForm } from "@/lib/forms/useZodForm";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, History, Send } from "lucide-react";
import { RequireRole } from "@/components/layout/RequireRole";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select, Label, FieldError, FieldHint } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState, LoadingState } from "@/components/ui/LoadingState";
import { Badge } from "@/components/ui/StatusBadge";
import { broadcastNotification, listAdminNotifications } from "@/lib/api/notifications";
import { formatDateTime } from "@/lib/utils/format";
import { getErrorMessage } from "@/lib/api/errors";
import { COMMON_AR, NOTIFICATION_TYPE_AR, labelOf } from "@/lib/ar/labels";

const broadcastSchema = z.object({
  titleEn: z.string().min(1, "مطلوب"),
  titleAr: z.string().min(1, "مطلوب"),
  bodyEn: z.string().min(1, "مطلوب"),
  bodyAr: z.string().min(1, "مطلوب"),
  type: z.enum(["ADMIN", "OFFER", "SYSTEM", "ORDER_STATUS"]).default("ADMIN"),
  userIdsRaw: z.string().optional(),
});

type BroadcastFormValues = z.infer<typeof broadcastSchema>;

function NotificationsPageInner() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const limit = 20;

  const historyQuery = useQuery({
    queryKey: ["notifications", page],
    queryFn: () => listAdminNotifications({ page, limit }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useZodForm(broadcastSchema, {
    defaultValues: { titleEn: "", titleAr: "", bodyEn: "", bodyAr: "", type: "ADMIN", userIdsRaw: "" },
  });

  const broadcastMutation = useMutation({
    mutationFn: (values: BroadcastFormValues) =>
      broadcastNotification({
        titleEn: values.titleEn,
        titleAr: values.titleAr,
        bodyEn: values.bodyEn,
        bodyAr: values.bodyAr,
        type: values.type,
        userIds: values.userIdsRaw
          ? values.userIdsRaw.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
      }),
    onSuccess: (result) => {
      setSuccessMsg(`تم الإرسال بنجاح إلى ${result.sent} مستلم.`);
      reset();
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return (
    <div className="page-shell animate-in">
      <PageHeader title="الإشعارات" description="إرسال رسائل للعملاء ومراجعة سجل الإشعارات." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Send className="size-4 text-amber-700" />
                <CardTitle>إرسال إشعار جديد</CardTitle>
              </div>
            </CardHeader>
            <CardBody>
              {successMsg && (
                <div className="mb-3 rounded-[var(--radius-md)] border border-green-200 bg-green-50 px-3 py-2 text-sm text-success">
                  {successMsg}
                </div>
              )}
              {broadcastMutation.isError && (
                <div className="mb-3 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
                  {getErrorMessage(broadcastMutation.error)}
                </div>
              )}
              <form onSubmit={handleSubmit((v: BroadcastFormValues) => broadcastMutation.mutate(v))} className="space-y-4">
                <div className="space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-cream/30 p-3">
                  <p className="text-xs font-semibold text-charcoal">المحتوى بالعربية (مطلوب)</p>
                  <div>
                    <Label required>العنوان بالعربية</Label>
                    <Input {...register("titleAr")} dir="rtl" placeholder="مثال: عرض خاص لك" />
                    <FieldError message={errors.titleAr?.message} />
                  </div>
                  <div>
                    <Label required>النص بالعربية</Label>
                    <Textarea rows={3} dir="rtl" {...register("bodyAr")} placeholder="اكتب رسالة الإشعار بالعربية…" />
                    <FieldError message={errors.bodyAr?.message} />
                  </div>
                </div>

                <div className="space-y-3 rounded-[var(--radius-lg)] border border-border-soft p-3">
                  <p className="text-xs font-semibold text-charcoal-soft">الترجمة الإنجليزية (مطلوبة للنظام)</p>
                  <div>
                    <Label required>العنوان بالإنجليزية</Label>
                    <Input className="ltr-field" {...register("titleEn")} placeholder="Special offer for you" />
                    <FieldError message={errors.titleEn?.message} />
                  </div>
                  <div>
                    <Label required>النص بالإنجليزية</Label>
                    <Textarea rows={3} className="ltr-field" {...register("bodyEn")} placeholder="Notification body in English…" />
                    <FieldError message={errors.bodyEn?.message} />
                  </div>
                </div>

                <div>
                  <Label>نوع الإشعار</Label>
                  <Select {...register("type")}>
                    <option value="ADMIN">إداري</option>
                    <option value="OFFER">عرض</option>
                    <option value="SYSTEM">نظام</option>
                  </Select>
                </div>
                <div>
                  <Label>معرّفات العملاء (اختياري)</Label>
                  <Input
                    className="ltr-field"
                    {...register("userIdsRaw")}
                    placeholder="uuid1, uuid2"
                  />
                  <FieldHint>اتركه فارغًا لإرسال الإشعار لجميع العملاء النشطين. افصل المعرّفات بفاصلة.</FieldHint>
                </div>
                <Button type="submit" className="w-full" isLoading={isSubmitting || broadcastMutation.isPending}>
                  <Send className="size-4" />
                  إرسال الإشعار
                </Button>
              </form>
            </CardBody>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <History className="size-4 text-charcoal-soft" />
                <CardTitle>سجل الإشعارات</CardTitle>
              </div>
              {historyQuery.data && (
                <span className="text-xs text-charcoal-soft">{historyQuery.data.meta.total} إشعار</span>
              )}
            </CardHeader>
            {historyQuery.isLoading && <LoadingState />}
            {historyQuery.isError && <ErrorState message="تعذر تحميل الإشعارات." onRetry={() => historyQuery.refetch()} />}
            {historyQuery.data && historyQuery.data.data.length === 0 && (
              <EmptyState icon={Bell} title="لم يتم إرسال إشعارات بعد" description="ستظهر الإشعارات المرسلة هنا." />
            )}
            {historyQuery.data && historyQuery.data.data.length > 0 && (
              <>
                <ul className="divide-y divide-border-soft">
                  {historyQuery.data.data.map((n) => (
                    <li key={n.id} className="px-5 py-3.5 transition hover:bg-cream/30">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-charcoal">{n.titleAr || n.titleEn}</p>
                          <p className="mt-0.5 text-sm text-charcoal-soft">{n.bodyAr || n.bodyEn}</p>
                        </div>
                        <time className="shrink-0 text-xs text-charcoal-soft">{formatDateTime(n.createdAt)}</time>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-charcoal-soft">
                        <Badge tone="amber">{labelOf(NOTIFICATION_TYPE_AR, n.type)}</Badge>
                        {n.user && <span>إلى: {n.user.fullName}</span>}
                        {!n.isRead && <span className="font-medium text-amber-700">{COMMON_AR.unread}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
                <Pagination
                  page={page}
                  totalPages={historyQuery.data.meta.totalPages}
                  total={historyQuery.data.meta.total}
                  limit={limit}
                  onPageChange={setPage}
                />
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <RequireRole navKey="notifications">
      <NotificationsPageInner />
    </RequireRole>
  );
}
