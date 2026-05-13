import { Playfair_Display, DM_Sans, Cairo } from 'next/font/google'
// ... بقية الـ imports

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // أضفنا w-full و overflow-x-hidden هنا
    <html lang="ar" dir="rtl" className="w-full overflow-x-hidden" suppressHydrationWarning>
      <body className={`${playfair.variable} ${dmSans.variable} ${cairo.variable} font-cairo antialiased w-full max-w-full overflow-x-hidden`}>
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
