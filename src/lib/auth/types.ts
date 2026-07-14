export type UserRole = "ADMIN" | "MANAGER" | "EMPLOYEE" | "CUSTOMER";

export type AccountStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export type Locale = "ar" | "en";

export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string;
  role: UserRole;
  status: AccountStatus;
  locale: Locale;
  avatarUrl: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface LoginResponse extends AuthTokens {
  user: AuthUser;
}

export const STAFF_ROLES: UserRole[] = ["ADMIN", "MANAGER", "EMPLOYEE"];
