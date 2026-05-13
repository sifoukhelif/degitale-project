// app/api/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@/lib/supabase/server'

const PLATFORM_FEE_PERCENT = 20
const DOWNLOAD_EXPIRY_HOURS = 48

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export async function POST(req: NextRequest) {
  try {
    const { listingId, tierId } = await req.json()

    if (!listingId) {
      return NextResponse.json({ error: 'listingId is required' }, { status: 400 })
    }

    // 1. Auth — Async client for Next.js 16
    const supabase = await createServerClient() 
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Fetch listing & seller account
    const { data: listing, error: listErr } = await supabase
      .from('listings')
      .select(`
        id, title, base_price, currency, thumbnail_url,
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

    const store = (listing.stores as any)
    const sellerStripeId = store?.users?.stripe_account_id

    if (!sellerStripeId) {
      return NextResponse.json({ error: 'Seller Stripe account not found' }, { status: 422 })
    }

    // 3. Resolve Price
    let unitAmount: number
    let productName = listing.title

    if (tierId && listing.pricing_tiers?.length) {
      const tier = (listing.pricing_tiers as any[]).find(t => t.id === tierId)
      if (!tier) return NextResponse.json({ error: 'Tier not found' }, { status: 404 })
      unitAmount = Math.round(tier.price * 100)
      productName = `${listing.title} — ${tier.name}`
    } else {
      unitAmount = Math.round((listing.base_price ?? 0) * 100)
    }

    const applicationFeeAmount = Math.round(unitAmount * (PLATFORM_FEE_PERCENT / 100))

    // 4. Create Stripe Session
    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL!
    const successUrl = `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${origin}/product/${listingId}`

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: (listing.currency ?? 'usd').toLowerCase(),
            unit_amount: unitAmount,
            product_data: {
              name: productName,
              images: listing.thumbnail_url ? [listing.thumbnail_url] : [],
            },
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        transfer_data: { destination: sellerStripeId },
      },
      customer_email: user.email,
      metadata: {
        buyerId: user.id,
        listingId: listingId,
        storeId: store.id,
        tierId: tierId ?? '',
        downloadExpiryHours: String(DOWNLOAD_EXPIRY_HOURS),
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    })

    return NextResponse.json({ url: session.url })

  } catch (err: any) {
    console.error('[/api/checkout] Error:', err)
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 })
  }
}
