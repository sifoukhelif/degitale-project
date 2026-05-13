// app/product/[slug]/page.tsx
import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'

// ── generateMetadata ─────────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const supabase  = await createServerClient()

  const { data: listing } = await supabase
    .from('listings')
    .select('title, description, base_price, currency, thumbnail_url')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (!listing) return { title: 'منتج غير موجود | DEGITALE' }

  const price   = listing.base_price ? `$${listing.base_price.toFixed(2)}` : 'مجاناً'
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://degitale.com'

  return {
    title:       `${listing.title} — ${price} | DEGITALE`,
    description: listing.description?.slice(0, 155) ?? '',
    openGraph: {
      title:       listing.title,
      description: `${price} — ${listing.description?.slice(0, 100) ?? ''}`,
      images:      listing.thumbnail_url ? [{ url: listing.thumbnail_url, width: 1200, height: 630 }] : [],
      url:         `${appUrl}/product/${slug}`,
      siteName:    'DEGITALE',
    },
    twitter: {
      card:        'summary_large_image',
      title:       listing.title,
      description: `${price}`,
      images:      listing.thumbnail_url ? [listing.thumbnail_url] : [],
    },
  }
}

// ── Page Component ────────────────────────────────────────────────────────────
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase  = await createServerClient()

  const { data: listing } = await supabase
    .from('listings')
    .select(`
      id, title, slug, description, base_price, compare_price,
      currency, thumbnail_url, gallery_urls, sales_count,
      rating_avg, rating_count, type, tags,
      stores ( id, name, slug, rating_avg, sales_count )
    `)
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (!listing) notFound()

  const store   = listing.stores as any
  const price   = listing.base_price ?? 0
  const savings = listing.compare_price
    ? Math.round((1 - price / listing.compare_price) * 100)
    : null

  return (
    <div className="min-h-screen bg-[#08080E] text-[#F0EDE6] font-cairo">

      {/* ── Navigation ── */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#08080E]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-[#C9A84C] rounded-lg flex items-center justify-center text-[#08080E] font-black italic text-sm">D</div>
            <span className="font-bold tracking-widest uppercase text-sm hidden sm:block">DEGITALE</span>
          </Link>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <Link href="/" className="hover:text-[#C9A84C] transition-colors">الرئيسية</Link>
            <span>/</span>
            <Link href="/shop" className="hover:text-[#C9A84C] transition-colors">المتجر</Link>
            <span>/</span>
            <span className="text-gray-400 line-clamp-1 max-w-[200px]">{listing.title}</span>
          </div>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <main className="max-w-7xl mx-auto px-6 pt-28 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

          {/* Left — Thumbnail */}
          <div>
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-[#12121A] border border-white/5">
              {listing.thumbnail_url ? (
                <img
                  src={listing.thumbnail_url}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600 text-6xl">
                  📦
                </div>
              )}
              {savings && (
                <div className="absolute top-4 right-4 bg-[#2ECC9A] text-[#08080E] text-xs font-black px-3 py-1 rounded-full">
                  وفّر {savings}%
                </div>
              )}
            </div>

            {/* Tags */}
            {listing.tags && listing.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {(listing.tags as string[]).map((tag) => (
                  <span
                    key={tag}
                    className="bg-white/5 border border-white/10 text-gray-400 text-xs px-3 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Right — Info + Buy */}
          <div className="flex flex-col gap-6">

            {/* Store info */}
            {store && (
              <Link href={`/store/${store.slug}`} className="flex items-center gap-3 group w-fit">
                <div className="w-8 h-8 rounded-full bg-[#C9A84C]/20 flex items-center justify-center text-[#C9A84C] text-xs font-bold">
                  {store.name?.charAt(0) ?? 'S'}
                </div>
                <span className="text-sm text-gray-400 group-hover:text-[#C9A84C] transition-colors">
                  {store.name}
                </span>
                <span className="text-xs text-gray-600">· {store.sales_count ?? 0} مبيعة</span>
              </Link>
            )}

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-serif font-bold leading-tight">
              {listing.title}
            </h1>

            {/* Rating */}
            {listing.rating_avg && (
              <div className="flex items-center gap-2">
                <span className="text-[#C9A84C] text-sm">{'★'.repeat(Math.round(listing.rating_avg))}</span>
                <span className="text-sm font-bold">{listing.rating_avg.toFixed(1)}</span>
                <span className="text-xs text-gray-500">({listing.rating_count} تقييم)</span>
                <span className="text-xs text-gray-600 mr-2">· {listing.sales_count} مبيعة</span>
              </div>
            )}

            {/* Description */}
            <p className="text-gray-400 leading-relaxed text-sm">
              {listing.description}
            </p>

            {/* Price + Buy */}
            <div className="bg-[#12121A] border border-white/5 rounded-2xl p-6 flex flex-col gap-4">
              <div className="flex items-end gap-3">
                <span className="font-serif text-4xl font-black text-[#C9A84C]">
                  ${price.toFixed(2)}
                </span>
                {listing.compare_price && (
                  <span className="text-gray-500 text-lg line-through mb-1">
                    ${listing.compare_price.toFixed(2)}
                  </span>
                )}
              </div>

              <button className="w-full bg-[#C9A84C] text-[#08080E] py-4 rounded-xl font-black text-lg hover:scale-[1.02] transition-all shadow-[0_0_30px_rgba(201,168,76,0.2)]">
                اشترِ الآن
              </button>

              <div className="flex flex-col gap-2">
                {[
                  'رابط تحميل آمن ومشفّر',
                  'الرابط صالح 48 ساعة بعد الشراء',
                  'ضمان استرداد 30 يوماً',
                  'دفع آمن عبر Stripe',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="text-[#2ECC9A]">✓</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
