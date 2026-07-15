"use client";

import { useRouter } from "next/navigation";
import { z } from "zod";
import { useZodForm } from "@/lib/forms/useZodForm";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { RequireRole } from "@/components/layout/RequireRole";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { listCategories } from "@/lib/api/categories";
import { createProduct } from "@/lib/api/products";
import { getErrorMessage } from "@/lib/api/errors";
import { COMMON_AR } from "@/lib/ar/labels";

const productSchema = z.object({
  categoryId: z.string().min(1, "اختر قسمًا"),
  nameEn: z.string().min(1, "الاسم بالإنجليزية مطلوب"),
  nameAr: z.string().min(1, "الاسم بالعربية مطلوب"),
  descriptionEn: z.string().optional(),
  descriptionAr: z.string().optional(),
  sku: z.string().optional(),
  unit: z.string().min(1, "الوحدة مطلوبة (مثل: كجم، قطعة)"),
  regularPrice: z.coerce.number().min(0, "يجب أن يكون 0 أو أكثر"),
  salePrice: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  hasVariants: z.boolean().default(false),
  initialQuantity: z.coerce.number().min(0).default(0),
  lowStockThreshold: z.coerce.number().min(0).default(5),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
});

type ProductFormValues = z.infer<typeof productSchema>;

function NewProductPageInner() {
  const router = useRouter();
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: listCategories });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useZodForm(productSchema, {
    defaultValues: {
      categoryId: "",
      nameEn: "",
      nameAr: "",
      unit: "kg",
      regularPrice: 0,
      hasVariants: false,
      initialQuantity: 0,
      lowStockThreshold: 5,
      isActive: true,
      isFeatured: false,
      isBestSeller: false,
    },
  });

  const hasVariants = watch("hasVariants");

  const createMutation = useMutation({
    mutationFn: (values: ProductFormValues) =>
      createProduct({
        ...values,
        salePrice: values.salePrice === "" || values.salePrice === undefined ? null : Number(values.salePrice),
      }),
    onSuccess: (product) => router.push(`/products/${product.id}`),
  });

  return (
    <div className="animate-in pb-20">
      <PageHeader
        title="منتج جديد"
        description="أنشئ منتجًا جديدًا — يمكنك إضافة الصور والأنواع بعد الحفظ."
        breadcrumbs={[{ label: "المنتجات", href: "/products" }, { label: "جديد" }]}
        stickyActions
        actions={
          <Button
            type="submit"
            form="product-create-form"
            isLoading={isSubmitting || createMutation.isPending}
          >
            <Save className="size-4" />
            إنشاء المنتج
          </Button>
        }
      />

      {createMutation.isError && (
        <div className="mb-4 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-danger">
          {getErrorMessage(createMutation.error)}
        </div>
      )}

      <form
        id="product-create-form"
        onSubmit={handleSubmit((v: ProductFormValues) => createMutation.mutate(v))}
        className="grid grid-cols-1 gap-4 lg:grid-cols-3"
      >
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>المعلومات الأساسية</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label={COMMON_AR.nameAr} required error={errors.nameAr?.message}>
                  <Input {...register("nameAr")} placeholder="تفاح طازج" dir="rtl" />
                </FormField>
                <FormField label={COMMON_AR.nameEn} required error={errors.nameEn?.message}>
                  <Input {...register("nameEn")} placeholder="Fresh Apples" className="ltr-field" />
                </FormField>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label={COMMON_AR.descriptionAr}>
                  <Textarea rows={3} dir="rtl" {...register("descriptionAr")} />
                </FormField>
                <FormField label={COMMON_AR.descriptionEn}>
                  <Textarea rows={3} className="ltr-field" {...register("descriptionEn")} />
                </FormField>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <FormField label={COMMON_AR.category} required error={errors.categoryId?.message}>
                  <Select {...register("categoryId")}>
                    <option value="">اختر…</option>
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
                </FormField>
                <FormField label={COMMON_AR.unit} required error={errors.unit?.message}>
                  <Input {...register("unit")} placeholder="كجم" />
                </FormField>
                <FormField label={COMMON_AR.sku}>
                  <Input {...register("sku")} placeholder="اختياري" className="ltr-field" />
                </FormField>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>التسعير</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <label className="flex items-start gap-2 rounded-lg border border-border-soft bg-cream/40 px-3 py-2.5 text-sm text-charcoal">
                <input type="checkbox" className="mt-0.5 size-4 accent-amber-500" {...register("hasVariants")} />
                <span>
                  هذا المنتج له أنواع (مثل الأحجام) — يُدار السعر والمخزون لكل نوع على حدة بعد الإنشاء.
                </span>
              </label>
              {!hasVariants && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField label="السعر الأساسي (ريال)" required error={errors.regularPrice?.message}>
                    <Input type="number" step="0.01" min="0" {...register("regularPrice")} />
                  </FormField>
                  <FormField label="سعر العرض (ريال)" hint="اختياري">
                    <Input type="number" step="0.01" min="0" {...register("salePrice")} placeholder="اختياري" />
                  </FormField>
                </div>
              )}
              {hasVariants && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  يمكنك إضافة الأنواع بأسعارها ومخزونها الخاص بعد إنشاء المنتج.
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>المخزون</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              {!hasVariants && (
                <FormField label="الكمية الأولية في المخزون">
                  <Input type="number" min="0" {...register("initialQuantity")} className="max-w-xs" />
                </FormField>
              )}
              <FormField label="حد المخزون المنخفض" hint="يُنبّه عندما ينخفض المخزون عن هذا الحد">
                <Input type="number" min="0" {...register("lowStockThreshold")} className="max-w-xs" />
              </FormField>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>الظهور</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-charcoal">
                <input type="checkbox" className="size-4 accent-amber-500" {...register("isActive")} />
                نشط (يظهر للعملاء)
              </label>
              <label className="flex items-center gap-2 text-sm text-charcoal">
                <input type="checkbox" className="size-4 accent-amber-500" {...register("isFeatured")} />
                {COMMON_AR.featured}
              </label>
              <label className="flex items-center gap-2 text-sm text-charcoal">
                <input type="checkbox" className="size-4 accent-amber-500" {...register("isBestSeller")} />
                {COMMON_AR.bestSeller}
              </label>
            </CardBody>
          </Card>

          <Card className="border-dashed">
            <CardBody className="text-center text-sm text-charcoal-soft">
              <p className="font-medium text-charcoal">الصور والمتغيرات</p>
              <p className="mt-1 text-xs">تُضاف في شاشة تفاصيل المنتج بعد الإنشاء.</p>
            </CardBody>
          </Card>
        </div>
      </form>

      <div className="sticky-page-actions flex justify-end">
        <Button type="submit" form="product-create-form" isLoading={isSubmitting || createMutation.isPending}>
          <Save className="size-4" />
          إنشاء المنتج
        </Button>
      </div>
    </div>
  );
}

export default function NewProductPage() {
  return (
    <RequireRole navKey="products">
      <NewProductPageInner />
    </RequireRole>
  );
}
