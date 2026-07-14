import apiClient, { type ApiEnvelope } from "./client";
import type { AnalyticsCharts, AnalyticsOverview, AnalyticsRange } from "../types";

export interface AnalyticsQuery {
  range?: AnalyticsRange;
  from?: string;
  to?: string;
}

export async function getAnalyticsOverview(params: AnalyticsQuery): Promise<AnalyticsOverview> {
  const res = await apiClient.get<ApiEnvelope<AnalyticsOverview>>("/admin/analytics/overview", { params });
  return res.data.data;
}

export async function getAnalyticsCharts(params: AnalyticsQuery): Promise<AnalyticsCharts> {
  const res = await apiClient.get<ApiEnvelope<AnalyticsCharts>>("/admin/analytics/charts", { params });
  return res.data.data;
}
