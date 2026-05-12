import { createServerClient as supabaseCreateServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const createServerClient = async () => {
  // جلب مخزن الكوكيز بشكل غير متزامن
  const cookieStore = await cookies()

  return supabaseCreateServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // تجاهل الخطأ إذا تم استدعاؤه في Server Component
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // تجاهل الخطأ إذا تم استدعاؤه في Server Component
          }
        },
      },
    }
  )
}
