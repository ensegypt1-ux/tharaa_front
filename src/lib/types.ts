// Shared domain types mirrored from the Tharaa Market API.

export interface Meta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Category {
  id: string;
  parentId?: string | null;
  nameAr: string;
  nameEn: string;
  imageUrl: string | null;
  imagePath?: string | null;
  hasImage?: boolean;
  sortOrder: number;
  isActive: boolean;
  productCount?: number;
  activeProductCount?: number;
  inactiveProductCount?: number;
  outOfStockProductCount?: number;
  parentNameAr?: string | null;
  parentNameEn?: string | null;
  childrenCount?: number;
  childrenProductCount?: number;
  totalProductCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryStats {
  categoryId: string;
  productCount: number;
  activeProductCount: number;
  inactiveProductCount: number;
  outOfStockProductCount: number;
  averageProductPrice: number;
  lowestPrice: number | null;
  highestPrice: number | null;
  lastUpdatedProduct: {
    id: string;
    nameAr: string;
    nameEn: string;
    updatedAt: string;
  } | null;
}

export interface ProductImage {
  id: string;
  path: string;
  url: string;
  sortOrder: number;
  isPrimary: boolean;
  sourceUrl: string | null;
  attribution: string | null;
  photographer: string | null;
  sourceProvider: string | null;
}

export interface InventorySummary {
  quantity: number;
  reservedQuantity: number;
  available: number;
}

export interface ProductVariant {
  id: string;
  productId?: string;
  nameAr: string;
  nameEn: string;
  sku: string | null;
  price: number;
  salePrice: number | null;
  isActive: boolean;
  sortOrder: number;
  effectivePrice?: number;
  inventory: InventorySummary | null;
}

export interface Product {
  id: string;
  categoryId: string;
  category?: { id: string; nameAr: string; nameEn: string } | null;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  sku: string | null;
  unit: string;
  hasVariants: boolean;
  regularPrice: number;
  salePrice: number | null;
  isActive: boolean;
  isFeatured: boolean;
  isBestSeller: boolean;
  lowStockThreshold: number;
  ratingAverage: number;
  ratingCount: number;
  effectivePrice?: number;
  imageCount?: number;
  images: ProductImage[];
  variants: ProductVariant[];
  inventory: InventorySummary | null;
  availableQuantity: number;
  createdAt: string;
  updatedAt: string;
}

export type FulfilmentType = "DELIVERY" | "PICKUP";
export type PaymentMethod = "CASH_ON_DELIVERY";
export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "OUT_FOR_DELIVERY"
  | "COMPLETED"
  | "CANCELLED";

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  variantId: string | null;
  productNameAr: string;
  productNameEn: string;
  variantNameAr: string | null;
  variantNameEn: string | null;
  unit: string;
  sku: string | null;
  imagePath: string | null;
  unitPrice: number | string;
  lineDiscount: number | string;
  lineTotal: number | string;
  quantity: number;
}

export interface OrderStatusHistoryEntry {
  id: string;
  orderId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  changedByUserId: string | null;
  note: string | null;
  createdAt: string;
  changedBy?: { id: string; fullName: string; role: string } | null;
}

export interface OrderCustomerSummary {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  role?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus;
  fulfilmentType: FulfilmentType;
  paymentMethod: PaymentMethod;
  subtotal: number | string;
  discountAmount: number | string;
  deliveryFee: number | string;
  total: number | string;
  couponSnapshot: Record<string, unknown> | null;
  addressSnapshot: Record<string, unknown> | null;
  storeSnapshot: Record<string, unknown> | null;
  customerNote: string | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  confirmedAt: string | null;
  completedAt: string | null;
  estimatedReadyAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  statusHistory?: OrderStatusHistoryEntry[];
  user?: OrderCustomerSummary;
  notifications?: NotificationItem[];
  allowedTransitions?: OrderStatus[];
  printable?: OrderPrintable;
}

export interface OrderPrintable {
  orderNumber: string;
  createdAt: string;
  status: OrderStatus;
  fulfilmentType: FulfilmentType;
  paymentMethod: PaymentMethod;
  customer: {
    fullName: string;
    phone: string | null;
    email: string | null;
  };
  address: Record<string, unknown> | null;
  store: Record<string, unknown> | null;
  coupon: Record<string, unknown> | null;
  customerNote: string | null;
  items: Array<{
    productNameAr: string;
    productNameEn: string;
    variantNameAr: string | null;
    variantNameEn: string | null;
    sku: string | null;
    unit: string;
    quantity: number;
    unitPrice: number | string;
    lineDiscount: number | string;
    lineTotal: number | string;
  }>;
  subtotal: number | string;
  discountAmount: number | string;
  deliveryFee: number | string;
  total: number | string;
}

