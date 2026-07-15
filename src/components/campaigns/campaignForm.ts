import { z } from "zod";
import type { Campaign, CampaignDestinationType, CampaignPlacement } from "@/lib/types";
import type { CampaignPayload } from "@/lib/api/campaigns";
import { DESTINATIONS_WITH_ID, joinCommaList, splitCommaList } from "./constants";

export const campaignSchema = z
  .object({
    titleAr: z.string().min(1, "مطلوب"),
    titleEn: z.string().min(1, "مطلوب"),
    subtitleAr: z.string().optional(),
    subtitleEn: z.string().optional(),
    buttonLabelAr: z.string().optional(),
    buttonLabelEn: z.string().optional(),
    startsAt: z.string().min(1, "مطلوب"),
    endsAt: z.string().min(1, "مطلوب"),
    isActive: z.boolean().default(true),
    sortOrder: z.coerce.number().int().min(0),
    priority: z.coerce.number().int(),
    weight: z.coerce.number().int().min(1),
    rotationMode: z.enum(["PRIORITY", "WEIGHT", "RANDOM"]),
    maxImpressions: z.string().optional(),
    maxClicks: z.string().optional(),
    placements: z.array(z.string()).min(1, "اختر موضعًا واحدًا على الأقل"),
    layout: z.enum([
      "HERO_BANNER",
      "SMALL_BANNER",
      "STRIP_BANNER",
      "SQUARE_CARD",
      "POPUP",
      "COUPON_CARD",
      "FLOATING_BANNER",
      "FLASH_SALE_CARD",
    ]),
    audience: z.enum(["ALL", "GUEST_ONLY", "LOGGED_IN_ONLY"]),
    frequency: z.enum([
      "ALWAYS",
      "ONCE",
      "DAILY",
      "EVERY_LAUNCH",
      "EVERY_SESSION",
      "DISMISS_HOURS",
    ]),
    dismissHours: z.string().optional(),
    targetCities: z.string().optional(),
    targetBranchIds: z.string().optional(),
    targetCategoryIds: z.array(z.string()).default([]),
    targetProductIds: z.array(z.string()).default([]),
    targetOfferIds: z.array(z.string()).default([]),
    targetCouponIds: z.array(z.string()).default([]),
    minCartAmount: z.string().optional(),
    maxCartAmount: z.string().optional(),
    backgroundColor: z.string().optional(),
    gradientFrom: z.string().optional(),
    gradientTo: z.string().optional(),
    badgeTextAr: z.string().optional(),
    badgeTextEn: z.string().optional(),
    discountBadgeAr: z.string().optional(),
    discountBadgeEn: z.string().optional(),
    ctaStyle: z.enum(["PRIMARY", "SECONDARY", "OUTLINE", "TEXT", "PILL"]),
    textAlign: z.enum(["START", "CENTER", "END"]),
    overlayOpacity: z.coerce.number().min(0).max(1),
    cornerRadius: z.coerce.number().int().min(0).max(64),
    destinationType: z.enum([
      "OFFER",
      "CATEGORY",
      "PRODUCT",
      "COUPON",
      "CART",
      "NONE",
      "CHECKOUT",
      "ORDERS",
      "SEARCH",
      "EXTERNAL_URL",
      "INTERNAL_ROUTE",
    ]),
    destinationId: z.string().optional(),
    destinationUrl: z.string().optional(),
    destinationRoute: z.string().optional(),
    autoApplyCoupon: z.boolean().default(false),
  })
  .superRefine((values, ctx) => {
    if (
      DESTINATIONS_WITH_ID.includes(values.destinationType as CampaignDestinationType) &&
      !values.destinationId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["destinationId"],
        message: "اختر الوجهة",
      });
    }
    if (values.destinationType === "EXTERNAL_URL" && !values.destinationUrl?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["destinationUrl"],
        message: "أدخل الرابط",
      });
    }
    if (values.destinationType === "INTERNAL_ROUTE" && !values.destinationRoute?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["destinationRoute"],
        message: "أدخل المسار",
      });
    }
    if (values.frequency === "DISMISS_HOURS") {
      const hours = Number(values.dismissHours);
      if (!Number.isFinite(hours) || hours < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dismissHours"],
          message: "حدد عدد الساعات",
        });
      }
    }
  });

