// lib/badges/sellerBadges.ts
// Defines all DEGITALE seller trust badges, their award criteria,
// and a server-side function to compute which badges a store has earned.
// Badges are cached in the stores.badges jsonb column and recomputed nightly.

import { createAdminClient } from '@/lib/supabase/admin'

// ── Badge definitions ────────────────────────────────────────────────────────
export type BadgeId =
  | 'top_rated'
  | 'verified_seller'
  | 'rising_star'
  | 'expert'
  | 'fast_delivery'
  | 'power_seller'
  | 'community_favourite'

export interface BadgeDef {
  id:          BadgeId
  label:       string
  description: string              // shown in tooltip
  icon:        string              // SVG path or emoji key
  colorClass:  string              // CSS class for Luxury Noir styling
  priority:    number              // display order (lower = more prominent)
}

export const BADGE_DEFINITIONS: Record<BadgeId, BadgeDef> = {
  top_rated: {
    id:          'top_rated',
    label:       'Top Rated',
    description: 'Maintained a rating of 4.8+ across 50+ reviews',
    icon:        'star',
    colorClass:  'badge-gold',
    priority:    1,
  },
  verified_seller: {
    id:          'verified_seller',
    label:       'Verified Seller',
    description: 'Identity verified · Stripe Connect active · payment history clean',
    icon:        'shield-check',
    colorClass:  'badge-green',
    priority:    2,
  },
  rising_star: {
    id:          'rising_star',
    label:       'Rising Star',
    description: 'Revenue grew 50%+ in the last 30 days',
    icon:        'trending-up',
    colorClass:  'badge-blue',
    priority:    3,
  },
  expert: {
    id:          'expert',
    label:       'Expert',
    description: 'Completed 500+ sales with a refund rate below 1%',
    icon:        'award',
    colorClass:  'badge-purple',
    priority:    4,
  },
  fast_delivery: {
    id:          'fast_delivery',
    label:       'Fast Delivery',
    description: 'Delivers service orders 20% faster than the stated deadline on average',
    icon:        'zap',
    colorClass:  'badge-amber',
    priority:    5,
  },
  power_seller: {
    id:          'power_seller',
    label:       'Power Seller',
    description: 'Over $10,000 in lifetime revenue on DEGITALE',
    icon:        'dollar',
    colorClass:  'badge-gold',
    priority:    6,
  },
  community_favourite: {
    id:          'community_favourite',
    label:       'Community Favourite',
    description: 'Products have been saved to wishlists 1,000+ times',
    icon:        'heart',
    colorClass:  'badge-pink',
    priority:    7,
  },
}

// ── Award logic (runs nightly via Supabase pg_cron or Edge Function) ─────────
export interface StoreMetrics {
  storeId:           string
  ratingAvg:         number
  ratingCount:       number
  totalSales:        number
  lifetimeRevenue:   number
  revenueGrowthPct:  number    // MoM
  refundRate:        number     // 0–1
  avgDeliveryRatio:  number     // actual_days / promised_days — below 0.8 = fast
  wishlistCount:     number
  stripeVerified:    boolean
  identityVerified:  boolean
}

export function computeBadges(metrics: StoreMetrics): BadgeId[] {
  const awarded: BadgeId[] = []

  if (metrics.stripeVerified && metrics.identityVerified) {
    awarded.push('verified_seller')
  }
  if (metrics.ratingAvg >= 4.8 && metrics.ratingCount >= 50) {
    awarded.push('top_rated')
  }
  if (metrics.revenueGrowthPct >= 50) {
    awarded.push('rising_star')
  }
  if (metrics.totalSales >= 500 && metrics.refundRate < 0.01) {
    awarded.push('expert')
  }
  if (metrics.avgDeliveryRatio <= 0.8 && metrics.totalSales >= 20) {
    awarded.push('fast_delivery')
  }
  if (metrics.lifetimeRevenue >= 10000) {
    awarded.push('power_seller')
  }
  if (metrics.wishlistCount >= 1000) {
    awarded.push('community_favourite')
  }

  // Sort by priority for consistent display order
  return awarded.sort(
    (a, b) => BADGE_DEFINITIONS[a].priority - BADGE_DEFINITIONS[b].priority
  )
}

