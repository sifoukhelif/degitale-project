// app/api/checkout/route.ts
// Creates a Stripe Checkout Session with Connect split payment.
// The platform takes a configurable fee; the seller receives the rest
// automatically via Stripe's transfer_data mechanism.

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@/lib/supabase/server'

// ── Constants ──────────────────────────────────────────────────────────────
const PLATFORM_FEE_PERCENT = 20   // DEGITALE takes 20 %
const DOWNLOAD_EXPIRY_HOURS = 48  // signed URL lifetime

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
})

// ── POST /api/checkout ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { listingId, tierId } = await req.json()

    if (!listingId) {
      return NextResponse.json({ error: 'listingId is required' }, { status: 400 })
    }

    // 1. Auth — buyer must be signed in
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Fetch listing + seller's Stripe account
    const { data: listing, error: listErr } = await supabase
      .from('listings')
      .select(`
        id, title, base_price, currency, thumbnail_url, type,
        stores (
          id, owner_id,
          users:owner_id ( stripe_account_id )
        ),
        pricing_tiers ( id, name, price )
      `)
      .eq('id', listingId)
      .eq('status', 'active')
      .single()

    if (listErr || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    const store   = (listing.stores as any)
    const sellerStripeId = store?.users?.stripe_account_id as string | undefined

    if (!sellerStripeId) {
      return NextResponse.json(
        { error: 'Seller has not connected their Stripe account yet.' },
        { status: 422 }
      )
    }

    // 3. Resolve price (tier or base)
    let unitAmount: number
    let productName = listing.title

    if (tierId && listing.pricing_tiers?.length) {
      const tier = (listing.pricing_tiers as any[]).find(t => t.id === tierId)
      if (!tier) return NextResponse.json({ error: 'Tier not found' }, { status: 404 })
      unitAmount  = Math.round(tier.price * 100)  // Stripe expects cents
      productName = `${listing.title} — ${tier.name}`
    } else {
      unitAmount = Math.round((listing.base_price ?? 0) * 100)
    }

    if (unitAmount < 50) {
      return NextResponse.json({ error: 'Minimum price is $0.50' }, { status: 422 })
    }

    // 4. Platform fee in cents
    const applicationFeeAmount = Math.round(unitAmount * (PLATFORM_FEE_PERCENT / 100))

    // 5. Create Stripe Checkout Session using Stripe Connect
    //    transfer_data.destination = seller's connected Stripe account
    //    application_fee_amount    = DEGITALE's cut (deducted automatically)
    const origin      = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL!
    const successUrl  = `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl   = `${origin}/product/${listingId}`

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],  // add 'apple_pay', 'google_pay' in Dashboard

      line_items: [
        {
          price_data: {
            currency: (listing.currency ?? 'usd').toLowerCase(),
            unit_amount: unitAmount,
            product_data: {
              name: productName,
              images: listing.thumbnail_url ? [listing.thumbnail_url] : [],
              metadata: { listingId, tierId: tierId ?? '' },
            },
          },
          quantity: 1,
        },
      ],

      // Connect: seller receives (unitAmount - applicationFeeAmount)
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: sellerStripeId,
        },
      },

      // Pre-fill customer email if available
      customer_email: user.email,

      // Metadata passed to webhook
      metadata: {
        buyerId:   user.id,
        listingId: listingId,
        storeId:   store.id,
        tierId:    tierId ?? '',
        downloadExpiryHours: String(DOWNLOAD_EXPIRY_HOURS),
      },

      success_url: successUrl,
      cancel_url:  cancelUrl,
    })

    return NextResponse.json({ url: session.url })

  } catch (err: any) {
    console.error('[/api/checkout]', err)
    return NextResponse.json(
      { error: err.message ?? 'Internal server error' },
      { status: 500 }
    )
  }
}