export type CampaignFormValues = z.infer<typeof campaignSchema>;

function toDateTimeLocal(value?: string): string {
  if (!value) return "";
  return value.slice(0, 16);
}

function optionalNumber(value?: string): number | null {
  if (!value?.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function defaultsFromCampaign(campaign?: Campaign): CampaignFormValues {
  if (!campaign) {
    return {
      titleAr: "",
      titleEn: "",
      subtitleAr: "",
      subtitleEn: "",
      buttonLabelAr: "",
      buttonLabelEn: "",
      startsAt: "",
      endsAt: "",
      isActive: true,
      sortOrder: 0,
      priority: 0,
      weight: 1,
      rotationMode: "PRIORITY",
      maxImpressions: "",
      maxClicks: "",
      placements: ["HOME_SLIDER"],
      layout: "HERO_BANNER",
      audience: "ALL",
      frequency: "ALWAYS",
      dismissHours: "",
      targetCities: "",
      targetBranchIds: "",
      targetCategoryIds: [],
      targetProductIds: [],
      targetOfferIds: [],
      targetCouponIds: [],
      minCartAmount: "",
      maxCartAmount: "",
      backgroundColor: "#1B4332",
      gradientFrom: "#1B4332",
      gradientTo: "#40916C",
      badgeTextAr: "",
      badgeTextEn: "",
      discountBadgeAr: "",
      discountBadgeEn: "",
      ctaStyle: "PRIMARY",
      textAlign: "START",
      overlayOpacity: 0.35,
      cornerRadius: 16,
      destinationType: "NONE",
      destinationId: "",
      destinationUrl: "",
      destinationRoute: "",
      autoApplyCoupon: false,
    };
  }

  return {
    titleAr: campaign.titleAr,
    titleEn: campaign.titleEn,
    subtitleAr: campaign.subtitleAr ?? "",
    subtitleEn: campaign.subtitleEn ?? "",
    buttonLabelAr: campaign.buttonLabelAr ?? "",
    buttonLabelEn: campaign.buttonLabelEn ?? "",
    startsAt: toDateTimeLocal(campaign.startsAt),
    endsAt: toDateTimeLocal(campaign.endsAt),
    isActive: campaign.isActive,
    sortOrder: campaign.sortOrder,
    priority: campaign.priority ?? 0,
    weight: campaign.weight ?? 1,
    rotationMode: campaign.rotationMode ?? "PRIORITY",
    maxImpressions: campaign.maxImpressions?.toString() ?? "",
    maxClicks: campaign.maxClicks?.toString() ?? "",
    placements: campaign.placements?.length ? campaign.placements : ["HOME_SLIDER"],
    layout: campaign.layout ?? "HERO_BANNER",
    audience: campaign.audience ?? "ALL",
    frequency: campaign.frequency ?? "ALWAYS",
    dismissHours: campaign.dismissHours?.toString() ?? "",
    targetCities: joinCommaList(campaign.targetCities),
    targetBranchIds: joinCommaList(campaign.targetBranchIds),
    targetCategoryIds: campaign.targetCategoryIds ?? [],
    targetProductIds: campaign.targetProductIds ?? [],
    targetOfferIds: campaign.targetOfferIds ?? [],
    targetCouponIds: campaign.targetCouponIds ?? [],
    minCartAmount: campaign.minCartAmount?.toString() ?? "",
    maxCartAmount: campaign.maxCartAmount?.toString() ?? "",
    backgroundColor: campaign.backgroundColor ?? "",
    gradientFrom: campaign.gradientFrom ?? "",
    gradientTo: campaign.gradientTo ?? "",
    badgeTextAr: campaign.badgeTextAr ?? "",
    badgeTextEn: campaign.badgeTextEn ?? "",
    discountBadgeAr: campaign.discountBadgeAr ?? "",
    discountBadgeEn: campaign.discountBadgeEn ?? "",
    ctaStyle: campaign.ctaStyle ?? "PRIMARY",
    textAlign: campaign.textAlign ?? "START",
    overlayOpacity: campaign.overlayOpacity ?? 0.35,
    cornerRadius: campaign.cornerRadius ?? 16,
    destinationType: campaign.destinationType,
    destinationId: campaign.destinationId ?? "",
    destinationUrl: campaign.destinationUrl ?? "",
    destinationRoute: campaign.destinationRoute ?? "",
    autoApplyCoupon: campaign.autoApplyCoupon ?? false,
  };
}

export function toPayload(values: CampaignFormValues): CampaignPayload {
  return {
    titleAr: values.titleAr,
    titleEn: values.titleEn,
    subtitleAr: values.subtitleAr || null,
    subtitleEn: values.subtitleEn || null,
    buttonLabelAr: values.buttonLabelAr || null,
    buttonLabelEn: values.buttonLabelEn || null,
    startsAt: new Date(values.startsAt).toISOString(),
    endsAt: new Date(values.endsAt).toISOString(),
    isActive: values.isActive,
    sortOrder: values.sortOrder,
    priority: values.priority,
    weight: values.weight,
    rotationMode: values.rotationMode,
    maxImpressions: optionalNumber(values.maxImpressions),
    maxClicks: optionalNumber(values.maxClicks),
    placements: values.placements as CampaignPlacement[],
    layout: values.layout,
    audience: values.audience,
    frequency: values.frequency,
    dismissHours: optionalNumber(values.dismissHours),
    targetCities: splitCommaList(values.targetCities ?? ""),
    targetBranchIds: splitCommaList(values.targetBranchIds ?? ""),
    targetCategoryIds: values.targetCategoryIds,
    targetProductIds: values.targetProductIds,
    targetOfferIds: values.targetOfferIds,
    targetCouponIds: values.targetCouponIds,
    minCartAmount: optionalNumber(values.minCartAmount),
    maxCartAmount: optionalNumber(values.maxCartAmount),
    backgroundColor: values.backgroundColor || null,
    gradientFrom: values.gradientFrom || null,
    gradientTo: values.gradientTo || null,
    badgeTextAr: values.badgeTextAr || null,
    badgeTextEn: values.badgeTextEn || null,
    discountBadgeAr: values.discountBadgeAr || null,
    discountBadgeEn: values.discountBadgeEn || null,
    ctaStyle: values.ctaStyle,
    textAlign: values.textAlign,
    overlayOpacity: values.overlayOpacity,
    cornerRadius: values.cornerRadius,
    destinationType: values.destinationType,
    destinationId: values.destinationId || null,
    destinationUrl: values.destinationUrl || null,
    destinationRoute: values.destinationRoute || null,
    autoApplyCoupon: values.autoApplyCoupon,
  };
}

export function duplicatePayload(campaign: Campaign): CampaignPayload {
  const values = defaultsFromCampaign(campaign);
  values.titleAr = `${values.titleAr} (نسخة)`;
  values.titleEn = `${values.titleEn} (Copy)`;
  values.isActive = false;
  return toPayload(values);
}

export type EditorTab =
  | "content"
  | "design"
  | "placements"
  | "targeting"
  | "schedule"
  | "destination"
  | "analytics";

export const EDITOR_TABS: { id: EditorTab; label: string }[] = [
  { id: "content", label: "المحتوى" },
  { id: "design", label: "التصميم" },
  { id: "placements", label: "المواضع" },
  { id: "targeting", label: "الاستهداف" },
  { id: "schedule", label: "الجدولة" },
  { id: "destination", label: "الوجهة" },
  { id: "analytics", label: "التحليلات" },
];
