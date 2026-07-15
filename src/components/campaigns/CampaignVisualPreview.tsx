"use client";

import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import { CAMPAIGN_CTA_STYLE_AR, CAMPAIGN_LAYOUT_AR } from "@/lib/ar/labels";
import type { CampaignFormValues } from "./campaignForm";

const LAYOUT_HEIGHT: Record<string, string> = {
  HERO_BANNER: "min-h-[200px] sm:min-h-[240px]",
  SMALL_BANNER: "min-h-[120px]",
  STRIP_BANNER: "min-h-[72px]",
  SQUARE_CARD: "aspect-square min-h-[180px] max-w-[280px] mx-auto",
  POPUP: "min-h-[220px] max-w-sm mx-auto",
  COUPON_CARD: "min-h-[140px] max-w-md mx-auto",
  FLOATING_BANNER: "min-h-[64px] max-w-xs me-auto",
  FLASH_SALE_CARD: "min-h-[160px] max-w-md mx-auto",
};

function ctaClass(style: string): string {
  switch (style) {
    case "SECONDARY":
      return "bg-cream text-charcoal";
    case "OUTLINE":
      return "border border-white/80 bg-transparent text-white";
    case "TEXT":
      return "bg-transparent text-white underline underline-offset-2";
    case "PILL":
      return "rounded-full bg-amber-400 text-charcoal";
    default:
      return "bg-white text-charcoal";
  }
}

export function CampaignVisualPreview({
  values,
  imageUrl,
  className,
}: {
  values: CampaignFormValues;
  imageUrl?: string | null;
  className?: string;
}) {
  const bg =
    values.gradientFrom && values.gradientTo
      ? `linear-gradient(135deg, ${values.gradientFrom}, ${values.gradientTo})`
      : values.backgroundColor || "#1B4332";

  const align =
    values.textAlign === "CENTER"
      ? "center"
      : values.textAlign === "END"
        ? "right"
        : "left";

  const isStrip = values.layout === "STRIP_BANNER" || values.layout === "FLOATING_BANNER";
  const isCoupon = values.layout === "COUPON_CARD";
  const isFlash = values.layout === "FLASH_SALE_CARD";

  return (
    <div className={cn("w-full min-w-0", className)}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-charcoal-soft">
        <span>معاينة حية · {CAMPAIGN_LAYOUT_AR[values.layout]}</span>
        <span>{CAMPAIGN_CTA_STYLE_AR[values.ctaStyle]}</span>
      </div>
      <div
        className={cn(
          "relative w-full overflow-hidden border border-border-soft shadow-sm",
          LAYOUT_HEIGHT[values.layout] ?? "min-h-[180px]",
          values.layout === "POPUP" && "ring-4 ring-black/20",
          isCoupon && "border-dashed border-2",
        )}
        style={{
          background: bg,
          borderRadius: values.cornerRadius ?? 16,
          textAlign: align,
        }}
      >
        {imageUrl && (
          <Image
            src={imageUrl}
            alt=""
            fill
            unoptimized
            className={cn("object-cover", isStrip ? "opacity-90" : "opacity-100")}
          />
        )}
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: values.overlayOpacity ?? 0.35 }}
        />
        <div
          className={cn(
            "relative z-[1] flex h-full flex-col justify-end gap-2 p-4 text-white",
            isStrip && "flex-row items-center justify-between gap-3 py-3",
            values.layout === "SQUARE_CARD" && "justify-center items-stretch",
          )}
        >
          <div className={cn("min-w-0 space-y-1.5", isStrip && "flex-1")}>
            {(values.badgeTextAr || values.discountBadgeAr || isFlash) && (
              <div
                className={cn(
                  "flex flex-wrap gap-1.5",
                  align === "center" && "justify-center",
                  align === "right" && "justify-end",
                )}
              >
                {values.badgeTextAr && (
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] backdrop-blur-sm">
                    {values.badgeTextAr}
                  </span>
                )}
                {(values.discountBadgeAr || isFlash) && (
                  <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-semibold text-charcoal">
                    {values.discountBadgeAr || "تخفيض سريع"}
                  </span>
                )}
              </div>
            )}
            <p
              className={cn(
                "font-semibold leading-snug",
                isStrip ? "text-sm" : "text-lg sm:text-xl",
              )}
            >
              {values.titleAr || "عنوان الحملة"}
            </p>
            {values.subtitleAr && !isStrip && (
              <p className="text-sm text-white/85 line-clamp-2">{values.subtitleAr}</p>
            )}
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 items-center justify-center px-3 py-1.5 text-xs font-medium",
              values.ctaStyle === "PILL" ? "rounded-full" : "rounded-md",
              ctaClass(values.ctaStyle),
            )}
          >
            {values.buttonLabelAr || "تسوّق الآن"}
          </span>
        </div>
      </div>
    </div>
  );
}
