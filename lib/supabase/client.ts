// lib/supabase/browser.ts
// For use inside Client Components ('use client')
// Creates a singleton to avoid multiple GoTrue instances

import { createBrowserClient as _create } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

let client: ReturnType<typeof _create<Database>> | null = null

export function createBrowserClient() {
  if (client) return client
  client = _create<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  return client
}


// ─────────────────────────────────────────────────────────────────────────────
// lib/supabase/server.ts
// For use inside Server Components, Route Handlers, and Server Actions.
// Each call creates a fresh client bound to the current request cookies.
// ─────────────────────────────────────────────────────────────────────────────

import { createServerClient as _createServer } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

export function createServerClient() {
  const cookieStore = cookies()

  return _createServer<Database>(
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
          } catch {
            // set() throws in read-only Server Component contexts (layouts).
            // Safe to ignore — middleware handles the cookie write.
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Same as above
          }
        },
      },
    }
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// lib/supabase/admin.ts
// Service-role client — bypasses ALL Row Level Security policies.
// ONLY use in:
//   - Webhook handlers (POST /api/webhooks/stripe)
//   - Server Actions that require elevated privileges (promote_to_seller)
//   - Nightly cron jobs (badge recompute)
// NEVER import in Client Components or expose via public API routes.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      '[createAdminClient] SUPABASE_SERVICE_ROLE_KEY is not set. ' +
      'This client must only be used server-side.'
    )
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        // Disable auto-refresh and persistence — admin client is stateless
        autoRefreshToken:  false,
        persistSession:    false,
        detectSessionInUrl: false,
      },
    }
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// lib/supabase/middleware.ts
// Supabase middleware helper — refreshes the session JWT on every request.
// Called from the root middleware.ts before any route logic.
// ─────────────────────────────────────────────────────────────────────────────

import { createServerClient as _createServer } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/types/supabase'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = _createServer<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()               { return request.cookies.getAll() },
        setAll(cookiesToSet)   {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do NOT call getUser() here — use getSession() for the JWT only.
  // getUser() hits the Supabase auth server on every middleware invocation.
  // The role we need is already in the JWT app_metadata — no DB round-trip.
  const { data: { session } } = await supabase.auth.getSession()

  return { supabaseResponse, session }
}
