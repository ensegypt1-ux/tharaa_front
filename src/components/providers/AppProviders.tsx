"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { ToasterProvider } from "@/components/ui/Toaster";
import { AdminRealtimeProvider } from "@/components/realtime/AdminRealtimeProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToasterProvider>
          <AdminRealtimeProvider>{children}</AdminRealtimeProvider>
        </ToasterProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
