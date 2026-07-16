"use client";

import { ExternalLink, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  buildGoogleMapsEmbedUrl,
  formatCoordinatesLabel,
  hasValidCoordinates,
  parseCoordinate,
  resolveMapsUrl,
  type OrderAddressSnapshot,
} from "@/lib/orders/deliveryLocation";

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) return null;
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
      <span className="shrink-0 text-xs text-charcoal-soft">{label}</span>
      <span className="min-w-0 text-sm text-charcoal sm:text-end">{value}</span>
    </div>
  );
}

export function DeliveryLocationSection({
  address,
  mapsUrl,
  compact = false,
}: {
  address: OrderAddressSnapshot;
  mapsUrl?: string | null;
  compact?: boolean;
}) {
  const openUrl = resolveMapsUrl(mapsUrl, address);
  const hasCoords = hasValidCoordinates(address);
  const lat = parseCoordinate(address.latitude);
  const lng = parseCoordinate(address.longitude);
  const coordsLabel = formatCoordinatesLabel(address);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="size-4 text-amber-700" />
          موقع التوصيل
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="space-y-2.5">
          <DetailRow label="اسم المستلم" value={address.recipientName} />
          <DetailRow label="رقم الهاتف" value={address.phone} />
          <DetailRow label="العنوان الكامل" value={address.formattedAddress} />
          <DetailRow label="الحي" value={address.district} />
          <DetailRow label="الشارع" value={address.street} />
          <DetailRow label="المبنى" value={address.building} />
          <DetailRow label="الطابق" value={address.floor} />
          <DetailRow label="الشقة" value={address.apartment} />
          <DetailRow label="إرشادات التوصيل" value={address.directions} />
        </div>

        {!hasCoords && (
          <p className="rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-charcoal-soft">
            الموقع الدقيق على الخريطة غير متوفر لهذا الطلب. يُعرض العنوان النصي فقط.
          </p>
        )}

        {hasCoords && lat != null && lng != null && !compact && (
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border-soft">
            <iframe
              title="معاينة موقع التوصيل"
              src={buildGoogleMapsEmbedUrl(lat, lng)}
              className="h-52 w-full border-0 sm:h-60"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            {coordsLabel && (
              <p className="border-t border-border-soft bg-cream/50 px-3 py-2 text-xs text-charcoal-soft ltr-field">
                {coordsLabel}
              </p>
            )}
          </div>
        )}

        {openUrl && (
          <Button
            className="w-full sm:w-auto"
            onClick={() => window.open(openUrl, "_blank", "noopener,noreferrer")}
          >
            <ExternalLink className="size-4" />
            فتح الموقع في خرائط Google
          </Button>
        )}
      </CardBody>
    </Card>
  );
}
