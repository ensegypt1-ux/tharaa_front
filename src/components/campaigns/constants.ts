import type {
  CampaignAudience,
  CampaignCtaStyle,
  CampaignDestinationType,
  CampaignFrequency,
  CampaignLayout,
  CampaignPlacement,
  CampaignRotationMode,
  CampaignTextAlign,
} from "@/lib/types";

export const ALL_PLACEMENTS: CampaignPlacement[] = [
  "HOME_HERO",
  "HOME_SLIDER",
  "HOME_STRIP",
  "HOME_CATEGORY_STRIP",
  "HOME_MIDDLE",
  "HOME_BOTTOM",
  "CATEGORY_TOP",
  "CATEGORY_INLINE",
  "PRODUCT_TOP",
  "PRODUCT_AFTER_IMAGES",
  "PRODUCT_BEFORE_DESCRIPTION",
  "PRODUCT_BOTTOM",
  "OFFERS_TOP",
  "SEARCH_TOP",
  "CART_TOP",
  "CART_BOTTOM",
  "CHECKOUT_TOP",
  "CHECKOUT_BOTTOM",
  "ORDER_SUCCESS",
];

export const ALL_LAYOUTS: CampaignLayout[] = [
  "HERO_BANNER",
  "SMALL_BANNER",
  "STRIP_BANNER",
  "SQUARE_CARD",
  "POPUP",
  "COUPON_CARD",
  "FLOATING_BANNER",
  "FLASH_SALE_CARD",
];

export const DESTINATIONS_WITH_ID: CampaignDestinationType[] = [
  "OFFER",
  "CATEGORY",
  "PRODUCT",
  "COUPON",
];

export const ALL_DESTINATIONS: CampaignDestinationType[] = [
  "NONE",
  "PRODUCT",
  "CATEGORY",
  "OFFER",
  "COUPON",
  "CART",
  "CHECKOUT",
  "ORDERS",
  "SEARCH",
  "EXTERNAL_URL",
  "INTERNAL_ROUTE",
];

export const ALL_AUDIENCES: CampaignAudience[] = ["ALL", "GUEST_ONLY", "LOGGED_IN_ONLY"];

export const ALL_FREQUENCIES: CampaignFrequency[] = [
  "ALWAYS",
  "ONCE",
  "DAILY",
  "EVERY_LAUNCH",
  "EVERY_SESSION",
  "DISMISS_HOURS",
];

export const ALL_ROTATIONS: CampaignRotationMode[] = ["PRIORITY", "WEIGHT", "RANDOM"];

export const ALL_CTA_STYLES: CampaignCtaStyle[] = [
  "PRIMARY",
  "SECONDARY",
  "OUTLINE",
  "TEXT",
  "PILL",
];

export const ALL_TEXT_ALIGNS: CampaignTextAlign[] = ["START", "CENTER", "END"];

export function splitCommaList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function joinCommaList(values?: string[] | null): string {
  return (values ?? []).join(", ");
}
