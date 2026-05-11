// middleware.ts  (root of Next.js project)
// Runs on the Edge — zero cold-start, executed before every matched request.

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// ─── Route permission matrix ───────────────────────────────────────────────
const ROUTE_RULES: {
  pattern: RegExp
  roles: Array<'buyer' | 'seller' | 'admin'>
  requireAuth: boolean
}[] = [
  // Public routes — no auth needed
  { pattern: /^\/$/, roles: [], requireAuth: false },
  { pattern: /^\/browse/, roles: [], requireAuth: false },
  { pattern: /^\/product\//, roles: [], requireAuth: false },
  { pattern: /^\/store\//, roles: [], requireAuth: false },
  { pattern: /^\/auth\//, roles: [], requireAuth: false },

  // Buyer-only routes
  { pattern: /^\/orders/, roles: ['buyer', 'seller', 'admin'], requireAuth: true },
  { pattern: /^\/downloads/, roles: ['buyer', 'seller', 'admin'], requireAuth: true },
  { pattern: /^\/checkout/, roles: ['buyer', 'seller', 'admin'], requireAuth: true },

  // Seller + Admin routes (vendor dashboard)
  { pattern: /^\/dashboard/, roles: ['seller', 'admin'], requireAuth: true },
  { pattern: /^\/dashboard\/products/, roles: ['seller', 'admin'], requireAuth: true },
  { pattern: /^\/dashboard\/orders/, roles: ['seller', 'admin'], requireAuth: true },
  { pattern: /^\/dashboard\/wallet/, roles: ['seller', 'admin'], requireAuth: true },
  { pattern: /^\/dashboard\/analytics/, roles: ['seller', 'admin'], requireAuth: true },
  { pattern: /^\/dashboard\/milestones/, roles: ['seller', 'admin'], requireAuth: true },

  // Admin-only routes
  { pattern: /^\/admin/, roles: ['admin'], requireAuth: true },
]

// ─── Middleware ────────────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Find matching rule (first match wins)
  const rule = ROUTE_RULES.find(r => r.pattern.test(pathname))

  // No rule → allow (static assets, API routes handled separately)
  if (!rule || !rule.requireAuth) return NextResponse.next()

  // 2. Initialise Supabase SSR client (reads cookies from request)
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => request.cookies.get(name)?.value,
        set: (name, value, opts) => {
          request.cookies.set({ name, value, ...opts })
          response.cookies.set({ name, value, ...opts })
        },
        remove: (name, opts) => {
          request.cookies.set({ name, value: '', ...opts })
          response.cookies.set({ name, value: '', ...opts })
        },
      },
    }
  )

  // 3. Get session — lightweight (reads JWT from cookie, no DB call)
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    // Not logged in → redirect to login with return URL
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 4. Role check — role is stored in JWT app_metadata (set by DB trigger)
  const role = session.user.app_metadata?.role as string | undefined

  if (rule.roles.length > 0 && (!role || !rule.roles.includes(role as any))) {
    // Authenticated but wrong role
    if (role === 'buyer' && pathname.startsWith('/dashboard')) {
      // Buyer trying to access seller dashboard → offer to become seller
      return NextResponse.redirect(new URL('/become-seller', request.url))
    }
    return NextResponse.redirect(new URL('/unauthorized', request.url))
  }

  // 5. i18n locale detection (injected into request headers for server components)
  const acceptLang = request.headers.get('accept-language') ?? 'en'
  const preferredLocale = detectLocale(acceptLang)
  response.headers.set('x-degitale-locale', preferredLocale)

  return response
}

// ─── Locale detection helper ───────────────────────────────────────────────
const SUPPORTED_LOCALES = ['en', 'ar', 'fr'] as const
type Locale = typeof SUPPORTED_LOCALES[number]

function detectLocale(acceptLanguage: string): Locale {
  // Parse "en-US,en;q=0.9,ar;q=0.8" → ['en', 'ar']
  const preferred = acceptLanguage
    .split(',')
    .map(l => l.split(';')[0].trim().split('-')[0])

  return (preferred.find(l => SUPPORTED_LOCALES.includes(l as Locale)) ?? 'en') as Locale
}

// ─── Matcher — skip static files & Next internals ─────────────────────────
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|images|.*\\.(?:svg|png|jpg|webp|woff2)).*)',
  ],
}
