// components/ads/AdSlot.tsx
// Unified ad component supporting:
//   1. Platform internal promotions (hardcoded props)
//   2. Google AdSense (renders <ins> tag)
//   3. Direct advertiser banners (image + CTA)
//
// Design: stays within Luxury Noir palette — dashed gold border,
// transparent background, never breaks page flow.

'use client'

import { useEffect, useRef } from 'react'
import { clsx } from 'clsx'

// ─── Types ────────────────────────────────────────────────────────────────
type AdVariant = 'platform' | 'adsense' | 'direct'

interface PlatformAdProps {
  variant: 'platform'
  headline: string
  sub: string
  ctaLabel: string
  ctaHref: string
  /** GA/internal tracking ID */
  trackingId?: string
}

interface AdSenseAdProps {
  variant: 'adsense'
  /** AdSense slot ID from Google dashboard */
  slotId: string
  format?: 'auto' | 'rectangle' | 'leaderboard'
  /** Layout: 'in-article' for feed ads */
  layout?: string
}

interface DirectAdProps {
  variant: 'direct'
  imageUrl: string
  altText: string
  ctaLabel: string
  ctaHref: string
  advertiserName: string
}

type AdSlotProps = (PlatformAdProps | AdSenseAdProps | DirectAdProps) & {
  className?: string
  /** Where this slot appears — used for analytics */
  placement: 'dashboard-top' | 'dashboard-wallet' | 'listing-sidebar' | 'checkout-footer'
  /** If false, slot renders null (e.g., for Pro subscribers) */
  enabled?: boolean
}

// ─── Component ────────────────────────────────────────────────────────────
export function AdSlot({ enabled = true, placement, className, ...props }: AdSlotProps) {
  const adRef = useRef<HTMLModElement>(null)

  // Track impression (replace with your analytics provider)
  useEffect(() => {
    if (!enabled) return
    // Example: analytics.track('ad_impression', { placement, variant: props.variant })
  }, [enabled, placement])

  if (!enabled) return null

  return (
    <div
      className={clsx('ad-slot', `ad-slot--${props.variant}`, `ad-slot--${placement}`, className)}
      data-ad-placement={placement}
      aria-label="Advertisement"
    >
      {props.variant === 'platform' && (
        <PlatformAd {...props} placement={placement} />
      )}
      {props.variant === 'adsense' && (
        <AdSenseAd ref={adRef} {...props} />
      )}
      {props.variant === 'direct' && (
        <DirectAd {...props} placement={placement} />
      )}
    </div>
  )
}

// ── Platform internal ad (most common — used in vendor dashboard) ──────────
function PlatformAd({
  headline, sub, ctaLabel, ctaHref, placement,
}: PlatformAdProps & { placement: string }) {
  return (
    <div className="ad-platform">
      <span className="ad-badge">Promoted</span>
      <div className="ad-body">
        <p className="ad-headline">{headline}</p>
        <p className="ad-sub">{sub}</p>
      </div>
      <a
        href={ctaHref}
        className="ad-cta"
        onClick={() => {
          // analytics.track('ad_click', { placement, headline })
        }}
      >
        {ctaLabel}
      </a>
    </div>
  )
}

// ── Google AdSense (lazy-initialised after mount) ─────────────────────────
const AdSenseAd = ({ slotId, format = 'auto', layout }: AdSenseAdProps) => {
  useEffect(() => {
    try {
      // Push ad after hydration
      ;(window as any).adsbygoogle = (window as any).adsbygoogle || []
      ;(window as any).adsbygoogle.push({})
    } catch {
      // AdSense not loaded in dev — silent fail
    }
  }, [])

  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block' }}
      data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}
      data-ad-slot={slotId}
      data-ad-format={format}
      data-ad-layout={layout}
      data-full-width-responsive="true"
    />
  )
}

// ── Direct advertiser banner ───────────────────────────────────────────────
function DirectAd({
  imageUrl, altText, ctaLabel, ctaHref, advertiserName, placement,
}: DirectAdProps & { placement: string }) {
  return (
    <div className="ad-direct">
      <span className="ad-badge">Ad · {advertiserName}</span>
      <img src={imageUrl} alt={altText} className="ad-image" loading="lazy" />
      <a
        href={ctaHref}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="ad-cta"
        onClick={() => {
          // analytics.track('ad_click', { placement, advertiserName })
        }}
      >
        {ctaLabel}
      </a>
    </div>
  )
}

// ─── Usage examples ───────────────────────────────────────────────────────
//
// 1. Platform promo inside vendor dashboard:
// <AdSlot
//   variant="platform"
//   placement="dashboard-top"
//   headline="Boost store visibility — DEGITALE Pro"
//   sub="Get featured in search. From $9/mo."
//   ctaLabel="Upgrade"
//   ctaHref="/pricing"
//   enabled={!user.isPro}   // hide for Pro subscribers
// />
//
// 2. Google AdSense in listing sidebar:
// <AdSlot
//   variant="adsense"
//   placement="listing-sidebar"
//   slotId="1234567890"
//   format="rectangle"
// />
//
// 3. Direct banner in checkout:
// <AdSlot
//   variant="direct"
//   placement="checkout-footer"
//   imageUrl="https://cdn.degitale.com/ads/notion-banner.jpg"
//   altText="Notion templates"
//   ctaLabel="Visit"
//   ctaHref="https://partner.example.com"
//   advertiserName="NotionHQ"
// />
