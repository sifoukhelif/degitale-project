// app/api/download/[token]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * DEGITALE - معالج تحميل الملفات الرقمية
 * تم تحديثه ليتوافق مع Next.js 16 (Turbopack)
 */

const REDIRECT_TTL_SECONDS = 30 // مدة صلاحية الرابط الموقع (Signed URL)

// 1. تعريف واجهة السياق لضمان توافق الأنواع في Next.js 15/16
interface RouteContext {
  params: Promise<{ token: string }>
}

export async function GET(
  req: NextRequest,
  context: RouteContext // استقبال السياق الذي يحتوي على الوعد (Promise)
) {
  // 2. فك تغليف التوكن باستخدام await (إلزامي في النسخ الجديدة)
  const { token } = await context.params
  
  const supabase = createAdminClient()
  const clientIp = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown'

  // 3. التحقق من التوكن عبر RPC في سوبابيس (Constant-time comparison)
  const { data: item, error } = await supabase
    .rpc('validate_download_token', { p_token: token })
    .single()

  if (error || !item) {
    return downloadError('رابط التحميل غير صالح أو انتهت صلاحيته.')
  }

  const {
    order_item_id,
    storage_path,
    token_expires_at,
    download_count,
    download_limit, 
  } = item as {
    order_item_id:    string
    storage_path:     string
    token_expires_at: string
    download_count:   number
    download_limit:   number | null
  }

  // 4. فحص تاريخ انتهاء الصلاحية
  if (new Date() > new Date(token_expires_at)) {
    return downloadError('انتهت صلاحية هذا الرابط. يرجى مراجعة الدعم الفني.')
  }

  // 5. فحص الحد الأقصى للتحميلات
  if (download_limit !== null && download_count >= download_limit) {
    return downloadError('لقد وصلت للحد الأقصى لعدد مرات التحميل المسموح بها.')
  }

  // 6. توليد رابط تحميل موقع وآمن من مخزن سوبابيس (Signed URL)
  const { data: signed, error: signErr } = await supabase
    .storage
    .from('listing-files')
    .createSignedUrl(storage_path, REDIRECT_TTL_SECONDS, {
      download: true, // إجبار المتصفح على التحميل وليس العرض
    })

  if (signErr || !signed?.signedUrl) {
    console.error('[Download] Signed URL error:', signErr)
    return downloadError('الملف غير متاح حالياً، يرجى المحاولة بعد قليل.')
  }

  // 7. تحديث عداد التحميلات وتسجيل عنوان IP (Fire-and-forget)
  supabase.rpc('record_download', {
    p_order_item_id: order_item_id,
    p_ip_address:    clientIp,
  }).then(({ error }) => {
    if (error) console.error('[Download] Counter update failed:', error)
  })

  // 8. إعادة التوجيه (302 Redirect) إلى رابط التحميل النهائي
  return NextResponse.redirect(signed.signedUrl, { status: 302 })
}

// ── استجابة الخطأ بتنسيق HTML أنيق ──────────────────────────────────────
function downloadError(message: string) {
  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>خطأ في التحميل — DEGITALE</title>
  <style>
    body { background: #08080E; color: #F0EDE6; font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; padding: 20px; }
    .card { background: #18181F; border: 1px solid rgba(201,168,76,0.1); border-radius: 24px; padding: 48px 32px; max-width: 440px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
    h1 { font-size: 24px; color: #C9A84C; margin: 0 0 16px; }
    p  { color: #7A7872; font-size: 15px; line-height: 1.6; margin: 0 0 32px; }
    a  { background: #C9A84C; color: #08080E; border-radius: 12px; padding: 12px 28px; text-decoration: none; font-size: 14px; font-weight: 800; transition: 0.3s; }
    a:hover { opacity: 0.9; transform: scale(1.05); }
  </style>
</head>
<body>
  <div class="card">
    <h1>التحميل غير متاح</h1>
    <p>${message}</p>
    <a href="/dashboard/orders">العودة لطلباتي</a>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    status: 410,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
