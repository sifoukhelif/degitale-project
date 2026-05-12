import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { sendOrderEmails } from '../../../../lib/email/sendOrderEmails'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!

// ✅ تم حذف السطر القديم: export const config ... (غير مدعوم في Next.js 15)

export async function POST(req: NextRequest) {
  // 1. قراءة البيانات الخام (Raw Body) كـ نص
  // في Next.js 15، نستخدم req.text() مباشرة وهي تعمل بشكل مثالي مع Stripe
  const rawBody = await req.text()
  const sigHeader = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sigHeader, WEBHOOK_SECRET)
  } catch (err: any) {
    console.error('[Webhook] Signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // 2. معالجة الحدث فقط إذا كان checkout.session.completed
  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true })
  }

  const session = event.data.object as Stripe.Checkout.Session
  const meta = session.metadata ?? {}
  const { buyerId, listingId, storeId, tierId, downloadExpiryHours } = meta

  if (!buyerId || !listingId || !storeId) {
    console.error('[Webhook] Missing metadata', meta)
    return NextResponse.json({ error: 'Missing metadata' }, { status: 422 })
  }

  const supabase = createAdminClient()

  // 3. التحقق من التكرار (Idempotency)
  const { data: existing } = await supabase
    .from('orders')
    .select('id')
    .eq('stripe_session_id', session.id)
    .maybeSingle()

  if (existing) {
    console.log('[Webhook] Duplicate event, already processed:', session.id)
    return NextResponse.json({ received: true })
  }

  // 4. جلب بيانات المنتج للتأكد من السعر
  const { data: listing } = await supabase
    .from('listings')
    .select('id, title, base_price, currency, type, stores(id)')
    .eq('id', listingId)
    .single()

  if (!listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  const amountTotal = (session.amount_total ?? 0) / 100
  const currency = session.currency?.toUpperCase() ?? 'USD'

  // 5. إدراج الطلب عبر RPC (Transaction)
  const { data: orderResult, error: orderErr } = await supabase
    .rpc('create_order_from_webhook', {
      p_buyer_id: buyerId,
      p_listing_id: listingId,
      p_tier_id: tierId || null,
      p_amount: amountTotal,
      p_currency: currency,
      p_stripe_session: session.id,
      p_stripe_intent: session.payment_intent as string,
    })

  if (orderErr || !orderResult) {
    console.error('[Webhook] DB insert failed:', orderErr)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  const { order_id, order_item_id } = orderResult as {
    order_id: string
    order_item_id: string
  }

  // 6. توليد رابط تحميل آمن (إذا كان منتجاً رقمياً)
  let downloadUrl: string | null = null

  if (listing.type === 'product') {
    const { data: file } = await supabase
      .from('listing_files')
      .select('id, storage_path')
      .eq('listing_id', listingId)
      .eq('status', 'encrypted')
      .order('version', { ascending: false })
      .maybeSingle()

    if (file) {
      const expirySeconds = parseInt(downloadExpiryHours ?? '48') * 3600
      const { data: signed, error: signErr } = await supabase
        .storage
        .from('listing-files')
        .createSignedUrl(file.storage_path, expirySeconds)

      if (signErr) {
        console.error('[Webhook] Signed URL error:', signErr)
      } else {
        downloadUrl = signed.signedUrl
        await supabase.rpc('store_download_token', {
          p_order_item_id: order_item_id,
          p_signed_url: downloadUrl,
          p_ttl_hours: parseInt(downloadExpiryHours ?? '48'),
        })
      }
    }
  }

  // 7. جلب تفاصيل المشتري والبائع للبريد الإلكتروني
  const [buyerRes, sellerRes] = await Promise.all([
    supabase.from('users').select('email, full_name').eq('id', buyerId).single(),
    supabase
      .from('stores')
      .select('name, users:owner_id(email, full_name)')
      .eq('id', storeId)
      .single(),
  ])

  // 8. إرسال الإيميلات (خلف الكواليس)
  sendOrderEmails({
    buyer: {
      email: buyerRes.data?.email ?? '',
      name: buyerRes.data?.full_name ?? 'Valued Customer',
    },
    seller: {
      email: (sellerRes.data?.users as any)?.email ?? '',
      name: (sellerRes.data?.users as any)?.full_name ?? 'Store Owner',
      storeName: sellerRes.data?.name ?? '',
    },
    listing: {
      title: listing.title,
      type: listing.type,
      amount: amountTotal,
      currency,
      orderId: order_id,
    },
    downloadUrl,
  }).catch(err => console.error('[Webhook] Email error:', err))

  return NextResponse.json({ received: true, orderId: order_id })
}
