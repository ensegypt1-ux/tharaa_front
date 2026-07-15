import apiClient, { type ApiEnvelope } from "./client";
import type {
  Campaign,
  CampaignAnalyticsSummary,
  CampaignAudience,
  CampaignCtaStyle,
  CampaignDestinationType,
  CampaignFrequency,
  CampaignLayout,
  CampaignPlacement,
  CampaignRotationMode,
  CampaignTextAlign,
} from "../types";

export async function listCampaigns(): Promise<Campaign[]> {
  const res = await apiClient.get<ApiEnvelope<Campaign[]>>("/admin/campaigns");
  return res.data.data;
}

export async function getCampaign(id: string): Promise<Campaign> {
  const res = await apiClient.get<ApiEnvelope<Campaign>>(`/admin/campaigns/${id}`);
  return res.data.data;
}

export async function getCampaignAnalytics(): Promise<CampaignAnalyticsSummary> {
  const res = await apiClient.get<ApiEnvelope<CampaignAnalyticsSummary>>(
    "/admin/campaigns/analytics",
  );
  return res.data.data;
}

export interface CampaignPayload {
  titleAr: string;
  titleEn: string;
  subtitleAr?: string | null;
  subtitleEn?: string | null;
  startsAt: string;
  endsAt: string;
  isActive?: boolean;
  sortOrder?: number;
  priority?: number;
  weight?: number;
  rotationMode?: CampaignRotationMode;
  maxImpressions?: number | null;
  maxClicks?: number | null;
  placements?: CampaignPlacement[];
  layout?: CampaignLayout;
  audience?: CampaignAudience;
  frequency?: CampaignFrequency;
  dismissHours?: number | null;
  targetCities?: string[];
  targetBranchIds?: string[];
  targetCategoryIds?: string[];
  targetProductIds?: string[];
  targetOfferIds?: string[];
  targetCouponIds?: string[];
  minCartAmount?: number | null;
  maxCartAmount?: number | null;
  backgroundColor?: string | null;
  gradientFrom?: string | null;
  gradientTo?: string | null;
  badgeTextAr?: string | null;
  badgeTextEn?: string | null;
  discountBadgeAr?: string | null;
  discountBadgeEn?: string | null;
  ctaStyle?: CampaignCtaStyle;
  textAlign?: CampaignTextAlign;
  overlayOpacity?: number | null;
  cornerRadius?: number | null;
  destinationType: CampaignDestinationType;
  destinationId?: string | null;
  destinationUrl?: string | null;
  destinationRoute?: string | null;
  autoApplyCoupon?: boolean;
  buttonLabelAr?: string | null;
  buttonLabelEn?: string | null;
}

export async function createCampaign(payload: CampaignPayload): Promise<Campaign> {
  const res = await apiClient.post<ApiEnvelope<Campaign>>("/admin/campaigns", payload);
  return res.data.data;
}

export async function updateCampaign(
  id: string,
  payload: Partial<CampaignPayload>,
): Promise<Campaign> {
  const res = await apiClient.patch<ApiEnvelope<Campaign>>(`/admin/campaigns/${id}`, payload);
  return res.data.data;
}

export async function deleteCampaign(id: string): Promise<{ message: string }> {
  const res = await apiClient.delete<ApiEnvelope<{ message: string }>>(
    `/admin/campaigns/${id}`,
  );
  return res.data.data;
}

export async function uploadCampaignImage(
  id: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<Campaign> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await apiClient.post<ApiEnvelope<Campaign>>(
    `/admin/campaigns/${id}/image`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (evt) => {
        if (!onProgress || !evt.total) return;
        onProgress(Math.round((evt.loaded / evt.total) * 100));
      },
    },
  );
  return res.data.data;
}

export async function deleteCampaignImage(id: string): Promise<Campaign> {
  const res = await apiClient.delete<ApiEnvelope<Campaign>>(`/admin/campaigns/${id}/image`);
  return res.data.data;
}

export async function uploadCampaignIcon(
  id: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<Campaign> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await apiClient.post<ApiEnvelope<Campaign>>(
    `/admin/campaigns/${id}/icon`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (evt) => {
        if (!onProgress || !evt.total) return;
        onProgress(Math.round((evt.loaded / evt.total) * 100));
      },
    },
  );
  return res.data.data;
}

export async function deleteCampaignIcon(id: string): Promise<Campaign> {
  const res = await apiClient.delete<ApiEnvelope<Campaign>>(`/admin/campaigns/${id}/icon`);
  return res.data.data;
}
