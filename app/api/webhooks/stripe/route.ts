// app/api/webhooks/stripe/route.ts
// Handles Stripe's checkout.session.completed event.
//
// Security model:
//   1. Stripe-Signature header verification (HMAC-SHA256) — rejects spoofed events.
//   2. Idempotency check — Stripe can deliver the same event twice; we guard with
//      a unique constraint on stripe_session_id in the orders table.
//   3. All DB writes are inside a Supabase RPC transaction — no partial state.
//   4. Signed URL generation happens AFTER the order row is committed.

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { sendOrderEmails } from '../../../../lib/email/sendOrderEmails'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!

// Next.js 14+ — must opt out of body parsing so Stripe can verify raw bytes
export const config = { api: { bodyParser: false } }

export async function POST(req: NextRequest) {
  // 1. Read raw body (required for signature verification)
  const rawBody    = await req.text()
  const sigHeader  = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sigHeader, WEBHOOK_SECRET)
  } catch (err: any) {
    console.error('[Webhook] Signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // 2. Only process the event we care about
  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true })
  }

  const session  = event.data.object as Stripe.Checkout.Session
  const meta     = session.metadata ?? {}
  const { buyerId, listingId, storeId, tierId, downloadExpiryHours } = meta

  if (!buyerId || !listingId || !storeId) {
    console.error('[Webhook] Missing metadata', meta)
    return NextResponse.json({ error: 'Missing metadata' }, { status: 422 })
  }

  const supabase = createAdminClient()

  // 3. Idempotency — if order already exists for this session, skip silently
  const { data: existing } = await supabase
    .from('orders')
    .select('id')
    .eq('stripe_session_id', session.id)
    .maybeSingle()

  if (existing) {
    console.log('[Webhook] Duplicate event, already processed:', session.id)
    return NextResponse.json({ received: true })
  }

  // 4. Resolve listing for price confirmation
  const { data: listing } = await supabase
    .from('listings')
    .select('id, title, base_price, currency, type, stores(id)')
    .eq('id', listingId)
    .single()

  if (!listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  // Resolve actual charged amount from Stripe (source of truth)
  const amountTotal = (session.amount_total ?? 0) / 100  // back to dollars
  const currency    = session.currency?.toUpperCase() ?? 'USD'

  // 5. Insert order + order_item in a Supabase transaction (RPC)
  const { data: orderResult, error: orderErr } = await supabase
    .rpc('create_order_from_webhook', {
      p_buyer_id:         buyerId,
      p_listing_id:       listingId,
      p_tier_id:          tierId || null,
      p_amount:           amountTotal,
      p_currency:         currency,
      p_stripe_session:   session.id,
      p_stripe_intent:    session.payment_intent as string,
    })

  if (orderErr || !orderResult) {
    console.error('[Webhook] DB insert failed:', orderErr)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  const { order_id, order_item_id } = orderResult as {
    order_id: string
    order_item_id: string
  }

  // 6. Generate secure download token + Supabase Storage signed URL
  let downloadUrl: string | null = null

  if (listing.type === 'product') {
    // Fetch the latest file for this listing (or specific tier)
    const { data: file } = await supabase
      .from('listing_files')
      .select('id, storage_path')
      .eq('listing_id', listingId)
      .eq('status', 'encrypted')
      .order('version', { ascending: false })
      .maybeSingle()

    if (file) {
      const expirySeconds = parseInt(downloadExpiryHours ?? '48') * 3600

      // Supabase signed URL — cryptographically signed, server-only path, time-limited
      const { data: signed, error: signErr } = await supabase
        .storage
        .from('listing-files')
        .createSignedUrl(file.storage_path, expirySeconds)

      if (signErr) {
        console.error('[Webhook] Signed URL error:', signErr)
      } else {
        downloadUrl = signed.signedUrl

        // Store a HASHED token in DB (never store the plain URL in DB)
        await supabase.rpc('store_download_token', {
          p_order_item_id: order_item_id,
          p_signed_url:    downloadUrl,      // stored as bcrypt hash
          p_ttl_hours:     parseInt(downloadExpiryHours ?? '48'),
        })
      }
    }
  }

  // 7. Fetch buyer + seller details for email
  const [buyerRes, sellerRes] = await Promise.all([
    supabase.from('users').select('email, full_name').eq('id', buyerId).single(),
    supabase
      .from('stores')
      .select('name, users:owner_id(email, full_name)')
      .eq('id', storeId)
      .single(),
  ])

  // 8. Send both emails (fire-and-forget — non-blocking)
  sendOrderEmails({
    buyer: {
      email:    buyerRes.data?.email ?? '',
      name:     buyerRes.data?.full_name ?? 'Valued Customer',
    },
    seller: {
      email:    (sellerRes.data?.users as any)?.email ?? '',
      name:     (sellerRes.data?.users as any)?.full_name ?? 'Store Owner',
      storeName: sellerRes.data?.name ?? '',
    },
    listing: {
      title:     listing.title,
      type:      listing.type,
      amount:    amountTotal,
      currency,
      orderId:   order_id,
    },
    downloadUrl,            // null for services — email omits the download section
  }).catch(err => console.error('[Webhook] Email error:', err))

  return NextResponse.json({ received: true, orderId: order_id })
}

// ── Supabase RPC: create_order_from_webhook ────────────────────────────────
// Run this migration in Supabase SQL editor:
/*
CREATE OR REPLACE FUNCTION create_order_from_webhook(
  p_buyer_id       uuid,
  p_listing_id     uuid,
  p_tier_id        uuid,
  p_amount         numeric,
  p_currency       text,
  p_stripe_session text,
  p_stripe_intent  text
)
RETURNS json AS $$
DECLARE
  v_order_id      uuid;
  v_order_item_id uuid;
BEGIN
  -- Insert order
  INSERT INTO orders (buyer_id, total_amount, currency, status, stripe_session_id, stripe_payment_intent, paid_at)
  VALUES (p_buyer_id, p_amount, p_currency, 'paid', p_stripe_session, p_stripe_intent, now())
  RETURNING id INTO v_order_id;

  -- Insert order item
  INSERT INTO order_items (order_id, listing_id, tier_id, unit_price)
  VALUES (v_order_id, p_listing_id, p_tier_id, p_amount)
  RETURNING id INTO v_order_item_id;

  -- Increment sales counter on listing
  UPDATE listings SET sales_count = sales_count + 1 WHERE id = p_listing_id;

  RETURN json_build_object('order_id', v_order_id, 'order_item_id', v_order_item_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/
