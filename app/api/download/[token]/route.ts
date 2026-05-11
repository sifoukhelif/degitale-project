// app/api/download/[token]/route.ts
// Called when buyer clicks the download link in their email.
//
// Security layers:
//   1. Token is a random hex string — 256 bits of entropy, stored as bcrypt hash
//   2. Expiry check — token_expires_at in DB, rejected if past
//   3. Download counter — increments on each valid fetch (enable limit_downloads on listing)
//   4. Redirect, not proxy — we redirect to a fresh short-lived Supabase signed URL
//      so the file bytes never pass through our server (saves bandwidth + latency)
//   5. IP logging — stored for abuse monitoring (not exposed to users)

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const REDIRECT_TTL_SECONDS = 30   // the "last mile" URL lives only 30 seconds

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params
  const supabase  = createAdminClient()
  const clientIp  = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown'

  // 1. Look up order_item by token (compare via constant-time bcrypt check in RPC)
  const { data: item, error } = await supabase
    .rpc('validate_download_token', { p_token: token })
    .single()

  if (error || !item) {
    return downloadError('Invalid or expired download link.')
  }

  const {
    order_item_id,
    listing_file_id,
    storage_path,
    token_expires_at,
    download_count,
    download_limit,    // null = unlimited
  } = item as {
    order_item_id:    string
    listing_file_id:  string
    storage_path:     string
    token_expires_at: string
    download_count:   number
    download_limit:   number | null
  }

  // 2. Expiry check
  if (new Date() > new Date(token_expires_at)) {
    return downloadError('This download link has expired. Please contact support to get a new one.')
  }

  // 3. Download limit check
  if (download_limit !== null && download_count >= download_limit) {
    return downloadError('Download limit reached for this purchase.')
  }

  // 4. Generate fresh short-lived signed URL (30 seconds — just enough to start download)
  const { data: signed, error: signErr } = await supabase
    .storage
    .from('listing-files')
    .createSignedUrl(storage_path, REDIRECT_TTL_SECONDS, {
      download: true,  // sets Content-Disposition: attachment — forces download not preview
    })

  if (signErr || !signed?.signedUrl) {
    console.error('[Download] Signed URL error:', signErr)
    return downloadError('File temporarily unavailable. Please try again in a moment.')
  }

  // 5. Increment download counter + log IP (fire-and-forget)
  supabase.rpc('record_download', {
    p_order_item_id: order_item_id,
    p_ip_address:    clientIp,
  }).then(({ error }) => {
    if (error) console.error('[Download] Counter update failed:', error)
  })

  // 6. 302 redirect to the signed URL — browser fetches directly from Supabase CDN
  return NextResponse.redirect(signed.signedUrl, { status: 302 })
}

// ── Error response ─────────────────────────────────────────────────────────
function downloadError(message: string) {
  // Returns a minimal HTML page so it looks right when opened in a browser tab
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Download Error — DEGITALE</title>
  <style>
    body { background: #08080E; color: #F0EDE6; font-family: DM Sans, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; padding: 20px; }
    .card { background: #18181F; border: 1px solid rgba(224,85,85,.25); border-radius: 16px; padding: 40px 32px; max-width: 440px; }
    h1 { font-family: Georgia, serif; font-size: 22px; color: #E05555; margin: 0 0 12px; }
    p  { color: #7A7872; font-size: 14px; line-height: 1.6; margin: 0 0 24px; }
    a  { background: #C9A84C; color: #08080E; border-radius: 8px; padding: 10px 22px; text-decoration: none; font-size: 13px; font-weight: 700; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Download unavailable</h1>
    <p>${message}</p>
    <a href="https://degitale.com/orders">View my orders</a>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    status: 410,   // 410 Gone — appropriate for expired/invalid links
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

// ── Supabase RPCs (run in SQL editor) ────────────────────────────────────
/*
-- Validates token using constant-time bcrypt comparison
CREATE OR REPLACE FUNCTION validate_download_token(p_token text)
RETURNS json AS $$
DECLARE v json;
BEGIN
  SELECT json_build_object(
    'order_item_id',   oi.id,
    'listing_file_id', lf.id,
    'storage_path',    lf.storage_path,
    'token_expires_at',oi.token_expires_at,
    'download_count',  oi.download_count,
    'download_limit',  l.limit_downloads
  ) INTO v
  FROM order_items oi
  JOIN listing_files lf ON lf.listing_id = oi.listing_id
  JOIN listings l ON l.id = oi.listing_id
  WHERE oi.download_token = crypt(p_token, oi.download_token)
    AND oi.token_expires_at > now()
    AND lf.status = 'encrypted'
  ORDER BY lf.version DESC
  LIMIT 1;
  RETURN v;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increments counter + logs IP
CREATE OR REPLACE FUNCTION record_download(p_order_item_id uuid, p_ip_address text)
RETURNS void AS $$
BEGIN
  UPDATE order_items
  SET download_count = download_count + 1
  WHERE id = p_order_item_id;

  INSERT INTO download_logs (order_item_id, ip_address, downloaded_at)
  VALUES (p_order_item_id, p_ip_address, now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/
