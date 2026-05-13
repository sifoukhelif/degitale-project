// app/layout.tsx — النسخة الكاملة مع جميع الـ providers
import type { Metadata, Viewport } from 'next'
import { Playfair_Display, DM_Sans, Cairo } from 'next/font/google'
import { ThemeProvider }   from '@/components/providers/ThemeProvider'
import { SupabaseProvider } from '@/components/providers/SupabaseProvider'
import { I18nProvider }    from '@/components/providers/I18nProvider'
import { Toaster }         from '@/components/Toaster'
import '@/styles/globals.css'

// ── الخطوط ──────────────────────────────────────────────────────────────────
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['300', '400', '500', '600'],
  display: 'swap',
})

const cairo = Cairo({
  subsets: ['arabic'],
  variable: '--font-cairo',
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
})

// ── Metadata ─────────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: {
    default:  'DEGITALE | سوق الأصول الرقمية',
    template: '%s | DEGITALE',
  },
  description: 'منصة حصرية لبيع وشراء المنتجات الرقمية المتطورة',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://degitale.com'),
  openGraph: {
    siteName: 'DEGITALE',
    type:     'website',
    locale:   'ar_SA',
  },
}

export const viewport: Viewport = {
  width:        'device-width',
  initialScale: 1,
  themeColor:   '#08080E',
}

// ── Root Layout ───────────────────────────────────────────────────────────────
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`
        ${playfair.variable}
        ${dmSans.variable}
        ${cairo.variable}
        w-full overflow-x-hidden
      `}
      suppressHydrationWarning
    >
      <body className="font-cairo antialiased w-full max-w-full overflow-x-hidden bg-[#08080E] text-[#F0EDE6]">
        <ThemeProvider defaultTheme="dark">
          <SupabaseProvider>
            <I18nProvider locale="ar">
              <div className="relative flex flex-col min-h-screen w-full">
                {children}
              </div>
              <Toaster />
            </I18nProvider>
          </SupabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
