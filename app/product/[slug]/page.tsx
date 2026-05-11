// app/product/[slug]/page.tsx
// Dynamic SEO metadata + Open Graph image for every product page.
// When shared on Twitter / WhatsApp / LinkedIn, shows:
//   - Product thumbnail (1200×630)
//   - Title, price, seller name, star rating
//   - DEGITALE branding

import type { Metadata } from 'next'
import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

// ── generateMetadata ────────────────────────────────────────────────────────
// Next.js calls this at build time (SSG) or request time (SSR) per page.
// The return value populates <head> automatically.
export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const supabase = createServerClient()

  const { data: listing } = await supabase
    .from('listings')
    .select(`
      title, description, base_price, compare_price, currency,
      thumbnail_url, rating_avg, rating_count, sales_count,
      categories ( name ),
      stores ( name, slug )
    `)
    .eq('slug', params.slug)
    .eq('status', 'active')
    .single()

  if (!listing) {
    return {
      title: 'Product not found — DEGITALE',
    }
  }

  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? 'https://degitale.com'
  const price    = listing.base_price ? `$${listing.base_price.toFixed(2)}` : 'Free'
  const store    = (listing.stores as any)?.name ?? 'DEGITALE Seller'
  const category = (listing.categories as any)?.name ?? 'Digital Product'
  const rating   = listing.rating_avg ? ` · ★ ${listing.rating_avg.toFixed(1)}` : ''
  const pageUrl  = `${appUrl}/product/${params.slug}`

  // OG image: use dynamic ImageResponse route, or fall back to thumbnail
  const ogImageUrl = listing.thumbnail_url
    ? `${appUrl}/api/og?title=${encodeURIComponent(listing.title)}&price=${encodeURIComponent(price)}&seller=${encodeURIComponent(store)}&category=${encodeURIComponent(category)}&rating=${encodeURIComponent(rating)}&thumb=${encodeURIComponent(listing.thumbnail_url)}`
    : `${appUrl}/og-default.png`

  const description = (listing.description ?? '')
    .replace(/\n/g, ' ')
    .slice(0, 155)
    .trimEnd() + '…'

  return {
    // ── Core ────────────────────────────────────────────────────────────
    title:       `${listing.title} — ${price} | DEGITALE`,
    description,
    alternates:  { canonical: pageUrl },

    // ── Open Graph (Facebook, WhatsApp, LinkedIn, Slack) ────────────────
    openGraph: {
      type:        'website',
      url:         pageUrl,
      siteName:    'DEGITALE',
      title:       listing.title,
      description: `${price} · ${category} by ${store}${rating}`,
      images: [
        {
          url:    ogImageUrl,
          width:  1200,
          height: 630,
          alt:    `${listing.title} — ${price}`,
        },
      ],
    },

    // ── Twitter Card ─────────────────────────────────────────────────────
    twitter: {
      card:        'summary_large_image',
      title:       listing.title,
      description: `${price} · ${category} by ${store}${rating}`,
      images:      [ogImageUrl],
      creator:     '@degitale',
      site:        '@degitale',
    },

    // ── Product-specific meta (used by some parsers) ─────────────────────
    other: {
      'product:price:amount':   String(listing.base_price ?? 0),
      'product:price:currency': (listing.currency ?? 'USD').toUpperCase(),
      'og:price:amount':        String(listing.base_price ?? 0),
      'og:price:currency':      (listing.currency ?? 'USD').toUpperCase(),
    },
  }
}

// ── generateStaticParams (optional ISR) ─────────────────────────────────────
// Pre-renders the top 200 products at build time; the rest are SSR on demand.
export async function generateStaticParams() {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('listings')
    .select('slug')
    .eq('status', 'active')
    .order('sales_count', { ascending: false })
    .limit(200)

  return (data ?? []).map(l => ({ slug: l.slug }))
}

// ── Page component (abbreviated) ─────────────────────────────────────────────
export default async function ProductPage({ params }: { params: { slug: string } }) {
  const supabase = createServerClient()
  const { data: listing } = await supabase
    .from('listings')
    .select('*')
    .eq('slug', params.slug)
    .eq('status', 'active')
    .single()

  if (!listing) notFound()

  // Full page UI is in components/product/ProductPageClient.tsx
  // This server component fetches data + passes it down
  return <div>{/* ProductPageClient rendered here */}</div>
}


// ─────────────────────────────────────────────────────────────────────────────
// app/api/og/route.tsx
// Edge Runtime — generates a 1200×630 PNG on-the-fly using Next.js ImageResponse.
// Called by the og:image URL above. No Node.js dependencies — runs at the edge.
// ─────────────────────────────────────────────────────────────────────────────
/*
import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const title    = searchParams.get('title')    ?? 'Premium Digital Product'
  const price    = searchParams.get('price')    ?? '$0'
  const seller   = searchParams.get('seller')   ?? 'DEGITALE Store'
  const category = searchParams.get('category') ?? 'Digital Product'
  const rating   = searchParams.get('rating')   ?? ''
  const thumb    = searchParams.get('thumb')    ?? null

  // Load Playfair Display for the headline
  const playfairRes = await fetch(
    'https://fonts.gstatic.com/s/playfairdisplay/v37/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvUDQ.woff2'
  )
  const playfairData = await playfairRes.arrayBuffer()

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: '#08080E',
          padding: '0',
          fontFamily: 'DM Sans, sans-serif',
          position: 'relative',
        }}
      >
        // Left: product thumbnail
        {thumb && (
          <img
            src={thumb}
            style={{ width: 630, height: 630, objectFit: 'cover', flexShrink: 0 }}
            alt=""
          />
        )}

        // Right: product info panel
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '48px 48px 48px 44px',
            background: thumb ? '#08080E' : 'linear-gradient(135deg,#18181F,#08080E)',
          }}
        >
          // DEGITALE branding
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, background: '#C9A84C', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#08080E', fontWeight: 700, fontSize: 13 }}>D</div>
            <span style={{ color: '#F0EDE6', fontSize: 14, letterSpacing: 3, fontWeight: 700 }}>DEGITALE</span>
          </div>

          // Category pill
          <div>
            <span style={{ display: 'inline-block', border: '1px solid rgba(201,168,76,.3)', borderRadius: 20, padding: '4px 14px', fontSize: 12, color: '#C9A84C', marginBottom: 14 }}>
              {category}
            </span>
            <div style={{ fontSize: thumb ? 26 : 38, fontFamily: 'Playfair Display', fontWeight: 700, color: '#F0EDE6', lineHeight: 1.2, marginBottom: 12 }}>
              {title.length > 50 ? title.slice(0, 50) + '…' : title}
            </div>
            <div style={{ fontSize: 13, color: '#7A7872', marginBottom: 8 }}>by {seller}{rating}</div>
          </div>

          // Price badge
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'Playfair Display', fontSize: 36, fontWeight: 700, color: '#C9A84C' }}>
              {price}
            </span>
            <span style={{ background: '#C9A84C', color: '#08080E', borderRadius: 8, padding: '10px 22px', fontSize: 14, fontWeight: 700 }}>
              Buy Now
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width:  1200,
      height: 630,
      fonts: [{ name: 'Playfair Display', data: playfairData, weight: 700 }],
    }
  )
}
*/
