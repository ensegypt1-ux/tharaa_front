import apiClient, { type ApiEnvelope } from "./client";
import type { Campaign, CampaignDestinationType } from "../types";

export async function listCampaigns(): Promise<Campaign[]> {
  const res = await apiClient.get<ApiEnvelope<Campaign[]>>("/admin/campaigns");
  return res.data.data;
}

export async function getCampaign(id: string): Promise<Campaign> {
  const res = await apiClient.get<ApiEnvelope<Campaign>>(`/admin/campaigns/${id}`);
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
  destinationType: CampaignDestinationType;
  destinationId?: string | null;
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
