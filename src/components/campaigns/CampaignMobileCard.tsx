"use client";

import Image from "next/image";
import {
  Copy,
  Eye,
  ImageIcon,
  Pencil,
  Trash2,
} from "lucide-react";
import { Badge, SchedulePhaseBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { CAMPAIGN_LAYOUT_AR, CAMPAIGN_PLACEMENT_AR, COMMON_AR } from "@/lib/ar/labels";
import type { Campaign } from "@/lib/types";
import { formatDateTime, formatNumber, getSchedulePhase } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export function CampaignMobileCard({
  campaign,
  selected,
  onSelect,
  destinationLabel,
  onEdit,
  onDelete,
  onToggle,
  onDuplicate,
  onPreview,
  toggling,
}: {
  campaign: Campaign;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  destinationLabel: string;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onDuplicate: () => void;
  onPreview: () => void;
  toggling?: boolean;
}) {
  const phase = getSchedulePhase(campaign.isActive, campaign.startsAt, campaign.endsAt);

  return (
    <article
      className={cn(
        "rounded-[var(--radius-xl)] border border-border-soft bg-surface p-3 shadow-[var(--shadow-xs)]",
        selected && "border-amber-400 bg-amber-50/40",
      )}
    >
      <div className="flex gap-3">
        <label className="flex shrink-0 pt-1">
          <input
            type="checkbox"
            className="size-5 accent-amber-500"
            checked={selected}
            onChange={(e) => onSelect(e.target.checked)}
            aria-label="تحديد الحملة"
          />
        </label>
        <div className="relative size-16 shrink-0 overflow-hidden rounded-[var(--radius-md)] border border-border-soft bg-cream">
          {campaign.imageUrl ? (
            <Image
              src={campaign.imageUrl}
              alt={campaign.titleAr}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <ImageIcon className="size-5 text-charcoal-soft" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium text-charcoal">{campaign.titleAr}</p>
              <p className="text-xs text-charcoal-soft">
                {CAMPAIGN_LAYOUT_AR[campaign.layout] ?? campaign.layout}
              </p>
            </div>
            <SchedulePhaseBadge phase={phase} />
          </div>
          <div className="flex flex-wrap gap-1">
            {(campaign.placements ?? []).slice(0, 2).map((p) => (
              <Badge key={p} tone="blue">
                {CAMPAIGN_PLACEMENT_AR[p] ?? p}
              </Badge>
            ))}
            {(campaign.placements?.length ?? 0) > 2 && (
              <Badge tone="amber">+{(campaign.placements?.length ?? 0) - 2}</Badge>
            )}
          </div>
          <p className="truncate text-xs text-charcoal-soft">{destinationLabel}</p>
          <div className="grid grid-cols-3 gap-2 text-[11px] text-charcoal-soft">
            <div>
              <span className="block text-charcoal-soft/80">ظهور</span>
              <span className="tabular-nums font-medium text-charcoal">
                {formatNumber(campaign.impressionCount ?? 0)}
              </span>
            </div>
            <div>
              <span className="block text-charcoal-soft/80">نقر</span>
              <span className="tabular-nums font-medium text-charcoal">
                {formatNumber(campaign.clickCount ?? 0)}
              </span>
            </div>
            <div>
              <span className="block text-charcoal-soft/80">CTR</span>
              <span className="tabular-nums font-medium text-charcoal">
                {formatNumber(campaign.ctr ?? 0)}%
              </span>
            </div>
          </div>
          <p className="text-[11px] text-charcoal-soft">
            {formatDateTime(campaign.startsAt)} — {formatDateTime(campaign.endsAt)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border-soft/70 pt-3">
        <Button variant="ghost" size="sm" disabled={toggling} onClick={onToggle}>
          {campaign.isActive ? "تعطيل" : "تفعيل"}
        </Button>
        <IconButton label="معاينة" tone="amber" size="sm" onClick={onPreview}>
          <Eye className="size-4" />
        </IconButton>
        <IconButton label="تكرار" size="sm" onClick={onDuplicate}>
          <Copy className="size-4" />
        </IconButton>
        <IconButton label={COMMON_AR.edit} tone="amber" size="sm" onClick={onEdit}>
          <Pencil className="size-4" />
        </IconButton>
        <IconButton label={COMMON_AR.delete} tone="danger" size="sm" onClick={onDelete}>
          <Trash2 className="size-4" />
        </IconButton>
      </div>
    </article>
  );
}
