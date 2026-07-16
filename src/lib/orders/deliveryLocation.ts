import type { FulfilmentType } from "@/lib/types";

export interface OrderAddressSnapshot {
  label?: string;
  recipientName?: string;
  phone?: string;
  city?: string;
  district?: string;
  street?: string;
  building?: string;
  floor?: string;
  apartment?: string;
  directions?: string;
  formattedAddress?: string;
  googlePlaceId?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
}

export function parseAddressSnapshot(
  snapshot: Record<string, unknown> | null | undefined,
): OrderAddressSnapshot | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  return snapshot as OrderAddressSnapshot;
}

export function parseCoordinate(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function hasValidCoordinates(
  address: OrderAddressSnapshot | null | undefined,
): boolean {
  if (!address) return false;
  const lat = parseCoordinate(address.latitude);
  const lng = parseCoordinate(address.longitude);
  return lat != null && lng != null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function buildMapsUrlFromCoordinates(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function resolveMapsUrl(
  mapsUrl: string | null | undefined,
  address: OrderAddressSnapshot | null | undefined,
): string | null {
  if (mapsUrl?.trim()) return mapsUrl.trim();
  if (!hasValidCoordinates(address)) return null;
  const lat = parseCoordinate(address!.latitude);
  const lng = parseCoordinate(address!.longitude);
  if (lat == null || lng == null) return null;
  return buildMapsUrlFromCoordinates(lat, lng);
}

export function buildGoogleMapsEmbedUrl(lat: number, lng: number): string {
  return `https://maps.google.com/maps?q=${lat},${lng}&hl=ar&z=16&output=embed`;
}

export function canShowDeliveryLocation(
  fulfilmentType: FulfilmentType,
  address: OrderAddressSnapshot | null | undefined,
): boolean {
  return fulfilmentType === "DELIVERY" && Boolean(address);
}

export function canOpenDeliveryMaps(
  fulfilmentType: FulfilmentType,
  mapsUrl: string | null | undefined,
  address: OrderAddressSnapshot | null | undefined,
): boolean {
  return fulfilmentType === "DELIVERY" && Boolean(resolveMapsUrl(mapsUrl, address));
}

export function formatAddressLines(address: OrderAddressSnapshot): string[] {
  const lines: string[] = [];
  if (address.formattedAddress?.trim()) {
    lines.push(address.formattedAddress.trim());
  }
  const structured = [address.district, address.street, address.building, address.floor, address.apartment]
    .filter(Boolean)
    .join("، ");
  if (structured && !lines.includes(structured)) {
    lines.push(structured);
  }
  if (address.city?.trim() && !lines.some((l) => l.includes(address.city!))) {
    lines.push(address.city.trim());
  }
  return lines;
}

export function formatCoordinatesLabel(address: OrderAddressSnapshot): string | null {
  if (!hasValidCoordinates(address)) return null;
  const lat = parseCoordinate(address.latitude);
  const lng = parseCoordinate(address.longitude);
  if (lat == null || lng == null) return null;
  return `${lat}, ${lng}`;
}
