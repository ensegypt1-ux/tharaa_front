import {
  LayoutDashboard,
  ShoppingCart,
  FolderTree,
  Package,
  Boxes,
  ImageOff,
  Tag,
  Ticket,
  Megaphone,
  Users,
  Star,
  Bell,
  Truck,
  Settings,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import type { NavKey } from "@/lib/auth/roles";

export interface NavItem {
  key: NavKey;
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { key: "overview", label: "نظرة عامة", href: "/dashboard", icon: LayoutDashboard },
  { key: "orders", label: "الطلبات", href: "/orders", icon: ShoppingCart },
  { key: "categories", label: "الأقسام", href: "/categories", icon: FolderTree },
  { key: "products", label: "المنتجات", href: "/products", icon: Package },
  { key: "inventory", label: "المخزون", href: "/inventory", icon: Boxes },
  { key: "missingImages", label: "المنتجات بدون صور", href: "/products/missing-images", icon: ImageOff },
  { key: "offers", label: "العروض", href: "/offers", icon: Tag },
  { key: "coupons", label: "الكوبونات", href: "/coupons", icon: Ticket },
  { key: "campaigns", label: "الحملات", href: "/campaigns", icon: Megaphone },
  { key: "customers", label: "العملاء", href: "/customers", icon: Users },
  { key: "reviews", label: "التقييمات", href: "/reviews", icon: Star },
  { key: "notifications", label: "الإشعارات", href: "/notifications", icon: Bell },
  { key: "delivery", label: "التوصيل والاستلام", href: "/delivery", icon: Truck },
  { key: "settings", label: "إعدادات التطبيق", href: "/settings", icon: Settings },
  { key: "activity", label: "سجل النشاط", href: "/activity", icon: ScrollText },
];
