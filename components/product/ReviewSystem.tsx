// components/product/ReviewSystem.tsx
// Fully accessible (WCAG 2.1 AA) review component.
// - Star rating filter with aria-pressed toggles
// - Helpful voting with optimistic UI
// - Verified purchase badge
// - Mobile-first responsive layout
// - "Gold on black" Luxury Noir aesthetic

'use client'

import { useState, useOptimistic, useTransition } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { toast } from 'sonner'

// ── Types ────────────────────────────────────────────────────────────────────
export interface Review {
  id:               string
  reviewer_id:      string
  rating:           number          // 1–5
  comment:          string
  created_at:       string
  is_verified:      boolean         // verified purchase
  helpful_count:    number
  reviewer_name:    string
  reviewer_avatar?: string
  reviewer_initials: string
  product_title?:   string          // for store-level reviews
}

interface RatingDistribution {
  5: number; 4: number; 3: number; 2: number; 1: number
}

interface Props {
  reviews:         Review[]
  distribution:    RatingDistribution
  averageRating:   number
  totalCount:      number
  listingId:       string
  currentUserId?:  string          // undefined = not logged in
}

// ── Colour palette for reviewer avatars (cycles by index) ──────────────────
const AVATAR_COLORS = [
  { bg: 'rgba(79,142,247,.15)',  text: '#4F8EF7' },
  { bg: 'rgba(201,168,76,.12)', text: '#C9A84C' },
  { bg: 'rgba(46,204,154,.10)', text: '#2ECC9A' },
  { bg: 'rgba(155,127,212,.12)',text: '#9B7FD4' },
  { bg: 'rgba(224,90,90,.10)',  text: '#E05555' },
]

// ── Helpers ──────────────────────────────────────────────────────────────────
function StarIcon({ filled, size = 14 }: { filled: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill={filled ? '#C9A84C' : 'rgba(201,168,76,.2)'}
      aria-hidden="true"
    >
      <polygon points="8,1 10,6 15,6 11,9.5 12.5,15 8,12 3.5,15 5,9.5 1,6 6,6" />
    </svg>
  )
}

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span role="img" aria-label={`${rating} out of 5 stars`} style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <StarIcon key={n} filled={n <= rating} size={size} />
      ))}
    </span>
  )
}

function RelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days  = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7)  return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} week${days >= 14 ? 's' : ''} ago`
  if (days < 365)return `${Math.floor(days / 30)} month${days >= 60 ? 's' : ''} ago`
  return `${Math.floor(days / 365)} year${days >= 730 ? 's' : ''} ago`
}

// ── Component ────────────────────────────────────────────────────────────────
export function ReviewSystem({
  reviews: initial, distribution, averageRating, totalCount,
  listingId, currentUserId,
}: Props) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const [filterStar, setFilterStar]   = useState<0 | 1 | 2 | 3 | 4 | 5>(0)
  const [sortBy, setSortBy]           = useState<'recent' | 'helpful' | 'high' | 'low'>('recent')
  const [votedIds, setVotedIds]       = useState<Set<string>>(new Set())
  const [isPending, startTransition]  = useTransition()

  // Optimistic helpful count updates
  const [optimisticReviews, updateOptimistic] = useOptimistic(
    initial,
    (state, id: string) =>
      state.map(r => r.id === id ? { ...r, helpful_count: r.helpful_count + 1 } : r)
  )

  // ── Mark helpful ────────────────────────────────────────────────────────
  function markHelpful(id: string) {
    if (votedIds.has(id)) return
    if (!currentUserId) { toast.info('Sign in to mark reviews as helpful.'); return }

    setVotedIds(prev => new Set([...prev, id]))
    startTransition(async () => {
      updateOptimistic(id)
      const { error } = await supabase.rpc('increment_review_helpful', { p_review_id: id })
      if (error) toast.error('Failed to record your vote.')
    })
  }

  // ── Filter + sort ───────────────────────────────────────────────────────
  const displayed = optimisticReviews
    .filter(r => filterStar === 0 || r.rating === filterStar)
    .sort((a, b) => {
      if (sortBy === 'helpful') return b.helpful_count - a.helpful_count
      if (sortBy === 'high')    return b.rating - a.rating
      if (sortBy === 'low')     return a.rating - b.rating
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  const pctOf = (star: 1 | 2 | 3 | 4 | 5) =>
    totalCount > 0 ? Math.round((distribution[star] / totalCount) * 100) : 0

  return (
    <section aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" className="reviews-section-title">
        Ratings &amp; reviews
      </h2>

      {/* ── Summary ── */}
      <div className="rating-summary" role="region" aria-label="Rating summary">
        <div className="rating-big" aria-label={`Average rating: ${averageRating.toFixed(1)} out of 5`}>
          <span className="rating-number">{averageRating.toFixed(1)}</span>
          <StarRow rating={Math.round(averageRating)} size={18} />
          <span className="rating-total">{totalCount.toLocaleString()} reviews</span>
        </div>

        <div className="rating-bars" role="list" aria-label="Rating distribution">
          {([5, 4, 3, 2, 1] as const).map(star => (
            <button
              key={star}
              role="listitem"
              className={`bar-row-btn ${filterStar === star ? 'active' : ''}`}
              onClick={() => setFilterStar(filterStar === star ? 0 : star)}
              aria-pressed={filterStar === star}
              aria-label={`${star} stars: ${pctOf(star)}% of reviews. Click to filter.`}
            >
              <span className="bar-label" aria-hidden="true">{star}★</span>
              <div
                className="bar-track"
                role="progressbar"
                aria-valuenow={pctOf(star)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${pctOf(star)}%`}
              >
                <div
                  className="bar-fill"
                  style={{
                    width: `${pctOf(star)}%`,
                    background: star >= 4 ? '#C9A84C' : star === 3 ? '#7A7872' : '#E05555',
                  }}
                />
              </div>
              <span className="bar-pct" aria-hidden="true">{pctOf(star)}%</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="review-controls" role="group" aria-label="Filter and sort options">
        <div className="star-filters">
          <button
            className={`star-filter-btn ${filterStar === 0 ? 'active' : ''}`}
            onClick={() => setFilterStar(0)}
            aria-pressed={filterStar === 0}
          >
            All
          </button>
          {([5, 4, 3] as const).map(star => (
            <button
              key={star}
              className={`star-filter-btn ${filterStar === star ? 'active' : ''}`}
              onClick={() => setFilterStar(filterStar === star ? 0 : star)}
              aria-pressed={filterStar === star}
            >
              {star}★
            </button>
          ))}
        </div>

        <label htmlFor="sort-select" className="sr-only">Sort reviews</label>
        <select
          id="sort-select"
          value={sortBy}
          onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className="sort-select"
          aria-label="Sort reviews by"
        >
          <option value="recent">Most recent</option>
          <option value="helpful">Most helpful</option>
          <option value="high">Highest rating</option>
          <option value="low">Lowest rating</option>
        </select>
      </div>

      {/* ── Review list ── */}
      <div
        className="review-feed"
        role="feed"
        aria-label={`${displayed.length} reviews`}
        aria-busy={isPending}
      >
        {displayed.length === 0 && (
          <p className="no-reviews" role="status" aria-live="polite">
            No reviews match the selected filter.
          </p>
        )}

        {displayed.map((review, idx) => {
          const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length]
          return (
            <article
              key={review.id}
              className="review-card"
              aria-label={`Review by ${review.reviewer_name}, ${review.rating} stars`}
            >
              {/* Header */}
              <header className="review-header">
                <div
                  className="reviewer-avatar"
                  style={{ background: avatarColor.bg, color: avatarColor.text }}
                  aria-hidden="true"
                >
                  {review.reviewer_initials}
                </div>
                <div className="reviewer-info">
                  <div className="reviewer-name">
                    {review.reviewer_name}
                    {review.is_verified && (
                      <span
                        className="verified-badge"
                        role="img"
                        aria-label="Verified purchase"
                      >
                        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                          <circle cx="8" cy="8" r="6.5" />
                          <path d="M4.5 8l2.5 2.5 4.5-4.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Verified
                      </span>
                    )}
                  </div>
                  <time className="review-date" dateTime={review.created_at}>
                    {RelativeTime(review.created_at)}
                  </time>
                </div>
                <StarRow rating={review.rating} size={13} />
              </header>

              {/* Body */}
              <p className="review-text">{review.comment}</p>

              {review.product_title && (
                <div className="review-product-tag" aria-label={`Purchased: ${review.product_title}`}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <path d="M16 10a4 4 0 01-8 0"/>
                  </svg>
                  {review.product_title}
                </div>
              )}

              {/* Helpful */}
              <footer className="review-footer">
                <span className="helpful-label" id={`hl-${review.id}`}>
                  Helpful?
                </span>
                <button
                  className={`helpful-btn ${votedIds.has(review.id) ? 'voted' : ''}`}
                  onClick={() => markHelpful(review.id)}
                  aria-label={`Mark review by ${review.reviewer_name} as helpful. ${review.helpful_count} people found this helpful.`}
                  aria-pressed={votedIds.has(review.id)}
                  aria-describedby={`hl-${review.id}`}
                  disabled={votedIds.has(review.id)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/>
                  </svg>
                  Yes ({review.helpful_count + (votedIds.has(review.id) ? 0 : 0)})
                </button>
              </footer>
            </article>
          )
        })}
      </div>
    </section>
  )
}

// ── SQL: increment_review_helpful RPC ────────────────────────────────────────
/*
CREATE OR REPLACE FUNCTION increment_review_helpful(p_review_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE reviews
  SET helpful_count = helpful_count + 1
  WHERE id = p_review_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/
