// components/providers/I18nProvider.tsx
'use client'

import { createContext, useContext } from 'react'

type Locale = 'ar' | 'en' | 'fr'
type Dir    = 'rtl' | 'ltr'

interface I18nContextType {
  locale: Locale
  dir:    Dir
  t:      (key: string) => string
}

// قاموس بسيط — أضف مفاتيح حسب الحاجة
const TRANSLATIONS: Record<Locale, Record<string, string>> = {
  ar: {
    'nav.shop':       'المتجر',
    'nav.categories': 'التصنيفات',
    'nav.sell':       'ابدأ البيع',
    'nav.login':      'دخول',
    'hero.badge':     'مستقبل التجارة الرقمية الحصرية',
    'hero.cta':       'تصفح المنتجات',
    'hero.sell':      'ابدأ البيع',
    'footer.terms':   'الشروط',
    'footer.privacy': 'الخصوصية',
    'footer.support': 'الدعم',
    'common.loading': 'جارٍ التحميل…',
    'common.error':   'حدث خطأ ما.',
  },
  en: {
    'nav.shop':       'Shop',
    'nav.categories': 'Categories',
    'nav.sell':       'Start Selling',
    'nav.login':      'Sign in',
    'hero.badge':     'The Future of Exclusive Digital Commerce',
    'hero.cta':       'Browse Products',
    'hero.sell':      'Start Selling',
    'footer.terms':   'Terms',
    'footer.privacy': 'Privacy',
    'footer.support': 'Support',
    'common.loading': 'Loading…',
    'common.error':   'Something went wrong.',
  },
  fr: {
    'nav.shop':       'Boutique',
    'nav.categories': 'Catégories',
    'nav.sell':       'Commencer à vendre',
    'nav.login':      'Connexion',
    'hero.badge':     "L'avenir du commerce numérique exclusif",
    'hero.cta':       'Parcourir les produits',
    'hero.sell':      'Commencer à vendre',
    'footer.terms':   'Conditions',
    'footer.privacy': 'Confidentialité',
    'footer.support': 'Support',
    'common.loading': 'Chargement…',
    'common.error':   "Une erreur s'est produite.",
  },
}

const I18nContext = createContext<I18nContextType>({
  locale: 'ar',
  dir:    'rtl',
  t:      (key) => key,
})

interface I18nProviderProps {
  children: React.ReactNode
  locale?:  Locale
}

export function I18nProvider({ children, locale = 'ar' }: I18nProviderProps) {
  const dir: Dir = locale === 'ar' ? 'rtl' : 'ltr'

  function t(key: string): string {
    return TRANSLATIONS[locale]?.[key] ?? TRANSLATIONS['ar'][key] ?? key
  }

  return (
    <I18nContext.Provider value={{ locale, dir, t }}>
      {children}
    </I18nContext.Provider>
  )
}

// Hook للاستخدام في Client Components
export function useI18n() {
  return useContext(I18nContext)
}
