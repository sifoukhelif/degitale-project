import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendOrderEmails } from '@/lib/email/sendOrderEmails'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature') as string

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET)
  } catch (err: any) {
    console.error(`[Stripe Webhook Error]: ${err.message}`)
    return NextResponse.json({ error: err.message }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const metadata = session.metadata || {}

    const supabase = createAdminClient()

    try {
      // 1. تسجيل الطلب في قاعدة البيانات
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          buyer_id: metadata.buyerId,
          listing_id: metadata.listingId,
          store_id: metadata.storeId,
          tier_id: metadata.tierId || null,
          stripe_session_id: session.id,
          amount_total: session.amount_total ? session.amount_total / 100 : 0,
          status: 'completed'
        })
        .select()
        .single()

      if (orderErr) throw orderErr

      // 2. تحديث عداد المبيعات عبر RPC
      await supabase.rpc('increment_sales_count', { 
        p_listing_id: metadata.listingId, 
        p_store_id: metadata.storeId 
      })

      // 3. إرسال الإيميل (التصحيح: استخدام email بدلاً من buyerEmail)
      await sendOrderEmails({
        orderId: order.id,
        email: session.customer_details?.email || '', 
        productTitle: session.line_items?.data?.[0]?.description || 'منتج رقمي',
        downloadExpiryHours: parseInt(metadata.downloadExpiryHours || '48')
      })

    } catch (dbErr: any) {
      console.error('[Database/Email Error]:', dbErr.message)
      return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true }, { status: 200 })
}
