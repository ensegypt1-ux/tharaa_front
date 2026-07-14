import apiClient, { type ApiEnvelope } from "./client";
import type { AppSettingRow } from "../types";

export async function listAppSettings(): Promise<AppSettingRow[]> {
  const res = await apiClient.get<ApiEnvelope<AppSettingRow[]>>("/admin/settings");
  return res.data.data;
}

export async function getAppSetting(key: string): Promise<AppSettingRow> {
  const res = await apiClient.get<ApiEnvelope<AppSettingRow>>(`/admin/settings/${encodeURIComponent(key)}`);
  return res.data.data;
}

export async function upsertAppSetting(key: string, value: unknown): Promise<AppSettingRow> {
  const res = await apiClient.put<ApiEnvelope<AppSettingRow>>(`/admin/settings/${encodeURIComponent(key)}`, {
    value,
  });
  return res.data.data;
}

export async function patchBootstrapSettings(
  payload: Record<string, unknown> & { merge?: boolean },
): Promise<AppSettingRow[]> {
  const res = await apiClient.patch<ApiEnvelope<AppSettingRow[]>>("/admin/settings/bootstrap", payload);
  return res.data.data;
}
