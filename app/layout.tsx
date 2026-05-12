import { Playfair_Display, DM_Sans, Cairo } from 'next/font/google' // أضف Cairo هنا

// ... الإعدادات الأخرى

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
      {/* أضف cairo.variable هنا واجعل font-cairo هو الخط الأساسي */}
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
