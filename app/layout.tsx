import { Playfair_Display, DM_Sans } from 'next/font/google'
import { ThemeProvider } from '../components/providers/ThemeProvider'
import { SupabaseProvider } from '../components/providers/SupabaseProvider'
import { I18nProvider } from '../components/providers/I18nProvider'
import { Toaster } from '../components/ui/Toaster'
import '@/styles/globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={`${playfair.variable} ${dmSans.variable} font-sans antialiased`}>
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