export type DiscountType = "PERCENTAGE" | "FIXED";
export type OfferScope = "PRODUCT" | "CATEGORY";

export interface Offer {
  id: string;
  titleAr: string;
  titleEn: string;
  scope: OfferScope;
  discountType: DiscountType;
  discountValue: number;
  categoryId: string | null;
  productIds: string[];
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  imageUrl: string | null;
  imagePath?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type CouponApplicability = "ALL" | "DELIVERY_ONLY" | "PICKUP_ONLY";

export interface Coupon {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number | string;
  minOrderAmount: number | string | null;
  maxDiscountAmount: number | string | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  startsAt: string;
  expiresAt: string;
  applicability: CouponApplicability;
  isActive: boolean;
  usageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export type AccountStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type Locale = "ar" | "en";

export interface CustomerListItem {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  status: AccountStatus;
  locale: Locale;
  orderCount: number;
  reviewCount: number;
  totalSpend: number;
  lastOrderAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerAddress {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  city: string;
  district: string;
  street: string;
  building: string | null;
  floor: string | null;
  apartment: string | null;
  directions?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isDefault: boolean;
}

export interface CustomerDetail {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  status: AccountStatus;
  locale: Locale;
  emailVerifiedAt: string | null;
  phoneVerifiedAt: string | null;
  orderCount: number;
  reviewCount: number;
  notificationCount: number;
  addressCount?: number;
  couponUsageCount?: number;
  deviceCount?: number;
  totalSpend: number;
  lastOrderAt: string | null;
  lastLoginAt?: string | null;
  lastActivityAt?: string | null;
  createdAt: string;
  updatedAt: string;
  addresses: CustomerAddress[];
  orders: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    fulfilmentType: FulfilmentType;
    total: number;
    createdAt: string;
  }[];
  reviews: {
    id: string;
    rating: number;
    comment: string | null;
    status: string;
    isVisible: boolean;
    createdAt: string;
    product: { id: string; nameAr: string; nameEn: string };
    orderId?: string;
  }[];
  notifications: {
    id: string;
    type?: string;
    titleAr?: string;
    titleEn: string;
    bodyAr?: string;
    bodyEn: string;
    isRead: boolean;
    createdAt: string;
    orderId?: string | null;
    productId?: string | null;
  }[];
}

export interface CustomerSummary {
  orderCount: number;
  completedOrders: number;
  cancelledOrders: number;
  inProgressOrders: number;
  totalSpend: number;
  averageOrderValue: number;
  lastOrderAt: string | null;
  lastOrder: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    total: number;
    createdAt: string;
  } | null;
  addressCount: number;
  reviewCount: number;
  couponUsageCount: number;
  ordersByStatus: { status: OrderStatus; count: number }[];
}

export interface CustomerAnalytics {
  spendOverTime: { date: string; spend: number }[];
  ordersOverTime: { date: string; count: number }[];
  ordersByStatus: { status: OrderStatus; count: number }[];
  deliveryVersusPickup: { fulfilmentType: FulfilmentType; count: number }[];
  averageOrderValue: number;
  cancellationRate: number;
  topProducts: {
    productId: string;
    nameAr: string;
    nameEn: string;
    quantity: number;
    revenue: number;
  }[];
  topCategories: {
    categoryId: string;
    nameAr: string;
    nameEn: string;
    quantity: number;
    revenue: number;
  }[];
  topCoupons: { code: string; usages: number; discount: number }[];
  last30Days: { orders: number; spend: number; averageOrderValue: number };
  previous30Days: { orders: number; spend: number; averageOrderValue: number };
}

export interface CustomerOrderRow {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  fulfilmentType: FulfilmentType;
  paymentMethod: PaymentMethod;
  itemCount: number;
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  total: number;
  couponCode: string | null;
  cancellationReason: string | null;
  createdAt: string;
}

export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface Review {
  id: string;
  productId: string;
  userId: string;
  orderItemId: string;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; fullName: string; email: string | null; phone: string | null };
  product?: { id: string; nameAr: string; nameEn: string };
  orderItem?: { id: string; orderId: string };
}

export type NotificationType = "ORDER_STATUS" | "OFFER" | "ADMIN" | "SYSTEM";

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  user?: { id: string; fullName: string; email: string | null; phone: string | null };
}

