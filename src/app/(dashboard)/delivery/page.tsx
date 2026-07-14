"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { useZodForm } from "@/lib/forms/useZodForm";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Save, Store, Truck } from "lucide-react";
import { RequireRole } from "@/components/layout/RequireRole";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldError } from "@/components/ui/Input";
import { ErrorState, LoadingState } from "@/components/ui/LoadingState";
import { getPublicSettings, updateDeliverySettings, updatePickupSettings } from "@/lib/api/delivery";
import { getErrorMessage } from "@/lib/api/errors";

const deliverySchema = z.object({
  isEnabled: z.boolean(),
  fee: z.coerce.number().min(0),
  freeDeliveryThreshold: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  minOrderAmount: z.coerce.number().min(0),
  estimatedMinutesMin: z.coerce.number().min(0),
  estimatedMinutesMax: z.coerce.number().min(0),
  serviceCity: z.string().min(1),
});

type DeliveryFormValues = z.infer<typeof deliverySchema>;

const pickupSchema = z.object({
  isEnabled: z.boolean(),
  minOrderAmount: z.coerce.number().min(0),
  estimatedMinutesMin: z.coerce.number().min(0),
  estimatedMinutesMax: z.coerce.number().min(0),
  storeNameEn: z.string().min(1),
  storeNameAr: z.string().min(1),
  addressEn: z.string().min(1),
  addressAr: z.string().min(1),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
});

type PickupFormValues = z.infer<typeof pickupSchema>;

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="border-t border-border-soft pt-4">
      <p className="mb-3 text-xs font-semibold tracking-wide text-charcoal-soft">{title}</p>
    </div>
  );
}

function SaveBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-green-200 bg-green-50 px-3 py-2 text-sm text-success">
      <CheckCircle2 className="size-4 shrink-0" />
      {message}
    </div>
  );
}

