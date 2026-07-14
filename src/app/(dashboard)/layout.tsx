"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isStaffRole } from "@/lib/auth/roles";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";
import { LoadingState } from "@/components/ui/LoadingState";
import { clearSession } from "@/lib/auth/storage";
import { COMMON_AR } from "@/lib/ar/labels";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!isStaffRole(user.role)) {
      clearSession();
      router.replace("/login?sessionExpired=1");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user || !isStaffRole(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <LoadingState label={COMMON_AR.loadingDashboard} />
      </div>
    );
  }

  // With html[dir=rtl], first flex child (Sidebar) sits on the right.
  return (
    <div className="flex min-h-screen bg-cream">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <TopNav />
        <main className="page-shell flex-1 px-[var(--page-pad-x)] py-[var(--page-pad-y)]">{children}</main>
      </div>
    </div>
  );
}
