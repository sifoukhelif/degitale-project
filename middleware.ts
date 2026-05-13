// next.config.js — مُصلح لـ Next.js 16
/** @type {import('next').NextConfig} */
const nextConfig = {

  // ── Images ───────────────────────────────────────────────────────────────
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/render/image/**',
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },

  // ── Security headers ─────────────────────────────────────────────────────
  async headers() {
    const securityHeaders = [
      { key: 'X-DNS-Prefetch-Control',   value: 'on' },
      { key: 'X-Frame-Options',           value: 'DENY' },
      { key: 'X-Content-Type-Options',    value: 'nosniff' },
      { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
    ]

    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        source: '/_next/static/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/api/(.*)',
        headers: [{ key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' }],
      },
    ]
  },

  // ── Redirects ────────────────────────────────────────────────────────────
  async redirects() {
    return [
      { source: '/products/:slug', destination: '/product/:slug', permanent: true },
      { source: '/stores/:slug',   destination: '/store/:slug',   permanent: true },
    ]
  },

  // ── Compiler ─────────────────────────────────────────────────────────────
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },

}

module.exports = nextConfig
