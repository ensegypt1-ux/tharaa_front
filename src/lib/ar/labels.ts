/** Arabic display labels — backend enum values remain unchanged. */

export const ORDER_STATUS_AR: Record<string, string> = {
  PENDING: "قيد الانتظار",
  CONFIRMED: "تم التأكيد",
  PREPARING: "قيد التجهيز",
  READY: "جاهز",
  OUT_FOR_DELIVERY: "خرج للتوصيل",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغي",
};

export const FULFILMENT_AR: Record<string, string> = {
  DELIVERY: "توصيل",
  PICKUP: "استلام من المتجر",
};

export const PAYMENT_AR: Record<string, string> = {
  CASH_ON_DELIVERY: "الدفع عند الاستلام",
};

export const ROLE_AR: Record<string, string> = {
  ADMIN: "مدير النظام",
  MANAGER: "مدير",
  EMPLOYEE: "موظف",
  CUSTOMER: "عميل",
};

export const ACCOUNT_STATUS_AR: Record<string, string> = {
  ACTIVE: "نشط",
  INACTIVE: "غير نشط",
  SUSPENDED: "موقوف",
};

export const REVIEW_STATUS_AR: Record<string, string> = {
  PENDING: "قيد المراجعة",
  APPROVED: "مقبول",
  REJECTED: "مرفوض",
};

export const STOCK_STATUS_AR: Record<string, string> = {
  IN_STOCK: "متوفر",
  LOW: "منخفض",
  OUT: "غير متوفر",
};

export const DISCOUNT_TYPE_AR: Record<string, string> = {
  PERCENTAGE: "نسبة مئوية",
  FIXED: "مبلغ ثابت",
};

export const OFFER_SCOPE_AR: Record<string, string> = {
  PRODUCT: "منتج",
  CATEGORY: "قسم",
};

export const CAMPAIGN_DESTINATION_AR: Record<string, string> = {
  OFFER: "عرض",
  CATEGORY: "قسم",
  PRODUCT: "منتج",
  COUPON: "كوبون (تطبيق تلقائي اختياري)",
  CART: "السلة",
  CHECKOUT: "الدفع",
  ORDERS: "طلباتي",
  SEARCH: "البحث",
  EXTERNAL_URL: "رابط خارجي",
  INTERNAL_ROUTE: "مسار داخلي",
  NONE: "بدون وجهة",
};

export const CAMPAIGN_PLACEMENT_AR: Record<string, string> = {
  HOME_HERO: "الرئيسية — بطل",
  HOME_SLIDER: "الرئيسية — سلايدر",
  HOME_STRIP: "الرئيسية — شريط",
  HOME_CATEGORY_STRIP: "الرئيسية — شريط أقسام",
  HOME_MIDDLE: "الرئيسية — وسط",
  HOME_BOTTOM: "الرئيسية — أسفل",
  CATEGORY_TOP: "القسم — أعلى",
  CATEGORY_INLINE: "القسم — داخل القائمة",
  PRODUCT_TOP: "المنتج — أعلى",
  PRODUCT_AFTER_IMAGES: "المنتج — بعد الصور",
  PRODUCT_BEFORE_DESCRIPTION: "المنتج — قبل الوصف",
  PRODUCT_BOTTOM: "المنتج — أسفل",
  OFFERS_TOP: "العروض — أعلى",
  SEARCH_TOP: "البحث — أعلى",
  CART_TOP: "السلة — أعلى",
  CART_BOTTOM: "السلة — أسفل",
  CHECKOUT_TOP: "الدفع — أعلى",
  CHECKOUT_BOTTOM: "الدفع — أسفل",
  ORDER_SUCCESS: "نجاح الطلب",
};

export const CAMPAIGN_LAYOUT_AR: Record<string, string> = {
  HERO_BANNER: "بانر بطل",
  SMALL_BANNER: "بانر صغير",
  STRIP_BANNER: "شريط",
  SQUARE_CARD: "بطاقة مربعة",
  POPUP: "نافذة منبثقة",
  COUPON_CARD: "بطاقة كوبون",
  FLOATING_BANNER: "بانر عائم",
  FLASH_SALE_CARD: "بطاقة تخفيض سريع",
};