export interface DeliverySettings {
  id: string;
  isEnabled: boolean;
  fee: number | string;
  freeDeliveryThreshold: number | string | null;
  minOrderAmount: number | string;
  estimatedMinutesMin: number;
  estimatedMinutesMax: number;
  serviceCity: string;
  createdAt: string;
  updatedAt: string;
}

export interface PickupSettings {
  id: string;
  isEnabled: boolean;
  minOrderAmount: number | string;
  estimatedMinutesMin: number;
  estimatedMinutesMax: number;
  storeNameAr: string;
  storeNameEn: string;
  addressAr: string;
  addressEn: string;
  latitude: number | string;
  longitude: number | string;
  workingHoursJson: Record<string, { open: string; close: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettingRow {
  key: string;
  value: unknown;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  userRole: string | null;
  userEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  previousValues: unknown;
  newValues: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export type InventoryMovementType =
  | "MANUAL_IN"
  | "MANUAL_OUT"
  | "ORDER_CONFIRM"
  | "ORDER_CANCEL"
  | "ADJUSTMENT";

export interface InventoryRow {
  id: string;
  productId: string | null;
  variantId: string | null;
  productNameAr: string | null;
  productNameEn: string | null;
  variantNameAr: string | null;
  variantNameEn: string | null;
  sku: string | null;
  categoryId: string | null;
  categoryNameAr: string | null;
  categoryNameEn: string | null;
  quantity: number;
  reservedQuantity: number;
  available: number;
  lowStockThreshold: number;
  stockStatus: "IN_STOCK" | "LOW" | "OUT";
  updatedAt: string;
}

export interface InventoryMovement {
  id: string;
  inventoryId: string;
  type: InventoryMovementType;
  quantityChange: number;
  quantityAfter: number;
  orderId: string | null;
  note: string | null;
  createdByUserId: string | null;
  createdAt: string;
  createdBy?: { id: string; fullName: string; email: string | null; role: string } | null;
  inventory?: { id: string; productId: string | null; variantId: string | null };
}

export interface MissingImageProduct {
  id: string;
  nameAr: string;
  nameEn: string;
  sku: string | null;
  category: { id: string; nameAr: string; nameEn: string } | null;
  isActive: boolean;
  adminImageReviewedAt: string | null;
  updatedAt: string;
}

export interface PexelsSearchResult {
  id: string;
  width: number;
  height: number;
  alt: string;
  photographer: string;
  photographerUrl: string;
  sourceUrl: string;
  previewUrl: string;
  imageUrl: string;
  sourceProvider: string;
}

export interface PexelsSearchResponse {
  query: string;
  productId?: string;
  page: number;
  perPage: number;
  total: number;
  results: PexelsSearchResult[];
}

export type AnalyticsRange =
  | "today"
  | "last7"
  | "last7Days"
  | "last30"
  | "last30Days"
  | "thisMonth"
  | "custom";

export interface AnalyticsOverview {
  range: { from: string; to: string };
  summary: {
    totalOrders: number;
    ordersToday: number;
    pendingOrders: number;
    confirmedOrders: number;
    preparingOrders: number;
    readyOrders: number;
    outForDeliveryOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    totalSales: number;
    salesToday: number;
    salesThisWeek: number;
    salesThisMonth: number;
    averageOrderValue: number;
    ordersInRange: number;
    totalCustomers: number;
    newCustomers: number;
    activeProducts: number;
    inactiveProducts?: number;
    outOfStockProducts: number;
    lowStockProducts: number;
    activeOffers: number;
    activeCoupons: number;
    pendingReviews: number;
  };
}

export interface AnalyticsCharts {
  range: { from: string; to: string };
  dailySales: { date: string; orders: number; sales: number }[];
  weeklySales: { key: string; orders: number; sales: number }[];
  monthlySales: { key: string; orders: number; sales: number }[];
  revenueByDay: { date: string; orders: number; sales: number }[];
  ordersByStatus: { status: OrderStatus; count: number }[];
  ordersByFulfilment: { fulfilmentType: FulfilmentType; count: number; revenue: number }[];
  deliveryVersusPickup: { fulfilmentType: FulfilmentType; count: number }[];
  topSellingProducts: { productId: string; nameAr: string; nameEn: string; quantity: number; revenue: number }[];
  topCategories: { categoryId: string; nameAr: string; nameEn: string; quantity: number; revenue: number }[];
  couponUsage: { date: string; usages: number; discount: number }[];
  newCustomersOverTime: { date: string; count: number }[];
  cancellationRate: number;
}
