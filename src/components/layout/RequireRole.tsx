"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { canAccess, type NavKey } from "@/lib/auth/roles";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ShieldAlert } from "lucide-react";

export function RequireRole({
  navKey,
  children,
}: {
  navKey: NavKey;
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const allowed = canAccess(user?.role, navKey);

  useEffect(() => {
    if (!isLoading && user && !allowed) {
      const timeout = setTimeout(() => router.replace("/dashboard"), 1500);
      return () => clearTimeout(timeout);
    }
  }, [isLoading, user, allowed, router]);

  if (isLoading) return <LoadingState />;

  if (!allowed) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="ليس لديك صلاحية لعرض هذه الصفحة"
        description="جاري إعادة التوجيه إلى النظرة العامة…"
      />
    );
  }

  return <>{children}</>;
}
