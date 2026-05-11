// lib/i18n/index.ts  — Lightweight i18n without heavy libraries
// Philosophy: flat key-value dictionaries per locale, type-safe, tree-shakeable.
// Add new locales by creating a file in /lib/i18n/locales/ — zero config change.

// ─── Types ────────────────────────────────────────────────────────────────
export type Locale = 'en' | 'ar' | 'fr'

// Dictionary shape — enforced on every locale file
export interface Dictionary {
  nav: {
    products: string
    services: string
    stores: string
    login: string
    getStarted: string
  }
  hero: {
    badge: string
    title: string
    titleHighlight: string
    sub: string
    ctaPrimary: string
    ctaSecondary: string
  }
  dashboard: {
    title: string
    revenue: string
    orders: string
    rating: string
    pendingPayout: string
    wallet: string
    availableBalance: string
    withdraw: string
    recentOrders: string
    newListing: string
  }
  product: {
    addToCart: string
    buyNow: string
    reviews: string
    download: string
    category: string
  }
  auth: {
    login: string
    signup: string
    email: string
    password: string
    forgotPassword: string
    orContinueWith: string
  }
  common: {
    loading: string
    error: string
    save: string
    cancel: string
    delete: string
    edit: string
    viewAll: string
    search: string
    noResults: string
  }
  status: {
    paid: string
    pending: string
    processing: string
    refunded: string
    completed: string
  }
}

// ─── Dynamic locale loader ─────────────────────────────────────────────────
const localeCache = new Map<Locale, Dictionary>()

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  if (localeCache.has(locale)) return localeCache.get(locale)!

  // Dynamic import — only the requested locale is bundled per request
  const dict = (await import(`./locales/${locale}`)).default as Dictionary
  localeCache.set(locale, dict)
  return dict
}

// ─── Hook for client components ───────────────────────────────────────────
// components/providers/I18nProvider.tsx provides this via context
export function useTranslation() {
  // Implemented in I18nProvider — returns { t, locale, dir }
  throw new Error('useTranslation must be used within I18nProvider')
}

// ─── Locale metadata ──────────────────────────────────────────────────────
export const LOCALE_META: Record<Locale, { label: string; dir: 'ltr' | 'rtl'; flag: string }> = {
  en: { label: 'English', dir: 'ltr', flag: '🇺🇸' },
  ar: { label: 'العربية', dir: 'rtl', flag: '🇸🇦' },
  fr: { label: 'Français', dir: 'ltr', flag: '🇫🇷' },
}

// ─────────────────────────────────────────────────────────────────────────
// lib/i18n/locales/en.ts  — English (default / source of truth)
// ─────────────────────────────────────────────────────────────────────────
export const en: Dictionary = {
  nav: {
    products: 'Products',
    services: 'Services',
    stores: 'Stores',
    login: 'Sign in',
    getStarted: 'Get started',
  },
  hero: {
    badge: 'The #1 Digital Marketplace — Exclusive products & services',
    title: 'Your premium digital',
    titleHighlight: 'marketplace',
    sub: 'Discover thousands of digital products and services from top creators. Or build your professional store and start selling today.',
    ctaPrimary: 'Explore now',
    ctaSecondary: 'Start selling',
  },
  dashboard: {
    title: 'Vendor Dashboard',
    revenue: 'Revenue',
    orders: 'Orders',
    rating: 'Rating',
    pendingPayout: 'Pending Payout',
    wallet: 'Wallet',
    availableBalance: 'Available Balance',
    withdraw: 'Request Withdrawal',
    recentOrders: 'Recent Orders',
    newListing: 'New Listing',
  },
  product: {
    addToCart: 'Add to Cart',
    buyNow: 'Buy Now',
    reviews: 'reviews',
    download: 'Download',
    category: 'Category',
  },
  auth: {
    login: 'Sign In',
    signup: 'Create Account',
    email: 'Email address',
    password: 'Password',
    forgotPassword: 'Forgot password?',
    orContinueWith: 'Or continue with',
  },
  common: {
    loading: 'Loading…',
    error: 'Something went wrong.',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    viewAll: 'View all',
    search: 'Search',
    noResults: 'No results found.',
  },
  status: {
    paid: 'Paid',
    pending: 'Pending',
    processing: 'Processing',
    refunded: 'Refunded',
    completed: 'Completed',
  },
}

// ─────────────────────────────────────────────────────────────────────────
// lib/i18n/locales/ar.ts  — Arabic (RTL)
// (excerpt — same structure as en, translated)
// ─────────────────────────────────────────────────────────────────────────
export const ar: Dictionary = {
  nav: {
    products: 'المنتجات',
    services: 'الخدمات',
    stores: 'المتاجر',
    login: 'تسجيل الدخول',
    getStarted: 'ابدأ مجاناً',
  },
  hero: {
    badge: 'السوق الرقمي الأول — منتجات وخدمات حصرية',
    title: 'سوقك الرقمي الذكي',
    titleHighlight: 'لكل ما هو إبداعي',
    sub: 'اكتشف آلاف المنتجات والخدمات الرقمية. أو ابنِ متجرك وابدأ البيع اليوم.',
    ctaPrimary: 'استكشف الآن',
    ctaSecondary: 'ابدأ البيع',
  },
  dashboard: {
    title: 'لوحة تحكم البائع',
    revenue: 'الإيرادات',
    orders: 'الطلبات',
    rating: 'التقييم',
    pendingPayout: 'مبالغ معلقة',
    wallet: 'المحفظة',
    availableBalance: 'الرصيد المتاح',
    withdraw: 'طلب سحب',
    recentOrders: 'آخر الطلبات',
    newListing: 'منتج جديد',
  },
  product: {
    addToCart: 'أضف للسلة',
    buyNow: 'اشترِ الآن',
    reviews: 'تقييم',
    download: 'تحميل',
    category: 'الفئة',
  },
  auth: {
    login: 'تسجيل الدخول',
    signup: 'إنشاء حساب',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    forgotPassword: 'نسيت كلمة المرور؟',
    orContinueWith: 'أو تابع بواسطة',
  },
  common: {
    loading: 'جارٍ التحميل…',
    error: 'حدث خطأ ما.',
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تعديل',
    viewAll: 'عرض الكل',
    search: 'بحث',
    noResults: 'لا توجد نتائج.',
  },
  status: {
    paid: 'مدفوع',
    pending: 'معلق',
    processing: 'قيد المعالجة',
    refunded: 'مسترجع',
    completed: 'مكتمل',
  },
}
