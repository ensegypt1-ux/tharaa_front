"use client";

import type { Control, FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { Controller } from "react-hook-form";
import { OfferImageUploader } from "@/components/offers/OfferImageUploader";
import { FormField, FormSection } from "@/components/ui/FormField";
import { Input, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/StatusBadge";
import {
  CAMPAIGN_AUDIENCE_AR,
  CAMPAIGN_CTA_STYLE_AR,
  CAMPAIGN_DESTINATION_AR,
  CAMPAIGN_FREQUENCY_AR,
  CAMPAIGN_LAYOUT_AR,
  CAMPAIGN_PLACEMENT_AR,
  CAMPAIGN_ROTATION_AR,
  CAMPAIGN_TEXT_ALIGN_AR,
  COMMON_AR,
} from "@/lib/ar/labels";
import type { Campaign, CampaignDestinationType, CampaignPlacement } from "@/lib/types";
import { formatDateTime, formatNumber } from "@/lib/utils/format";
import {
  ALL_AUDIENCES,
  ALL_CTA_STYLES,
  ALL_DESTINATIONS,
  ALL_FREQUENCIES,
  ALL_LAYOUTS,
  ALL_PLACEMENTS,
  ALL_ROTATIONS,
  ALL_TEXT_ALIGNS,
  DESTINATIONS_WITH_ID,
} from "./constants";
import type { CampaignFormValues, EditorTab } from "./campaignForm";
import { CampaignVisualPreview } from "./CampaignVisualPreview";

type CategoryOpt = { id: string; nameAr: string };
type OfferOpt = { id: string; titleAr: string };
type CouponOpt = { id: string; code: string };
type ProductOpt = { id: string; nameAr: string };

export function CampaignEditorFields({
  tab,
  register,
  control,
  watch,
  setValue,
  errors,
  mode,
  campaign,
  previewImageUrl,
  uploadingId,
  uploadProgress,
  destinationSearch,
  setDestinationSearch,
  onUploadImage,
  onUploadIcon,
  onDeleteImage,
  onDeleteIcon,
  onSelectPending,
  categories,
  offers,
  coupons,
  products,
}: {
  tab: EditorTab;
  register: UseFormRegister<CampaignFormValues>;
  control: Control<CampaignFormValues>;
  watch: UseFormWatch<CampaignFormValues>;
  setValue: UseFormSetValue<CampaignFormValues>;
  errors: FieldErrors<CampaignFormValues>;
  mode: "create" | "edit";
  campaign?: Campaign;
  previewImageUrl?: string | null;
  uploadingId: string | null;
  uploadProgress: number | null;
  destinationSearch: string;
  setDestinationSearch: (v: string) => void;
  onUploadImage: (file: File) => void;
  onUploadIcon: (file: File) => void;
  onDeleteImage: () => void;
  onDeleteIcon: () => void;
  onSelectPending: (file: File | null) => void;
  categories: CategoryOpt[];
  offers: OfferOpt[];
  coupons: CouponOpt[];
  products: ProductOpt[];
}) {
  const destinationType = watch("destinationType");
  const frequency = watch("frequency");
  const placements = watch("placements") ?? [];
  const values = watch();

  const togglePlacement = (placement: CampaignPlacement, checked: boolean) => {
    const next = checked
      ? [...new Set([...placements, placement])]
      : placements.filter((p) => p !== placement);
    setValue("placements", next, { shouldValidate: true });
  };

  const toggleId = (
    field: "targetCategoryIds" | "targetProductIds" | "targetOfferIds" | "targetCouponIds",
    id: string,
    checked: boolean,
  ) => {
    const current = (watch(field) as string[]) ?? [];
    const next = checked ? [...new Set([...current, id])] : current.filter((x) => x !== id);
    setValue(field, next, { shouldValidate: true });
  };

  const needle = destinationSearch.trim().toLowerCase();
  const filteredOffers = needle
    ? offers.filter((o) => o.titleAr.toLowerCase().includes(needle))
    : offers;
  const filteredCategories = needle
    ? categories.filter((c) => c.nameAr.toLowerCase().includes(needle))
    : categories;
  const filteredCoupons = needle
    ? coupons.filter((c) => c.code.toLowerCase().includes(needle))
    : coupons;

  if (tab === "content") {
    return (
      <div className="space-y-4">
        <CampaignVisualPreview values={values} imageUrl={previewImageUrl} />
        <FormSection title="النصوص">
          <FormField label={COMMON_AR.titleAr} required error={errors.titleAr?.message}>
            <Input {...register("titleAr")} dir="rtl" />
          </FormField>
          <FormField label={COMMON_AR.titleEn} required error={errors.titleEn?.message}>
            <Input {...register("titleEn")} className="ltr-field" />
          </FormField>
          <FormField label="العنوان الفرعي بالعربية">
            <Input {...register("subtitleAr")} dir="rtl" />
          </FormField>
          <FormField label="العنوان الفرعي بالإنجليزية">
            <Input {...register("subtitleEn")} className="ltr-field" />
          </FormField>
          <FormField label="نص الزر بالعربية">
            <Input {...register("buttonLabelAr")} dir="rtl" />
          </FormField>
          <FormField label="نص الزر بالإنجليزية">
            <Input {...register("buttonLabelEn")} className="ltr-field" />
          </FormField>
          <FormField label="شارة">
            <Input {...register("badgeTextAr")} dir="rtl" placeholder="جديد" />
          </FormField>
          <FormField label="شارة الخصم">
            <Input {...register("discountBadgeAr")} dir="rtl" placeholder="٣٠٪" />
          </FormField>
          <FormField label="شارة (EN)">
            <Input {...register("badgeTextEn")} className="ltr-field" />
          </FormField>
          <FormField label="شارة الخصم (EN)">
            <Input {...register("discountBadgeEn")} className="ltr-field" />
          </FormField>
        </FormSection>
      </div>
    );
  }

  if (tab === "design") {
    return (
      <div className="space-y-4">
        <CampaignVisualPreview values={values} imageUrl={previewImageUrl} />
        <FormSection title="نمط العرض والألوان">
          <FormField label="نمط العرض" required>
            <Select {...register("layout")}>
              {ALL_LAYOUTS.map((l) => (
                <option key={l} value={l}>
                  {CAMPAIGN_LAYOUT_AR[l]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="نمط الزر">
            <Select {...register("ctaStyle")}>
              {ALL_CTA_STYLES.map((s) => (
                <option key={s} value={s}>
                  {CAMPAIGN_CTA_STYLE_AR[s]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="محاذاة النص">
            <Select {...register("textAlign")}>
              {ALL_TEXT_ALIGNS.map((s) => (
                <option key={s} value={s}>
                  {CAMPAIGN_TEXT_ALIGN_AR[s]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="شفافية التظليل (0–1)">
            <Input type="number" step="0.05" min={0} max={1} {...register("overlayOpacity")} />
          </FormField>
          <FormField label="نصف قطر الزوايا">
            <Input type="number" min={0} max={64} {...register("cornerRadius")} />
          </FormField>
          <FormField label="لون الخلفية">
            <div className="flex gap-2">
              <Input
                type="color"
                className="h-10 w-14 shrink-0 p-1"
                value={watch("backgroundColor") || "#1B4332"}
                onChange={(e) => setValue("backgroundColor", e.target.value)}
              />
              <Input {...register("backgroundColor")} className="ltr-field min-w-0 flex-1" />
            </div>
          </FormField>
          <FormField label="تدرج من">
            <div className="flex gap-2">
              <Input
                type="color"
                className="h-10 w-14 shrink-0 p-1"
                value={watch("gradientFrom") || "#1B4332"}
                onChange={(e) => setValue("gradientFrom", e.target.value)}
              />
              <Input {...register("gradientFrom")} className="ltr-field min-w-0 flex-1" />
            </div>
          </FormField>
          <FormField label="تدرج إلى">
            <div className="flex gap-2">
              <Input
                type="color"
                className="h-10 w-14 shrink-0 p-1"
                value={watch("gradientTo") || "#40916C"}
                onChange={(e) => setValue("gradientTo", e.target.value)}
              />
              <Input {...register("gradientTo")} className="ltr-field min-w-0 flex-1" />
            </div>
          </FormField>
        </FormSection>

        <FormSection title="الصورة والأيقونة" description="JPG / PNG / WebP — معاينة فورية">
          <div className="space-y-4 md:col-span-2">
            {mode === "edit" && campaign ? (
              <>
                <OfferImageUploader
                  imageUrl={campaign.imageUrl}
                  isUploading={uploadingId === campaign.id}
                  progress={uploadingId === campaign.id ? uploadProgress : null}
                  onUpload={onUploadImage}
                  onDelete={onDeleteImage}
                />
                <div>
                  <p className="mb-2 text-sm font-medium text-charcoal">أيقونة اختيارية</p>
                  <OfferImageUploader
                    imageUrl={campaign.iconUrl ?? null}
                    isUploading={uploadingId === `icon-${campaign.id}`}
                    progress={uploadingId === `icon-${campaign.id}` ? uploadProgress : null}
                    onUpload={onUploadIcon}
                    onDelete={onDeleteIcon}
                  />
                </div>
              </>
            ) : (
              <OfferImageUploader
                pendingOnly
                pendingHint="سيتم رفع الصورة بعد حفظ الحملة."
                isUploading={uploadingId === "pending"}
                progress={uploadingId === "pending" ? uploadProgress : null}
                onSelectPending={onSelectPending}
              />
            )}
          </div>
        </FormSection>
      </div>
    );
  }

  if (tab === "placements") {
    return (
      <FormSection title="مواضع العرض" description="يمكن اختيار أكثر من موضع لنفس الحملة">
        <div className="md:col-span-2">
          {errors.placements?.message && (
            <p className="mb-2 text-sm text-danger">{errors.placements.message}</p>
          )}
          <div className="grid max-h-[50vh] grid-cols-1 gap-2 overflow-y-auto rounded-[var(--radius-md)] border border-border-soft p-3 sm:grid-cols-2">
            {ALL_PLACEMENTS.map((p) => (
              <label
                key={p}
                className="flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] px-2 text-sm text-charcoal hover:bg-cream/60"
              >
                <input
                  type="checkbox"
                  className="size-5 accent-amber-500"
                  checked={placements.includes(p)}
                  onChange={(e) => togglePlacement(p, e.target.checked)}
                />
                <span className="min-w-0">{CAMPAIGN_PLACEMENT_AR[p]}</span>
              </label>
            ))}
          </div>
        </div>
      </FormSection>
    );
  }

  if (tab === "targeting") {
    return (
      <div className="space-y-4">
        <FormSection title="الجمهور والتكرار">
          <FormField label="الجمهور">
            <Select {...register("audience")}>
              {ALL_AUDIENCES.map((a) => (
                <option key={a} value={a}>
                  {CAMPAIGN_AUDIENCE_AR[a]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="التكرار">
            <Select {...register("frequency")}>
              {ALL_FREQUENCIES.map((f) => (
                <option key={f} value={f}>
                  {CAMPAIGN_FREQUENCY_AR[f]}
                </option>
              ))}
            </Select>
          </FormField>
          {frequency === "DISMISS_HOURS" && (
            <FormField label="ساعات الإخفاء بعد الإغلاق" required error={errors.dismissHours?.message}>
              <Input type="number" min={1} {...register("dismissHours")} />
            </FormField>
          )}
          <FormField label="المدن (مفصولة بفواصل)" hint="مثال: الرياض, جدة">
            <Input {...register("targetCities")} dir="rtl" />
          </FormField>
          <FormField label="معرّفات الفروع (مفصولة بفواصل)" hint="اختياري">
            <Input {...register("targetBranchIds")} className="ltr-field" />
          </FormField>
          <FormField label="حد أدنى لقيمة السلة">
            <Input type="number" min={0} step="0.01" {...register("minCartAmount")} />
          </FormField>
          <FormField label="حد أقصى لقيمة السلة">
            <Input type="number" min={0} step="0.01" {...register("maxCartAmount")} />
          </FormField>
        </FormSection>

        <FormSection title="استهداف الأقسام" description="اتركه فارغًا للكل">
          <div className="max-h-40 overflow-y-auto rounded-[var(--radius-md)] border border-border-soft md:col-span-2">
            {categories.map((c) => (
              <label
                key={c.id}
                className="flex min-h-10 items-center gap-2 border-b border-border-soft/70 px-3 text-sm last:border-0"
              >
                <input
                  type="checkbox"
                  className="size-4 accent-amber-500"
                  checked={(watch("targetCategoryIds") ?? []).includes(c.id)}
                  onChange={(e) => toggleId("targetCategoryIds", c.id, e.target.checked)}
                />
                {c.nameAr}
              </label>
            ))}
          </div>
        </FormSection>

        <FormSection title="استهداف العروض">
          <div className="max-h-40 overflow-y-auto rounded-[var(--radius-md)] border border-border-soft md:col-span-2">
            {offers.map((o) => (
              <label
                key={o.id}
                className="flex min-h-10 items-center gap-2 border-b border-border-soft/70 px-3 text-sm last:border-0"
              >
                <input
                  type="checkbox"
                  className="size-4 accent-amber-500"
                  checked={(watch("targetOfferIds") ?? []).includes(o.id)}
                  onChange={(e) => toggleId("targetOfferIds", o.id, e.target.checked)}
                />
                {o.titleAr}
              </label>
            ))}
          </div>
        </FormSection>

        <FormSection title="استهداف الكوبونات">
          <div className="max-h-40 overflow-y-auto rounded-[var(--radius-md)] border border-border-soft md:col-span-2">
            {coupons.map((c) => (
              <label
                key={c.id}
                className="flex min-h-10 items-center gap-2 border-b border-border-soft/70 px-3 text-sm last:border-0"
              >
                <input
                  type="checkbox"
                  className="size-4 accent-amber-500"
                  checked={(watch("targetCouponIds") ?? []).includes(c.id)}
                  onChange={(e) => toggleId("targetCouponIds", c.id, e.target.checked)}
                />
                <span className="ltr-field font-medium">{c.code}</span>
              </label>
            ))}
          </div>
        </FormSection>

        <FormSection title="استهداف المنتجات">
          <div className="md:col-span-2 space-y-2">
            <Input
              value={destinationSearch}
              onChange={(e) => setDestinationSearch(e.target.value)}
              placeholder="ابحث عن منتجات لإضافتها…"
            />
            <div className="max-h-40 overflow-y-auto rounded-[var(--radius-md)] border border-border-soft">
              {products.map((p) => (
                <label
                  key={p.id}
                  className="flex min-h-10 items-center gap-2 border-b border-border-soft/70 px-3 text-sm last:border-0"
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-amber-500"
                    checked={(watch("targetProductIds") ?? []).includes(p.id)}
                    onChange={(e) => toggleId("targetProductIds", p.id, e.target.checked)}
                  />
                  {p.nameAr}
                </label>
              ))}
              {products.length === 0 && (
                <p className="px-3 py-4 text-center text-sm text-charcoal-soft">ابدأ بالبحث.</p>
              )}
            </div>
          </div>
        </FormSection>
      </div>
    );
  }

  if (tab === "schedule") {
    return (
      <FormSection title="الجدولة والتدوير والأولوية">
        <FormField label={COMMON_AR.startsAt} required error={errors.startsAt?.message}>
          <Input type="datetime-local" {...register("startsAt")} />
        </FormField>
        <FormField label={COMMON_AR.endsAt} required error={errors.endsAt?.message}>
          <Input type="datetime-local" {...register("endsAt")} />
        </FormField>
        <FormField label="الأولوية">
          <Input type="number" {...register("priority")} />
        </FormField>
        <FormField label="الترتيب">
          <Input type="number" min={0} {...register("sortOrder")} />
        </FormField>
        <FormField label="الوزن">
          <Input type="number" min={1} {...register("weight")} />
        </FormField>
        <FormField label="وضع التدوير">
          <Select {...register("rotationMode")}>
            {ALL_ROTATIONS.map((r) => (
              <option key={r} value={r}>
                {CAMPAIGN_ROTATION_AR[r]}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="حد أقصى للظهور">
          <Input type="number" min={1} {...register("maxImpressions")} placeholder="بدون حد" />
        </FormField>
        <FormField label="حد أقصى للنقرات">
          <Input type="number" min={1} {...register("maxClicks")} placeholder="بدون حد" />
        </FormField>
        <label className="flex min-h-11 items-center gap-2 text-sm text-charcoal md:col-span-2">
          <input type="checkbox" className="size-5 accent-amber-500" {...register("isActive")} />
          {COMMON_AR.active}
        </label>
      </FormSection>
    );
  }

  if (tab === "destination") {
    return (
      <FormSection title="الوجهة (Deep link)">
        <FormField label="نوع الوجهة" required>
          <Select
            value={destinationType}
            onChange={(e) => {
              setValue("destinationType", e.target.value as CampaignDestinationType, {
                shouldValidate: true,
              });
              setDestinationSearch("");
            }}
          >
            {ALL_DESTINATIONS.map((d) => (
              <option key={d} value={d}>
                {CAMPAIGN_DESTINATION_AR[d]}
              </option>
            ))}
          </Select>
        </FormField>

        {DESTINATIONS_WITH_ID.includes(destinationType) && (
          <FormField
            label="اختر الوجهة"
            required
            error={errors.destinationId?.message}
            className="md:col-span-2"
          >
            <Input
              value={destinationSearch}
              onChange={(e) => setDestinationSearch(e.target.value)}
              placeholder="ابحث…"
              className="mb-2"
            />
            <Controller
              control={control}
              name="destinationId"
              render={({ field }) => (
                <div className="max-h-48 overflow-y-auto rounded-[var(--radius-md)] border border-border-soft">
                  {destinationType === "OFFER" &&
                    filteredOffers.map((o) => (
                      <label
                        key={o.id}
                        className="flex min-h-10 items-center gap-2 border-b border-border-soft/70 px-3 text-sm last:border-0"
                      >
                        <input
                          type="radio"
                          className="size-4 accent-amber-500"
                          checked={field.value === o.id}
                          onChange={() => field.onChange(o.id)}
                        />
                        {o.titleAr}
                      </label>
                    ))}
                  {destinationType === "CATEGORY" &&
                    filteredCategories.map((c) => (
                      <label
                        key={c.id}
                        className="flex min-h-10 items-center gap-2 border-b border-border-soft/70 px-3 text-sm last:border-0"
                      >
                        <input
                          type="radio"
                          className="size-4 accent-amber-500"
                          checked={field.value === c.id}
                          onChange={() => field.onChange(c.id)}
                        />
                        {c.nameAr}
                      </label>
                    ))}
                  {destinationType === "COUPON" &&
                    filteredCoupons.map((c) => (
                      <label
                        key={c.id}
                        className="flex min-h-10 items-center gap-2 border-b border-border-soft/70 px-3 text-sm last:border-0"
                      >
                        <input
                          type="radio"
                          className="size-4 accent-amber-500"
                          checked={field.value === c.id}
                          onChange={() => field.onChange(c.id)}
                        />
                        <span className="ltr-field">{c.code}</span>
                      </label>
                    ))}
                  {destinationType === "PRODUCT" &&
                    products.map((p) => (
                      <label
                        key={p.id}
                        className="flex min-h-10 items-center gap-2 border-b border-border-soft/70 px-3 text-sm last:border-0"
                      >
                        <input
                          type="radio"
                          className="size-4 accent-amber-500"
                          checked={field.value === p.id}
                          onChange={() => field.onChange(p.id)}
                        />
                        {p.nameAr}
                      </label>
                    ))}
                </div>
              )}
            />
          </FormField>
        )}

        {destinationType === "EXTERNAL_URL" && (
          <FormField label="الرابط الخارجي" required error={errors.destinationUrl?.message} className="md:col-span-2">
            <Input {...register("destinationUrl")} className="ltr-field" placeholder="https://" />
          </FormField>
        )}
        {destinationType === "INTERNAL_ROUTE" && (
          <FormField label="المسار الداخلي" required error={errors.destinationRoute?.message} className="md:col-span-2">
            <Input {...register("destinationRoute")} className="ltr-field" placeholder="/offers" />
          </FormField>
        )}
        {destinationType === "COUPON" && (
          <label className="flex min-h-11 items-center gap-2 text-sm text-charcoal md:col-span-2">
            <input type="checkbox" className="size-5 accent-amber-500" {...register("autoApplyCoupon")} />
            تطبيق الكوبون تلقائيًا
          </label>
        )}
      </FormSection>
    );
  }

  // analytics tab
  return (
    <div className="space-y-4">
      {mode === "edit" && campaign ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-[var(--radius-lg)] border border-border-soft p-3">
            <p className="text-xs text-charcoal-soft">الظهور</p>
            <p className="text-lg font-semibold tabular-nums">
              {formatNumber(campaign.impressionCount ?? 0)}
            </p>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-border-soft p-3">
            <p className="text-xs text-charcoal-soft">النقرات</p>
            <p className="text-lg font-semibold tabular-nums">
              {formatNumber(campaign.clickCount ?? 0)}
            </p>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-border-soft p-3">
            <p className="text-xs text-charcoal-soft">CTR</p>
            <p className="text-lg font-semibold tabular-nums">{formatNumber(campaign.ctr ?? 0)}%</p>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-border-soft p-3">
            <p className="text-xs text-charcoal-soft">الحالة</p>
            <Badge tone={campaign.isActive ? "green" : "gray"}>
              {campaign.isActive ? "نشطة" : "معطّلة"}
            </Badge>
          </div>
          <div className="col-span-2 rounded-[var(--radius-lg)] border border-border-soft p-3 sm:col-span-2">
            <p className="text-xs text-charcoal-soft">آخر ظهور</p>
            <p className="text-sm">{formatDateTime(campaign.lastViewedAt)}</p>
          </div>
          <div className="col-span-2 rounded-[var(--radius-lg)] border border-border-soft p-3 sm:col-span-2">
            <p className="text-xs text-charcoal-soft">آخر نقرة</p>
            <p className="text-sm">{formatDateTime(campaign.lastClickedAt)}</p>
          </div>
          <div className="col-span-2 rounded-[var(--radius-lg)] border border-border-soft p-3 sm:col-span-2">
            <p className="text-xs text-charcoal-soft">الجدول الزمني</p>
            <p className="text-sm">
              {formatDateTime(campaign.startsAt)} — {formatDateTime(campaign.endsAt)}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-charcoal-soft">
          ستتوفر إحصاءات الظهور والنقرات بعد حفظ الحملة وبدء العرض في التطبيق.
        </p>
      )}
      <CampaignVisualPreview values={values} imageUrl={previewImageUrl} />
    </div>
  );
}