function DeliveryPageInner() {
  const queryClient = useQueryClient();
  const [deliverySaved, setDeliverySaved] = useState(false);
  const [pickupSaved, setPickupSaved] = useState(false);
  const settingsQuery = useQuery({ queryKey: ["public-settings"], queryFn: getPublicSettings });

  useEffect(() => {
    if (!deliverySaved) return;
    const t = window.setTimeout(() => setDeliverySaved(false), 4000);
    return () => window.clearTimeout(t);
  }, [deliverySaved]);

  useEffect(() => {
    if (!pickupSaved) return;
    const t = window.setTimeout(() => setPickupSaved(false), 4000);
    return () => window.clearTimeout(t);
  }, [pickupSaved]);

  const deliveryForm = useZodForm(deliverySchema, {
    values: settingsQuery.data
      ? {
          isEnabled: settingsQuery.data.delivery.isEnabled,
          fee: Number(settingsQuery.data.delivery.fee),
          freeDeliveryThreshold:
            settingsQuery.data.delivery.freeDeliveryThreshold != null
              ? Number(settingsQuery.data.delivery.freeDeliveryThreshold)
              : "",
          minOrderAmount: Number(settingsQuery.data.delivery.minOrderAmount),
          estimatedMinutesMin: settingsQuery.data.delivery.estimatedMinutesMin,
          estimatedMinutesMax: settingsQuery.data.delivery.estimatedMinutesMax,
          serviceCity: settingsQuery.data.delivery.serviceCity,
        }
      : undefined,
  });

  const pickupForm = useZodForm(pickupSchema, {
    values: settingsQuery.data
      ? {
          isEnabled: settingsQuery.data.pickup.isEnabled,
          minOrderAmount: Number(settingsQuery.data.pickup.minOrderAmount),
          estimatedMinutesMin: settingsQuery.data.pickup.estimatedMinutesMin,
          estimatedMinutesMax: settingsQuery.data.pickup.estimatedMinutesMax,
          storeNameEn: settingsQuery.data.pickup.storeNameEn,
          storeNameAr: settingsQuery.data.pickup.storeNameAr,
          addressEn: settingsQuery.data.pickup.addressEn,
          addressAr: settingsQuery.data.pickup.addressAr,
          latitude: Number(settingsQuery.data.pickup.latitude),
          longitude: Number(settingsQuery.data.pickup.longitude),
        }
      : undefined,
  });

  const deliveryMutation = useMutation({
    mutationFn: (values: DeliveryFormValues) =>
      updateDeliverySettings({
        ...values,
        freeDeliveryThreshold:
          values.freeDeliveryThreshold === "" || values.freeDeliveryThreshold === undefined
            ? null
            : Number(values.freeDeliveryThreshold),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public-settings"] });
      setDeliverySaved(true);
    },
  });

  const pickupMutation = useMutation({
    mutationFn: (values: PickupFormValues) => updatePickupSettings(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public-settings"] });
      setPickupSaved(true);
    },
  });

  if (settingsQuery.isLoading) return <LoadingState label="جاري تحميل الإعدادات…" />;
  if (settingsQuery.isError || !settingsQuery.data) {
    return <ErrorState message="تعذر تحميل الإعدادات." onRetry={() => settingsQuery.refetch()} />;
  }

  return (
    <div className="page-shell animate-in">
      <PageHeader title="التوصيل والاستلام" description="ضبط خيارات التوصيل والاستلام المعروضة للعملاء." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <form onSubmit={deliveryForm.handleSubmit((v: DeliveryFormValues) => deliveryMutation.mutate(v))}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Truck className="size-5 text-amber-600" />
                <CardTitle>إعدادات التوصيل</CardTitle>
              </div>
              <Button type="submit" size="sm" isLoading={deliveryMutation.isPending}>
                <Save className="size-4" />
                حفظ التوصيل
              </Button>
            </CardHeader>
            <CardBody className="space-y-4">
              {deliverySaved && <SaveBanner message="تم حفظ إعدادات التوصيل بنجاح." />}
              {deliveryMutation.isError && (
                <div className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
                  {getErrorMessage(deliveryMutation.error)}
                </div>
              )}
              <label className="flex items-center gap-2 rounded-[var(--radius-md)] border border-border-soft bg-cream/40 px-3 py-2.5 text-sm text-charcoal">
                <input type="checkbox" className="size-4 accent-amber-500" {...deliveryForm.register("isEnabled")} />
                تفعيل خدمة التوصيل للعملاء
              </label>

              <SectionDivider title="الرسوم والحدود" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label required>رسوم التوصيل (ر.س)</Label>
                  <Input type="number" step="0.01" {...deliveryForm.register("fee")} />
                  <FieldError message={deliveryForm.formState.errors.fee?.message} />
                </div>
                <div>
                  <Label>حد التوصيل المجاني (ر.س)</Label>
                  <Input type="number" step="0.01" {...deliveryForm.register("freeDeliveryThreshold")} placeholder="بدون حد" />
                </div>
              </div>
              <div>
                <Label required>الحد الأدنى للطلب (ر.س)</Label>
                <Input type="number" step="0.01" {...deliveryForm.register("minOrderAmount")} />
              </div>

              <SectionDivider title="الوقت التقديري والمنطقة" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label required>الحد الأدنى (دقيقة)</Label>
                  <Input type="number" {...deliveryForm.register("estimatedMinutesMin")} />
                </div>
                <div>
                  <Label required>الحد الأعلى (دقيقة)</Label>
                  <Input type="number" {...deliveryForm.register("estimatedMinutesMax")} />
                </div>
              </div>
              <div>
                <Label required>مدينة الخدمة</Label>
                <Input {...deliveryForm.register("serviceCity")} />
              </div>
            </CardBody>
          </Card>
        </form>

        <form onSubmit={pickupForm.handleSubmit((v: PickupFormValues) => pickupMutation.mutate(v))}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Store className="size-5 text-amber-600" />
                <CardTitle>إعدادات الاستلام من المتجر</CardTitle>
              </div>
              <Button type="submit" size="sm" isLoading={pickupMutation.isPending}>
                <Save className="size-4" />
                حفظ الاستلام
              </Button>
            </CardHeader>
            <CardBody className="space-y-4">
              {pickupSaved && <SaveBanner message="تم حفظ إعدادات الاستلام بنجاح." />}
              {pickupMutation.isError && (
                <div className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
                  {getErrorMessage(pickupMutation.error)}
                </div>
              )}
              <label className="flex items-center gap-2 rounded-[var(--radius-md)] border border-border-soft bg-cream/40 px-3 py-2.5 text-sm text-charcoal">
                <input type="checkbox" className="size-4 accent-amber-500" {...pickupForm.register("isEnabled")} />
                تفعيل الاستلام من المتجر
              </label>

              <SectionDivider title="بيانات المتجر" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label required>اسم المتجر بالعربية</Label>
                  <Input {...pickupForm.register("storeNameAr")} dir="rtl" />
                </div>
                <div>
                  <Label required>اسم المتجر بالإنجليزية</Label>
                  <Input className="ltr-field" {...pickupForm.register("storeNameEn")} />
                </div>
              </div>
              <div>
                <Label required>العنوان بالعربية</Label>
                <Input {...pickupForm.register("addressAr")} dir="rtl" />
              </div>
              <div>
                <Label required>العنوان بالإنجليزية</Label>
                <Input className="ltr-field" {...pickupForm.register("addressEn")} />
              </div>

              <SectionDivider title="الموقع والطلب" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label required>خط العرض</Label>
                  <Input type="number" step="0.000001" className="ltr-field" {...pickupForm.register("latitude")} />
                </div>
                <div>
                  <Label required>خط الطول</Label>
                  <Input type="number" step="0.000001" className="ltr-field" {...pickupForm.register("longitude")} />
                </div>
              </div>
              <div>
                <Label required>الحد الأدنى للطلب (ر.س)</Label>
                <Input type="number" step="0.01" {...pickupForm.register("minOrderAmount")} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label required>الحد الأدنى (دقيقة)</Label>
                  <Input type="number" {...pickupForm.register("estimatedMinutesMin")} />
                </div>
                <div>
                  <Label required>الحد الأعلى (دقيقة)</Label>
                  <Input type="number" {...pickupForm.register("estimatedMinutesMax")} />
                </div>
              </div>
              <p className="text-xs text-charcoal-soft">
                ساعات العمل تُدار عبر إعدادات JSON المتقدمة وليست قابلة للتعديل من هنا.
              </p>
            </CardBody>
          </Card>
        </form>
      </div>
    </div>
  );
}

export default function DeliveryPage() {
  return (
    <RequireRole navKey="delivery">
      <DeliveryPageInner />
    </RequireRole>
  );
}