export const CAMPAIGN_AUDIENCE_AR: Record<string, string> = {
  ALL: "الجميع",
  GUEST_ONLY: "زوار فقط",
  LOGGED_IN_ONLY: "مسجلون فقط",
};

export const CAMPAIGN_FREQUENCY_AR: Record<string, string> = {
  ALWAYS: "دائمًا",
  ONCE: "مرة واحدة",
  DAILY: "يوميًا",
  EVERY_LAUNCH: "كل تشغيل للتطبيق",
  EVERY_SESSION: "كل جلسة",
  DISMISS_HOURS: "إخفاء لساعات",
};

export const CAMPAIGN_ROTATION_AR: Record<string, string> = {
  PRIORITY: "حسب الأولوية",
  WEIGHT: "حسب الوزن",
  RANDOM: "عشوائي",
};

export const CAMPAIGN_CTA_STYLE_AR: Record<string, string> = {
  PRIMARY: "أساسي",
  SECONDARY: "ثانوي",
  OUTLINE: "إطار",
  TEXT: "نص",
  PILL: "حبة",
};

export const CAMPAIGN_TEXT_ALIGN_AR: Record<string, string> = {
  START: "بداية",
  CENTER: "وسط",
  END: "نهاية",
};

export const COUPON_APPLICABILITY_AR: Record<string, string> = {
  ALL: "الكل",
  DELIVERY_ONLY: "التوصيل فقط",
  PICKUP_ONLY: "الاستلام فقط",
};

export const SCHEDULE_PHASE_AR: Record<string, string> = {
  active: "فعّال",
  upcoming: "قادم",
  expired: "منتهٍ",
  inactive: "معطّل",
};

export const INVENTORY_MOVEMENT_TYPE_AR: Record<string, string> = {
  MANUAL_IN: "إضافة يدوية",
  MANUAL_OUT: "خصم يدوي",
  ORDER_CONFIRM: "تأكيد طلب",
  ORDER_CANCEL: "إلغاء طلب",
  ADJUSTMENT: "تسوية",
};

export const NOTIFICATION_TYPE_AR: Record<string, string> = {
  ADMIN: "إداري",
  OFFER: "عرض",
  SYSTEM: "نظام",
  ORDER_STATUS: "حالة الطلب",
};

