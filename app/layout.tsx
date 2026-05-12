import { Playfair_Display, DM_Sans, Cairo } from 'next/font/google'
import { ThemeProvider } from '../components/providers/ThemeProvider'
import { SupabaseProvider } from '../components/providers/SupabaseProvider'
import { I18nProvider } from '../components/providers/I18nProvider'
import { Toaster } from '../components/Toaster'
import '@/styles/globals.css'

// 1. تعريف الخطوط كمغيرات برمجية (هذا ما كان ينقصك)
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
})

const cairo = Cairo({
  subsets: ['arabic'],
  variable: '--font-cairo',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      {/* 2. دمج المتغيرات الثلاثة في الـ body مع جعل Cairo هو الخط الأساسي */}
      <body className={`${playfair.variable} ${dmSans.variable} ${cairo.variable} font-cairo antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SupabaseProvider>
            <I18nProvider>
              {children}
              <Toaster />
            </I18nProvider>
          </SupabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
