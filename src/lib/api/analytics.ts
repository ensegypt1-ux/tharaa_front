import apiClient, { type ApiEnvelope } from "./client";
import type {
  AnalyticsCharts,
  AnalyticsOverview,
  AnalyticsRange,
  AnalyticsSortDir,
  SearchAnalyticsResponse,
  SearchAnalyticsSortBy,
  WishlistAnalyticsResponse,
  WishlistAnalyticsSortBy,
} from "../types";

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

export interface SearchAnalyticsQuery {
  page?: number;
  limit?: number;
  q?: string;
  sortBy?: SearchAnalyticsSortBy;
  sortDir?: AnalyticsSortDir;
  recentLimit?: number;
}

export async function getSearchAnalytics(
  params: SearchAnalyticsQuery = {},
): Promise<SearchAnalyticsResponse> {
  const res = await apiClient.get<ApiEnvelope<SearchAnalyticsResponse>>(
    "/admin/analytics/search",
    { params },
  );
  return res.data.data;
}

export interface WishlistAnalyticsQuery {
  page?: number;
  limit?: number;
  q?: string;
  sortBy?: WishlistAnalyticsSortBy;
  sortDir?: AnalyticsSortDir;
}

export async function getWishlistAnalytics(
  params: WishlistAnalyticsQuery = {},
): Promise<WishlistAnalyticsResponse> {
  const res = await apiClient.get<ApiEnvelope<WishlistAnalyticsResponse>>(
    "/admin/analytics/wishlist",
    { params },
  );
  return res.data.data;
}
