import { Playfair_Display, DM_Sans } from 'next/font/google'

// 1. تعريف الخطوط خارج المكون (خارج الـ function)
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
      {/* 2. إضافة الخطوط إلى الكلاس الخاص بالـ body */}
      <body className={`${playfair.variable} ${dmSans.variable} font-sans`}>
        {children}
      </body>
    </html>
  )
}
