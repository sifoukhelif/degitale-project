// app/api/checkout/route.ts
// Creates a Stripe Checkout Session with Connect split payment.
// Updated for Next.js 16 (Async Server Client & Stripe API 2024-06-20)

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@/lib/supabase/server'

// ── الإعدادات الثابتة ──────────────────────────────────────────────────────
const PLATFORM_FEE_PERCENT = 20   // عمولة المنصة 20%
const DOWNLOAD_EXPIRY_HOURS = 48  // مدة صلاحية رابط التحميل

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20', // تحديث الإصدار لتجنب خطأ الـ Type
})

// ── POST /api/checkout ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { listingId, tierId } = await req.json()

    if (!listingId) {
      return NextResponse.json({ error: 'listingId is required' }, { status: 400 })
    }

    // 1. التحقق من الهوية (Auth)
    // في Next.js 16 يجب استخدام await عند إنشاء createServerClient
    const supabase = await createServerClient() 
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. جلب بيانات المنتج وحساب البائع في Stripe
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

    const store = (listing.stores as any)
    const sellerStripeId = store?.users?.stripe_account_id as string | undefined

    if (!sellerStripeId) {
      return NextResponse.json(
        { error: 'البائع لم يقم بربط حساب Stripe الخاص به بعد.' },
        { status: 422 }
      )
    }

    // 3. تحديد السعر (بناءً على الفئة أو السعر الأساسي)
    let unitAmount: number
    let productName = listing.title

    if (tierId && listing.pricing_tiers?.length) {
      const tier = (listing.pricing_tiers as any[]).find(t => t.id === tierId)
      if (!tier) return NextResponse.json({ error: 'Tier not found' }, { status: 404 })
      unitAmount = Math.round(tier.price * 100) // Stripe يعالج المبالغ بالسنت
      productName = `${listing.title} — ${tier.name}`
    } else {
      unitAmount = Math.round((listing.base_price ?? 0) * 100)
    }

    if (unitAmount < 50) {
      return NextResponse.json({ error: 'Minimum price is $0.50' }, { status: 422 })
    }

    // 4. حساب عمولة المنصة
    const applicationFeeAmount = Math.round(unitAmount * (PLATFORM_FEE_PERCENT / 100))

    // 5. إنشاء جلسة الدفع في Stripe Checkout
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
              metadata: { listingId, tierId: tierId ?? '' },
            },
          },
          quantity: 1,
        },
      ],

      // توزيع المبلغ: البائع يستلم الصافي وال
