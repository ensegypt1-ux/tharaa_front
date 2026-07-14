/* eslint-disable @typescript-eslint/no-explicit-any */
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

/**
 * RHF + Zod helper that sidesteps zod coerce input/output Resolver mismatches.
 */
export function useZodForm(schema: unknown, options?: Record<string, unknown>): any {
  return useForm({
    ...(options as object),
    resolver: zodResolver(schema as any) as any,
  });
}
