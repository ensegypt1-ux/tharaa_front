"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { z } from "zod";
import { useZodForm } from "@/lib/forms/useZodForm";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ImageIcon,
  Images,
  Plus,
  Save,
  Star,
  Trash2,
  Pencil,
  AlertCircle,
} from "lucide-react";
import { RequireRole } from "@/components/layout/RequireRole";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { FileUploadButton } from "@/components/ui/FileUploadButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { ErrorState, LoadingState } from "@/components/ui/LoadingState";
import { ImageSearchModal } from "@/components/images/ImageSearchModal";
import { listCategories } from "@/lib/api/categories";
import {
  createVariant,
  deleteProduct,
  deleteProductImage,
  deleteVariant,
  getProduct,
  setPrimaryImage,
  updateProduct,
  updateVariant,
  uploadProductImage,
  type VariantPayload,
} from "@/lib/api/products";
import { getErrorMessage } from "@/lib/api/errors";
import { formatCurrency, formatNumber } from "@/lib/utils/format";
import type { ProductVariant } from "@/lib/types";
import { COMMON_AR } from "@/lib/ar/labels";

const productSchema = z.object({
  categoryId: z.string().min(1, "اختر قسمًا"),
  nameEn: z.string().min(1, "الاسم بالإنجليزية مطلوب"),
  nameAr: z.string().min(1, "الاسم بالعربية مطلوب"),
  descriptionEn: z.string().optional(),
  descriptionAr: z.string().optional(),
  sku: z.string().optional(),
  unit: z.string().min(1, "الوحدة مطلوبة"),
  regularPrice: z.coerce.number().min(0, "يجب أن يكون 0 أو أكثر"),
  salePrice: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  lowStockThreshold: z.coerce.number().min(0, "يجب أن يكون 0 أو أكثر"),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  isBestSeller: z.boolean(),
});

type ProductFormValues = z.infer<typeof productSchema>;

const variantSchema = z.object({
  nameEn: z.string().min(1, "مطلوب"),
  nameAr: z.string().min(1, "مطلوب"),
  sku: z.string().optional(),
  price: z.coerce.number().min(0),
  salePrice: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().default(0),
  initialQuantity: z.coerce.number().min(0).default(0),
});

type VariantFormValues = z.infer<typeof variantSchema>;

