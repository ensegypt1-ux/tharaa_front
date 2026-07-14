import apiClient, { type ApiEnvelope } from "./client";
import type { AuditLogEntry, Meta } from "../types";

export interface ListAuditLogsParams {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
  userId?: string;
  from?: string;
  to?: string;
}

export async function listAuditLogs(params: ListAuditLogsParams): Promise<{ data: AuditLogEntry[]; meta: Meta }> {
  const res = await apiClient.get<ApiEnvelope<AuditLogEntry[]>>("/admin/audit-logs", { params });
  return { data: res.data.data, meta: res.data.meta as unknown as Meta };
}
