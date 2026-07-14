import apiClient, { type ApiEnvelope } from "./client";
import type { Coupon, CouponApplicability, DiscountType, Meta } from "../types";

export interface ListCouponsResult {
  items: Coupon[];
  meta: Meta;
}

export async function listCoupons(params: { page?: number; limit?: number }): Promise<ListCouponsResult> {
  const res = await apiClient.get<ApiEnvelope<ListCouponsResult>>("/admin/coupons", { params });
  return res.data.data;
}

export async function getCoupon(id: string): Promise<Coupon> {
  const res = await apiClient.get<ApiEnvelope<Coupon>>(`/admin/coupons/${id}`);
  return res.data.data;
}

export interface CouponPayload {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  startsAt: string;
  expiresAt: string;
  applicability?: CouponApplicability;
  isActive?: boolean;
}

export async function createCoupon(payload: CouponPayload): Promise<Coupon> {
  const res = await apiClient.post<ApiEnvelope<Coupon>>("/admin/coupons", payload);
  return res.data.data;
}

export async function updateCoupon(id: string, payload: Partial<CouponPayload>): Promise<Coupon> {
  const res = await apiClient.patch<ApiEnvelope<Coupon>>(`/admin/coupons/${id}`, payload);
  return res.data.data;
}

export async function deleteCoupon(id: string): Promise<{ message: string }> {
  const res = await apiClient.delete<ApiEnvelope<{ message: string }>>(`/admin/coupons/${id}`);
  return res.data.data;
}
