import { Playfair_Display, DM_Sans, Cairo } from 'next/font/google'
import { ThemeProvider } from '../components/providers/ThemeProvider'
import { SupabaseProvider } from '../components/providers/SupabaseProvider'
import { I18nProvider } from '../components/providers/I18nProvider'
import { Toaster } from '../components/Toaster'
import '@/styles/globals.css'

// 1. تعريف الخطوط بشكل صحيح لضمان عدم وجود ReferenceError
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
})

const cairo = Cairo({
  subsets: ['arabic'],
  variable: '--font-cairo',
  weight: ['200', '300', '400', '500', '600', '700', '800', '900'],
})

export const metadata = {
  title: 'DEGITALE | سوق الأصول الرقمية',
  description: 'منصة حصرية لبيع وشراء المنتجات الرقمية المتطورة',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html 
      lang="ar" 
      dir="rtl" 
      className="w-full overflow-x-hidden" 
      suppressHydrationWarning
    >
      <body 
        className={`
          ${playfair.variable} 
          ${dmSans.variable} 
          ${cairo.variable} 
          font-cairo antialiased 
          w-full max-w-full overflow-x-hidden 
          bg-[#08080E] text-[#F0EDE6]
        `}
      >
        <ThemeProvider 
          attribute="class" 
          defaultTheme="dark" 
          enableSystem={false}
        >
          <SupabaseProvider>
            <I18nProvider>
              {/* الحاوية الرئيسية لضمان توزيع العناصر */}
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
