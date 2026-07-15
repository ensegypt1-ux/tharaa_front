import type { UserRole } from "./types";

export type NavKey =
  | "overview"
  | "orders"
  | "categories"
  | "products"
  | "inventory"
  | "missingImages"
  | "offers"
  | "coupons"
  | "campaigns"
  | "customers"
  | "reviews"
  | "notifications"
  | "delivery"
  | "settings"
  | "activity";

const ROLE_ACCESS: Record<UserRole, NavKey[] | "all"> = {
  ADMIN: "all",
  MANAGER: [
    "overview",
    "orders",
    "categories",
    "products",
    "inventory",
    "missingImages",
    "offers",
    "coupons",
    "campaigns",
    "customers",
    "reviews",
    "notifications",
    "delivery",
    "activity",
  ],
  EMPLOYEE: ["overview", "orders"],
  CUSTOMER: [],
};

const ALL_NAV_KEYS: NavKey[] = [
  "overview",
  "orders",
  "categories",
  "products",
  "inventory",
  "missingImages",
  "offers",
  "coupons",
  "campaigns",
  "customers",
  "reviews",
  "notifications",
  "delivery",
  "settings",
  "activity",
];

export function canAccess(role: UserRole | undefined, key: NavKey): boolean {
  if (!role) return false;
  const access = ROLE_ACCESS[role];
  if (access === "all") return true;
  return access.includes(key);
}

export function accessibleNavKeys(role: UserRole | undefined): NavKey[] {
  if (!role) return [];
  const access = ROLE_ACCESS[role];
  if (access === "all") return ALL_NAV_KEYS;
  return access;
}

export function isStaffRole(role: string | undefined): role is UserRole {
  return role === "ADMIN" || role === "MANAGER" || role === "EMPLOYEE";
}

export function canCancelOrder(role: UserRole | undefined): boolean {
  return role === "ADMIN" || role === "MANAGER";
}
