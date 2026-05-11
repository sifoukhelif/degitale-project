// app/layout.tsx  — Root layout (server component)
// Handles: i18n direction, font loading, responsive shell, global providers

import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import { ThemeProvider } from '@/components/ThemeProvider'
import { SupabaseProvider } from '../components/SupabaseProvider'
import { I18nProvider } from '../components/I18nProvider'
import { Toaster } from '@/components/ui/Toaster'
import '@/styles/globals.css'

// ─── Fonts (subset-loaded, zero layout shift) ─────────────────────────────
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['300', '400', '500', '600'],
  display: 'swap',
})

// ─── SEO metadata ─────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: { default: 'DEGITALE — Premium Digital Marketplace', template: '%s | DEGITALE' },
  description: 'Buy and sell premium digital products, templates, and services.',
  metadataBase: new URL('https://degitale.com'),
  openGraph: {
    siteName: 'DEGITALE',
    type: 'website',
    locale: 'en_US',
  },
  robots: { index: true, follow: true },
  icons: { icon: '/icons/favicon.svg', apple: '/icons/apple-touch-icon.png' },
}

// Viewport separated (Next.js 14+ requirement)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#08080E',
}

// ─── Root Layout ──────────────────────────────────────────────────────────
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Read locale injected by middleware (no DB round-trip)
  const headersList = headers()
  const locale = (headersList.get('x-degitale-locale') ?? 'en') as 'en' | 'ar' | 'fr'
  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${playfair.variable} ${dmSans.variable}`}
      suppressHydrationWarning
    >
      <body>
        <SupabaseProvider>
          <I18nProvider locale={locale}>
            <ThemeProvider>
              {children}
              <Toaster />
            </ThemeProvider>
          </I18nProvider>
        </SupabaseProvider>
      </body>
    </html>
  )
}