function ProductDetailInner({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [pexelsOpen, setPexelsOpen] = useState(false);
  const [deleteProductOpen, setDeleteProductOpen] = useState(false);
  const [deleteImageId, setDeleteImageId] = useState<string | null>(null);
  const [variantModal, setVariantModal] = useState<{ mode: "create" | "edit"; variant?: ProductVariant } | null>(null);
  const [deleteVariantTarget, setDeleteVariantTarget] = useState<ProductVariant | null>(null);

  const productQuery = useQuery({ queryKey: ["product", id], queryFn: () => getProduct(id) });
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: listCategories });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useZodForm(productSchema, {
    values: productQuery.data
      ? {
          categoryId: productQuery.data.categoryId,
          nameEn: productQuery.data.nameEn,
          nameAr: productQuery.data.nameAr,
          descriptionEn: productQuery.data.descriptionEn ?? "",
          descriptionAr: productQuery.data.descriptionAr ?? "",
          sku: productQuery.data.sku ?? "",
          unit: productQuery.data.unit,
          regularPrice: productQuery.data.regularPrice,
          salePrice: productQuery.data.salePrice ?? "",
          lowStockThreshold: productQuery.data.lowStockThreshold,
          isActive: productQuery.data.isActive,
          isFeatured: productQuery.data.isFeatured,
          isBestSeller: productQuery.data.isBestSeller,
        }
      : undefined,
  });

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const saveMutation = useMutation({
    mutationFn: (values: ProductFormValues) =>
      updateProduct(id, {
        ...values,
        salePrice: values.salePrice === "" || values.salePrice === undefined ? null : Number(values.salePrice),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: () => deleteProduct(id),
    onSuccess: () => router.push("/products"),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadProductImage(id, file),
    onMutate: () => setUploading(true),
    onSettled: () => setUploading(false),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["product", id] }),
  });

  const setPrimaryMutation = useMutation({
    mutationFn: (imageId: string) => setPrimaryImage(id, imageId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["product", id] }),
  });

  const deleteImageMutation = useMutation({
    mutationFn: (imageId: string) => deleteProductImage(id, imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      setDeleteImageId(null);
    },
  });

  const variantForm = useZodForm(variantSchema, {
    defaultValues: { nameEn: "", nameAr: "", price: 0, isActive: true, sortOrder: 0, initialQuantity: 0 },
  });

  const openCreateVariant = () => {
    variantForm.reset({
      nameEn: "",
      nameAr: "",
      price: 0,
      isActive: true,
      sortOrder: productQuery.data?.variants.length ?? 0,
      initialQuantity: 0,
    });
    setVariantModal({ mode: "create" });
  };

  const openEditVariant = (variant: ProductVariant) => {
    variantForm.reset({
      nameEn: variant.nameEn,
      nameAr: variant.nameAr,
      sku: variant.sku ?? "",
      price: variant.price,
      salePrice: variant.salePrice ?? "",
      isActive: variant.isActive,
      sortOrder: variant.sortOrder,
      initialQuantity: variant.inventory?.quantity ?? 0,
    });
    setVariantModal({ mode: "edit", variant });
  };

  const variantMutation = useMutation({
    mutationFn: (values: VariantFormValues) => {
      const payload: VariantPayload = {
        ...values,
        salePrice: values.salePrice === "" || values.salePrice === undefined ? null : Number(values.salePrice),
      };
      if (variantModal?.mode === "edit" && variantModal.variant) {
        return updateVariant(id, variantModal.variant.id, payload);
      }
      return createVariant(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      setVariantModal(null);
    },
  });

  const deleteVariantMutation = useMutation({
    mutationFn: (variantId: string) => deleteVariant(id, variantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      setDeleteVariantTarget(null);
    },
  });

  if (productQuery.isLoading) return <LoadingState label="جاري تحميل المنتج…" />;
  if (productQuery.isError || !productQuery.data) {
    return <ErrorState message="لم يتم العثور على المنتج." onRetry={() => productQuery.refetch()} />;
  }

  const product = productQuery.data;

  return (
    <div className="animate-in pb-20">
      <PageHeader
        title={product.nameAr}
        description={product.nameEn}
        breadcrumbs={[{ label: "المنتجات", href: "/products" }, { label: product.nameAr }]}
        stickyActions
        actions={
          <>
            <Button
              type="submit"
              form="product-edit-form"
              isLoading={isSubmitting || saveMutation.isPending}
              disabled={!isDirty}
            >
              <Save className="size-4" />
              حفظ التغييرات
            </Button>
            <Button variant="danger" onClick={() => setDeleteProductOpen(true)}>
              <Trash2 className="size-4" />
              حذف
            </Button>
          </>
        }
      />

      {isDirty && (
        <div className="mb-4 flex items-center gap-2 rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          <AlertCircle className="size-4 shrink-0" />
          لديك تغييرات غير محفوظة — لا تنسَ الحفظ قبل مغادرة الصفحة.
        </div>
      )}

      {saveMutation.isError && (
        <div className="mb-4 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-danger">
          {getErrorMessage(saveMutation.error)}
        </div>
      )}

      <form
        id="product-edit-form"
        onSubmit={handleSubmit((v: ProductFormValues) => saveMutation.mutate(v))}
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
                  <Input {...register("nameAr")} dir="rtl" />
                </FormField>
                <FormField label={COMMON_AR.nameEn} required error={errors.nameEn?.message}>
                  <Input {...register("nameEn")} className="ltr-field" />
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
                  <Input {...register("unit")} />
                </FormField>
                <FormField label={COMMON_AR.sku}>
                  <Input {...register("sku")} className="ltr-field" placeholder={COMMON_AR.noSku} />
                </FormField>
              </div>
            </CardBody>
          </Card>

          {!product.hasVariants && (
            <Card>
              <CardHeader>
                <CardTitle>التسعير</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField label="السعر الأساسي (ريال)" required error={errors.regularPrice?.message}>
                    <Input type="number" step="0.01" min="0" {...register("regularPrice")} />
                  </FormField>
                  <FormField label="سعر العرض (ريال)" hint="اتركه فارغًا إن لم يكن هناك عرض">
                    <Input type="number" step="0.01" min="0" {...register("salePrice")} placeholder="اختياري" />
                  </FormField>
                </div>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>المخزون</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="flex flex-wrap gap-6 rounded-lg bg-cream/60 px-4 py-3 text-sm">
                <div>
                  <p className="text-xs text-charcoal-soft">المتوفر حاليًا</p>
                  <p className="text-lg font-semibold text-charcoal">
                    {formatNumber(product.availableQuantity)} {product.unit}
                  </p>
                </div>
                {product.inventory && (
                  <div>
                    <p className="text-xs text-charcoal-soft">الكمية الكلية / المحجوز</p>
                    <p className="font-medium text-charcoal">
                      {formatNumber(product.inventory.quantity)} / {formatNumber(product.inventory.reservedQuantity)}
                    </p>
                  </div>
                )}
              </div>
              <div className="w-full max-w-xs">
                <FormField
                  label="حد المخزون المنخفض"
                  error={errors.lowStockThreshold?.message}
                  hint="يُنبّه عندما ينخفض المخزون عن هذا الحد"
                >
                  <Input type="number" min="0" {...register("lowStockThreshold")} />
                </FormField>
              </div>
              {product.hasVariants && (
                <p className="text-xs text-charcoal-soft">
                  هذا المنتج يعتمد على أنواع متعددة — يُدار المخزون لكل نوع في قسم المتغيرات.
                </p>
              )}
            </CardBody>
          </Card>

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

          {product.hasVariants && (
            <Card>
              <CardHeader>
                <CardTitle>المتغيرات</CardTitle>
                <Button type="button" size="sm" variant="outline" onClick={openCreateVariant}>
                  <Plus className="size-4" />
                  إضافة نوع
                </Button>
              </CardHeader>
              <CardBody className="p-0">
                {product.variants.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-charcoal-soft">لا توجد أنواع بعد — أضف نوعًا لإدارة السعر والمخزون.</p>
                ) : (
                  <table className="w-full text-start text-sm">
                    <thead>
                      <tr className="border-b border-border-soft bg-cream/60 text-xs uppercase tracking-wide text-charcoal-soft">
                        <th className="px-5 py-2.5">النوع</th>
                        <th className="px-5 py-2.5">{COMMON_AR.price}</th>
                        <th className="px-5 py-2.5">{COMMON_AR.stock}</th>
                        <th className="px-5 py-2.5">{COMMON_AR.status}</th>
                        <th className="px-5 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {product.variants.map((v) => (
                        <tr key={v.id} className="border-b border-border-soft/70 last:border-0">
                          <td className="px-5 py-3">
                            <p className="font-medium text-charcoal">{v.nameAr}</p>
                            <p className="text-xs text-charcoal-soft ltr-field">{v.sku ?? COMMON_AR.noSku}</p>
                          </td>
                          <td className="px-5 py-3">
                            {formatCurrency(v.effectivePrice ?? v.price)}
                            {v.salePrice != null && (
                              <span className="ms-1 text-xs text-charcoal-soft line-through">{formatCurrency(v.price)}</span>
                            )}
                          </td>
                          <td className="px-5 py-3">{formatNumber(v.inventory?.available ?? 0)}</td>
                          <td className="px-5 py-3">
                            <span className={v.isActive ? "text-success" : "text-charcoal-soft"}>
                              {v.isActive ? COMMON_AR.active : COMMON_AR.inactive}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-end">
                            <button
                              type="button"
                              onClick={() => openEditVariant(v)}
                              className="me-1 rounded-lg p-1.5 text-charcoal-soft hover:bg-amber-50 hover:text-amber-700"
                            >
                              <Pencil className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteVariantTarget(v)}
                              className="rounded-lg p-1.5 text-charcoal-soft hover:bg-red-50 hover:text-danger"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>الصور</CardTitle>
              <span className="text-xs text-charcoal-soft">{formatNumber(product.images.length)} صورة</span>
            </CardHeader>
            <CardBody>
              {product.images.length === 0 ? (
                <div className="mb-3 flex flex-col items-center gap-2 rounded-lg border border-dashed border-amber-200 bg-amber-50/50 py-8 text-center">
                  <ImageIcon className="size-6 text-amber-700" />
                  <p className="text-sm text-charcoal-soft">لا توجد صور بعد</p>
                </div>
              ) : (
                <div className="mb-3 grid grid-cols-2 gap-2">
                  {product.images.map((img) => (
                    <div key={img.id} className="group relative aspect-square overflow-hidden rounded-lg border border-border-soft">
                      <Image src={img.url} alt={product.nameAr} fill className="object-cover" unoptimized />
                      {img.isPrimary && (
                        <span className="absolute start-1 top-1 rounded-full bg-amber-500 p-1 text-charcoal">
                          <Star className="size-3" fill="currentColor" />
                        </span>
                      )}
                      {img.photographer && (
                        <span className="absolute bottom-0 inset-x-0 truncate bg-charcoal/70 px-1.5 py-0.5 text-[9px] text-cream">
                          {img.photographer}
                        </span>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center gap-1 bg-charcoal/0 opacity-0 transition group-hover:bg-charcoal/50 group-hover:opacity-100">
                        {!img.isPrimary && (
                          <button
                            type="button"
                            onClick={() => setPrimaryMutation.mutate(img.id)}
                            title="تعيين كصورة أساسية"
                            className="flex size-7 items-center justify-center rounded-full bg-surface text-charcoal hover:bg-amber-100"
                          >
                            <Star className="size-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDeleteImageId(img.id)}
                          title={COMMON_AR.delete}
                          className="flex size-7 items-center justify-center rounded-full bg-surface text-danger hover:bg-red-50"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-col gap-2">
                <FileUploadButton
                  label="رفع صورة"
                  isLoading={uploading}
                  onFileSelected={(file) => uploadMutation.mutate(file)}
                  variant="outline"
                />
                <Button type="button" variant="secondary" onClick={() => setPexelsOpen(true)}>
                  <Images className="size-4" />
                  البحث في Pexels
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>التقييمات</CardTitle>
            </CardHeader>
            <CardBody className="text-sm text-charcoal-soft">
              <p>
                <span className="text-lg font-semibold text-charcoal">{product.ratingAverage.toFixed(1)}</span> / 5 المتوسط
              </p>
              <p>{formatNumber(product.ratingCount)} تقييم معتمد</p>
            </CardBody>
          </Card>
        </div>
      </form>

      {isDirty && (
        <div className="sticky-page-actions flex items-center justify-between gap-3">
          <p className="text-sm text-amber-800">تغييرات غير محفوظة</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => productQuery.refetch()}>
              تجاهل
            </Button>
            <Button
              isLoading={isSubmitting || saveMutation.isPending}
              onClick={handleSubmit((v: ProductFormValues) => saveMutation.mutate(v))}
            >
              <Save className="size-4" />
              حفظ التغييرات
            </Button>
          </div>
        </div>
      )}

      <ImageSearchModal
        open={pexelsOpen}
        onClose={() => setPexelsOpen(false)}
        productId={id}
        productName={product.nameAr}
        defaultQuery={product.nameEn}
        onSelected={() => {
          queryClient.invalidateQueries({ queryKey: ["product", id] });
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteImageId)}
        onClose={() => setDeleteImageId(null)}
        onConfirm={() => deleteImageId && deleteImageMutation.mutate(deleteImageId)}
        isLoading={deleteImageMutation.isPending}
        title="حذف الصورة"
        description="سيتم إزالة هذه الصورة من المنتج."
        confirmLabel={COMMON_AR.delete}
      />

      <ConfirmDialog
        open={deleteProductOpen}
        onClose={() => setDeleteProductOpen(false)}
        onConfirm={() => deleteProductMutation.mutate()}
        isLoading={deleteProductMutation.isPending}
        title="حذف المنتج"
        description={`هل تريد حذف منتج "${product.nameAr}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel={COMMON_AR.delete}
      />

      <ConfirmDialog
        open={Boolean(deleteVariantTarget)}
        onClose={() => setDeleteVariantTarget(null)}
        onConfirm={() => deleteVariantTarget && deleteVariantMutation.mutate(deleteVariantTarget.id)}
        isLoading={deleteVariantMutation.isPending}
        title="حذف النوع"
        description={`حذف النوع "${deleteVariantTarget?.nameAr}"؟`}
        confirmLabel={COMMON_AR.delete}
      />

      <Modal
        open={Boolean(variantModal)}
        onClose={() => setVariantModal(null)}
        title={variantModal?.mode === "edit" ? "تعديل النوع" : "إضافة نوع"}
        footer={
          <>
            <Button variant="outline" onClick={() => setVariantModal(null)}>
              {COMMON_AR.cancel}
            </Button>
            <Button
              isLoading={variantMutation.isPending}
              onClick={variantForm.handleSubmit((v: VariantFormValues) => variantMutation.mutate(v))}
            >
              {COMMON_AR.save}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label={COMMON_AR.nameAr} required>
              <Input {...variantForm.register("nameAr")} dir="rtl" />
            </FormField>
            <FormField label={COMMON_AR.nameEn} required>
              <Input {...variantForm.register("nameEn")} className="ltr-field" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label={COMMON_AR.price} required>
              <Input type="number" step="0.01" {...variantForm.register("price")} />
            </FormField>
            <FormField label="سعر العرض">
              <Input type="number" step="0.01" {...variantForm.register("salePrice")} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label={COMMON_AR.sku}>
              <Input {...variantForm.register("sku")} className="ltr-field" />
            </FormField>
            <FormField label={COMMON_AR.sortOrder}>
              <Input type="number" {...variantForm.register("sortOrder")} />
            </FormField>
          </div>
          {variantModal?.mode === "create" && (
            <FormField label="الكمية الأولية في المخزون">
              <Input type="number" {...variantForm.register("initialQuantity")} />
            </FormField>
          )}
          <label className="flex items-center gap-2 text-sm text-charcoal">
            <input type="checkbox" className="size-4 accent-amber-500" {...variantForm.register("isActive")} />
            {COMMON_AR.active}
          </label>
        </div>
      </Modal>
    </div>
  );
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireRole navKey="products">
      <ProductDetailInner id={id} />
    </RequireRole>
  );
}
