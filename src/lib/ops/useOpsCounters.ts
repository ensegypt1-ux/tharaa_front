"use client";

import { useQuery } from "@tanstack/react-query";
import { getAnalyticsOverview } from "@/lib/api/analytics";
import { listMissingImages } from "@/lib/api/productImages";
import { useAuth } from "@/lib/auth/AuthProvider";
import { canAccess } from "@/lib/auth/roles";

export function useOpsCounters() {
  const { user } = useAuth();
  const canOverview = canAccess(user?.role, "overview");
  const canMissing = canAccess(user?.role, "missingImages");
  const canReviews = canAccess(user?.role, "reviews");

  const overviewQuery = useQuery({
    queryKey: ["analytics-overview", { range: "today" }],
    queryFn: () => getAnalyticsOverview({ range: "today" }),
    enabled: canOverview,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const missingQuery = useQuery({
    queryKey: ["missing-images-count"],
    queryFn: () => listMissingImages({ page: 1, limit: 1 }),
    enabled: canMissing,
    staleTime: 60_000,
  });

  const summary = overviewQuery.data?.summary;

  return {
    pendingOrders: summary?.pendingOrders ?? 0,
    preparingOrders: summary?.preparingOrders ?? 0,
    readyOrders: summary?.readyOrders ?? 0,
    pendingReviews: canReviews ? (summary?.pendingReviews ?? 0) : 0,
    missingImages: canMissing ? (missingQuery.data?.meta.total ?? 0) : 0,
    isLoading: overviewQuery.isLoading || missingQuery.isLoading,
  };
}
