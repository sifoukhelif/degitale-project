// app/become-seller/actions.ts
// Server Action — promotes a buyer account to seller.
// Runs entirely server-side; never exposes the admin client to the browser.

'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

interface BecomeSellerInput {
  storeName:  string
  storeSlug?: string   // auto-generated if omitted
  bio?:       string
}

export async function becomeSeller(input: BecomeSellerInput) {
  // 1. Verify the requesting user is authenticated
  const supabase = createServerClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()

  if (authErr || !user) {
    redirect('/auth/login?redirectTo=/become-seller')
  }

  // 2. Guard: already a seller?
  const existingRole = user.app_metadata?.role
  if (existingRole === 'seller' || existingRole === 'admin') {
    redirect('/dashboard')
  }

  // 3. Validate store name
  const name = input.storeName.trim()
  if (name.length < 3 || name.length > 60) {
    return { error: 'Store name must be between 3 and 60 characters.' }
  }

  // 4. Generate slug if not provided
  const slug = (input.storeSlug ?? name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  // 5. Check slug uniqueness
  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('stores')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    return { error: `The store URL "degitale.com/store/${slug}" is already taken. Try a different name.` }
  }

  // 6. Promote role + create store in a single DB transaction (RPC)
  const { error: rpcErr } = await admin.rpc('promote_buyer_to_seller', {
    p_user_id:    user.id,
    p_store_name: name,
    p_store_slug: slug,
    p_bio:        input.bio?.trim() ?? null,
  })

  if (rpcErr) {
    console.error('[becomeSeller] RPC error:', rpcErr)
    return { error: 'Something went wrong. Please try again.' }
  }

  // 7. Revalidate paths so Server Components re-fetch with new role
  revalidatePath('/dashboard', 'layout')
  revalidatePath('/become-seller')

  // 8. Return success — the CLIENT must call refreshSession() after this
  //    to get a new JWT with role=seller before redirecting to /dashboard
  return { success: true, slug }
}


// ─────────────────────────────────────────────────────────────────────────────
// SQL migration: promote_buyer_to_seller
// Run in Supabase SQL Editor → New query
// ─────────────────────────────────────────────────────────────────────────────
/*
CREATE OR REPLACE FUNCTION promote_buyer_to_seller(
  p_user_id    uuid,
  p_store_name text,
  p_store_slug text,
  p_bio        text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- 1. Elevate role in the JWT (app_metadata lives in auth.users)
  UPDATE auth.users
  SET    raw_app_meta_data = raw_app_meta_data || jsonb_build_object('role', 'seller')
  WHERE  id = p_user_id;

  -- 2. Create the store row (idempotent)
  INSERT INTO public.stores (owner_id, name, slug, bio, created_at)
  VALUES (p_user_id, p_store_name, p_store_slug, p_bio, now())
  ON CONFLICT (owner_id) DO UPDATE
    SET name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        bio  = COALESCE(EXCLUDED.bio, stores.bio);

  -- 3. Update the public users table role column (denormalised for UI queries)
  UPDATE public.users
  SET    role = 'seller'
  WHERE  id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to authenticated users only
REVOKE ALL ON FUNCTION promote_buyer_to_seller FROM PUBLIC;
GRANT EXECUTE ON FUNCTION promote_buyer_to_seller TO service_role;
*/


// ─────────────────────────────────────────────────────────────────────────────
// app/become-seller/BecomeSeller.client.tsx
// Client component that calls the server action + refreshes the JWT
// ─────────────────────────────────────────────────────────────────────────────
/*
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/browser'
import { becomeSeller } from './actions'
import { toast } from 'sonner'

export function BecomeSellerForm() {
  const router = useRouter()
  const supabase = createBrowserClient()
  const [isPending, startTransition] = useTransition()
  const [storeName, setStoreName] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    startTransition(async () => {
      const result = await becomeSeller({ storeName })

      if ('error' in result) {
        toast.error(result.error)
        return
      }

      // CRITICAL: refresh the JWT so the new role=seller is in the cookie.
      // Without this, the middleware still sees role=buyer on the next request.
      const { error: refreshErr } = await supabase.auth.refreshSession()
      if (refreshErr) {
        toast.error('Session refresh failed. Please log out and back in.')
        return
      }

      toast.success('Your store is live! Welcome to DEGITALE.')
      router.push('/dashboard')
      router.refresh()  // re-run Server Components with the new session
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="storeName">Store name</label>
      <input
        id="storeName"
        type="text"
        value={storeName}
        onChange={e => setStoreName(e.target.value)}
        placeholder="e.g. PixelForge Studio"
        minLength={3}
        maxLength={60}
        required
      />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating your store…' : 'Start selling →'}
      </button>
    </form>
  )
}
*/