// ── Nightly recompute job (call from Edge Function or pg_cron) ───────────────
export async function recomputeAllBadges() {
  const supabase = createAdminClient()

  // Fetch metrics for all active stores in one query
  const { data: stores, error } = await supabase.rpc('get_store_badge_metrics')
  if (error) throw error

  const updates = (stores as StoreMetrics[]).map(metrics => ({
    id:     metrics.storeId,
    badges: computeBadges(metrics),
  }))

  // Batch upsert
  const { error: upsertErr } = await supabase
    .from('stores')
    .upsert(updates.map(u => ({ id: u.id, badges: u.badges, badges_updated_at: new Date().toISOString() })))
  if (upsertErr) throw upsertErr

  return updates.length
}


// ─────────────────────────────────────────────────────────────────────────────
// components/seller/SellerBadges.tsx
// Display component — renders earned badges in Luxury Noir style.
// Used in: product page seller card, store profile, dashboard sidebar.
// ─────────────────────────────────────────────────────────────────────────────
/*
'use client'

import { BADGE_DEFINITIONS, type BadgeId } from '@/lib/badges/sellerBadges'
import { useState } from 'react'

interface Props {
  badges:     BadgeId[]
  maxVisible?: number          // truncate for compact layouts (e.g. 3 in sidebar)
  size?:      'sm' | 'md'
}

const BADGE_ICONS: Record<string, JSX.Element> = {
  star: (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <polygon points="8,1 10,6 15,6 11,9.5 12.5,15 8,12 3.5,15 5,9.5 1,6 6,6"/>
    </svg>
  ),
  'shield-check': (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M8 1l6 2.5v4C14 11 11.5 14 8 15 4.5 14 2 11 2 7.5v-4L8 1z"/>
      <path d="M5.5 8l2 2 3-3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  // Add remaining icons...
}

export function SellerBadges({ badges, maxVisible = badges.length, size = 'md' }: Props) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? badges : badges.slice(0, maxVisible)
  const overflow = badges.length - maxVisible

  return (
    <div className="seller-badges" role="list" aria-label="Seller achievement badges">
      {visible.map(badgeId => {
        const def = BADGE_DEFINITIONS[badgeId]
        return (
          <div
            key={badgeId}
            className={`seller-badge ${def.colorClass} ${size}`}
            role="listitem"
            tabIndex={0}
            aria-label={`${def.label}: ${def.description}`}
            title={def.description}
          >
            <span className="badge-icon" aria-hidden="true">
              {BADGE_ICONS[def.icon] ?? null}
            </span>
            <span className="badge-label">{def.label}</span>
          </div>
        )
      })}

      {!showAll && overflow > 0 && (
        <button
          className="badge-overflow"
          onClick={() => setShowAll(true)}
          aria-label={`Show ${overflow} more badges`}
        >
          +{overflow} more
        </button>
      )}
    </div>
  )
}
*/

// ── SQL: get_store_badge_metrics RPC ────────────────────────────────────────
/*
CREATE OR REPLACE FUNCTION get_store_badge_metrics()
RETURNS TABLE (
  "storeId"           uuid,
  "ratingAvg"         numeric,
  "ratingCount"       bigint,
  "totalSales"        bigint,
  "lifetimeRevenue"   numeric,
  "revenueGrowthPct"  numeric,
  "refundRate"        numeric,
  "avgDeliveryRatio"  numeric,
  "wishlistCount"     bigint,
  "stripeVerified"    boolean,
  "identityVerified"  boolean
) AS $$
SELECT
  s.id                                              AS "storeId",
  coalesce(s.rating_avg,0)                          AS "ratingAvg",
  s.rating_count                                    AS "ratingCount",
  s.sales_count                                     AS "totalSales",
  coalesce(sum(o.total_amount),0)                   AS "lifetimeRevenue",
  0                                                 AS "revenueGrowthPct",  -- computed separately
  0                                                 AS "refundRate",
  0                                                 AS "avgDeliveryRatio",
  0                                                 AS "wishlistCount",
  s.stripe_verified                                 AS "stripeVerified",
  s.identity_verified                               AS "identityVerified"
FROM stores s
LEFT JOIN orders o ON o.id IN (
  SELECT oi.order_id FROM order_items oi
  JOIN listings l ON l.id = oi.listing_id
  WHERE l.store_id = s.id AND o.status = 'paid'
)
GROUP BY s.id;
$$ LANGUAGE sql SECURITY DEFINER;
*/