export const COMMON_AR = {
  loading: "جاري التحميل…",
  loadingDashboard: "جاري تحميل لوحة التحكم…",
  loadFailed: "تعذر تحميل البيانات",
  tryAgain: "حاول مرة أخرى",
  noData: "لا توجد بيانات خلال هذه الفترة",
  noResults: "لا توجد نتائج",
  noOrders: "لا توجد طلبات",
  noProducts: "لا توجد منتجات",
  save: "حفظ",
  cancel: "إلغاء",
  delete: "حذف",
  edit: "تعديل",
  create: "إنشاء",
  add: "إضافة",
  search: "بحث",
  filter: "تصفية",
  actions: "إجراءات",
  active: "نشط",
  inactive: "غير نشط",
  yes: "نعم",
  no: "لا",
  confirm: "تأكيد",
  close: "إغلاق",
  back: "رجوع",
  next: "التالي",
  previous: "السابق",
  refresh: "تحديث",
  upload: "رفع",
  download: "تنزيل",
  print: "طباعة",
  copy: "نسخ",
  copied: "تم النسخ",
  from: "من",
  to: "إلى",
  all: "الكل",
  status: "الحالة",
  details: "التفاصيل",
  view: "عرض",
  required: "مطلوب",
  optional: "اختياري",
  nameAr: "الاسم بالعربية",
  nameEn: "الاسم بالإنجليزية",
  descriptionAr: "الوصف بالعربية",
  descriptionEn: "الوصف بالإنجليزية",
  titleAr: "العنوان بالعربية",
  titleEn: "العنوان بالإنجليزية",
  bodyAr: "النص بالعربية",
  bodyEn: "النص بالإنجليزية",
  image: "الصورة",
  category: "القسم",
  product: "المنتج",
  price: "السعر",
  quantity: "الكمية",
  total: "الإجمالي",
  date: "التاريخ",
  createdAt: "تاريخ الإنشاء",
  updatedAt: "تاريخ التحديث",
  phone: "الجوال",
  email: "البريد الإلكتروني",
  customer: "العميل",
  notes: "ملاحظات",
  reason: "السبب",
  sku: "رمز المنتج",
  unit: "الوحدة",
  sortOrder: "ترتيب العرض",
  featured: "مميز",
  bestSeller: "الأكثر مبيعًا",
  showing: "عرض",
  of: "من",
  page: "صفحة",
  collapse: "طي القائمة",
  expand: "توسيع القائمة",
  brandName: "سوق ثراء",
  adminDashboard: "لوحة التحكم",
  signedInAs: "مسجل الدخول كـ",
  logout: "تسجيل الخروج",
  login: "تسجيل الدخول",
  password: "كلمة المرور",
  rememberMe: "تذكرني",
  enter: "دخول",
  sessionExpired: "انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.",
  loginFailed: "تعذر تسجيل الدخول. حاول مرة أخرى.",
  notStaff: "هذا الحساب غير مخوّل بالدخول إلى لوحة التحكم.",
  restrictedAccess: "الدخول مقصور على حسابات مدير النظام والمدير والموظف.",
  searchOrderPlaceholder: "ابحث برقم الطلب...",
  notifications: "الإشعارات",
  somethingWentWrong: "حدث خطأ غير متوقع",
  networkError: "تعذر الاتصال بالخادم",
  unauthorized: "غير مصرح",
  forbidden: "ليس لديك صلاحية لهذا الإجراء",
  validationError: "بيانات غير صالحة",
  newest: "الأحدث",
  oldest: "الأقدم",
  newestFirst: "الأحدث أولاً",
  oldestFirst: "الأقدم أولاً",
  min: "الحد الأدنى",
  max: "الحد الأعلى",
  minutes: "دقيقة",
  noSku: "لا يوجد رمز",
  uncategorized: "غير مصنف",
  noImage: "بلا صورة",
  unlimited: "غير محدود",
  noLimit: "بدون حد",
  selected: "محدد",
  name: "الاسم",
  code: "الرمز",
  discount: "الخصم",
  scope: "النطاق",
  period: "الفترة",
  startsAt: "تاريخ البدء",
  endsAt: "تاريخ الانتهاء",
  expiresAt: "تاريخ الانتهاء",
  usage: "الاستخدام",
  applicability: "قابلية التطبيق",
  visible: "مرئي",
  comment: "التعليق",
  rating: "التقييم",
  joined: "تاريخ الانضمام",
  lastOrder: "آخر طلب",
  totalSpend: "إجمالي الإنفاق",
  addresses: "العناوين",
  default: "افتراضي",
  reviews: "التقييمات",
  profile: "الملف الشخصي",
  stock: "المخزون",
  available: "المتاح",
  reserved: "المحجوز",
  min_stock: "الحد الأدنى للمخزون",
  key: "المفتاح",
  value: "القيمة",
  send: "إرسال",
  type: "النوع",
  target: "الفئة المستهدفة",
  minOrderAmount: "الحد الأدنى للطلب",
  maxDiscountAmount: "الحد الأقصى للخصم",
  usageLimit: "حد الاستخدام الإجمالي",
  perUserLimit: "حد الاستخدام لكل مستخدم",
  productsWord: "منتجات",
  before: "قبل",
  after: "بعد",
  system: "النظام",
  unread: "غير مقروء",
  filterByAction: "تصفية حسب الإجراء",
  filterByEntity: "تصفية حسب نوع العنصر",
} as const;

export function labelOf(
  map: Record<string, string>,
  value: string | null | undefined,
  fallback = "—",
): string {
  if (!value) return fallback;
  return map[value] ?? value;
}
