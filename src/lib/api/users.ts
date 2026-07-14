import apiClient, { type ApiEnvelope } from "./client";
import type { AuthUser } from "../auth/types";

export async function getMe(): Promise<AuthUser> {
  const res = await apiClient.get<ApiEnvelope<AuthUser>>("/users/me");
  return res.data.data;
}
