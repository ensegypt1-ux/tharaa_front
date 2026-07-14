import apiClient, { type ApiEnvelope } from "./client";
import type { Meta, Review, ReviewStatus } from "../types";

export interface ListReviewsResult {
  items: Review[];
  meta: Meta;
}

export async function listReviews(params: {
  page?: number;
  limit?: number;
  status?: ReviewStatus;
}): Promise<ListReviewsResult> {
  const res = await apiClient.get<ApiEnvelope<ListReviewsResult>>("/admin/reviews", { params });
  return res.data.data;
}

export async function approveReview(id: string): Promise<Review> {
  const res = await apiClient.patch<ApiEnvelope<Review>>(`/admin/reviews/${id}/approve`);
  return res.data.data;
}

export async function rejectReview(id: string): Promise<Review> {
  const res = await apiClient.patch<ApiEnvelope<Review>>(`/admin/reviews/${id}/reject`);
  return res.data.data;
}

export async function hideReview(id: string): Promise<Review> {
  const res = await apiClient.patch<ApiEnvelope<Review>>(`/admin/reviews/${id}/hide`);
  return res.data.data;
}

export async function showReview(id: string): Promise<Review> {
  const res = await apiClient.patch<ApiEnvelope<Review>>(`/admin/reviews/${id}/show`);
  return res.data.data;
}
