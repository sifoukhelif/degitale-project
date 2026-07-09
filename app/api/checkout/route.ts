import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendOrderEmails } from '@/lib/email/sendOrderEmails'

// 1. تهيئة Stripe بالإصدار الصحيح المتوافق مع المشروع
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  // Stripe يحتاج قراءة الجسم الخام (Raw Body) للتحقق من التوقيع
  const body = await req.text()
  const signature = req.headers.get('stripe-signature') as string

  let event: Stripe.Event

  try {
    // التحقق من أن الطلب قادم فعلياً من Stripe وليس طرفاً ثالثاً
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET)
  } catch (err: any) {
    console.error(`[Webhook Error]: ${err.message}`)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  // 2. معالجة الأحداث (Events)
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    // استخراج البيانات التي أرسلناها في الـ Metadata أثناء عملية الـ Checkout
    const { buyerId, listingId, storeId, tierId, downloadExpiryHours } = session.metadata || {}

    if (!buyerId || !listingId) {
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
    }

    const supabase = createAdminClient()

    try {
      // أ) إنشاء سجل الطلب في قاعدة البيانات (Orders Table)
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          buyer_id: buyerId,
          listing_id: listingId,
          store_id: storeId,
          tier_id: tierId || null,
          stripe_session_id: session.id,
          amount_total: session.amount_total ? session.amount_total / 100 : 0,
          status: 'completed'
        })
        .select()
        .single()

      if (orderErr) throw orderErr

      // ب) تحديث إحصائيات المبيعات للمنتج والمتجر (RPC)
      await supabase.rpc('increment_sales_count', { 
        p_listing_id: listingId, 
        p_store_id: storeId 
      })

      // ج) إرسال البريد الإلكتروني للمشتري (يحتوي على رابط التحميل الآمن)
      // الدالة مستوردة من lib/email
      await sendOrderEmails({
        orderId: order.id,
        email: session.customer_details?.email || '',
      })

      console.log(`[Webhook Success]: Order ${order.id} processed for user ${buyerId}`)
      
    } catch (dbErr: any) {
      console.error('[Webhook DB Error]:', dbErr.message)
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
    }
  }

  // الرد على Stripe بنجاح لاستلام الإشعار
  return NextResponse.json({ received: true }, { status: 200 })
}
