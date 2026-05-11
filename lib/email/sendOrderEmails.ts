// lib/email/sendOrderEmails.ts
// Sends two transactional emails after a successful purchase:
//   1. Buyer → download receipt with secure link (products) or confirmation (services)
//   2. Seller → sale notification with order summary
//
// Uses Resend (resend.com) + React Email for type-safe, beautifully styled templates.
// Both emails are sent in parallel — failure of one doesn't block the other.

import { Resend } from 'resend'
import { BuyerReceiptEmail } from './templates/BuyerReceiptEmail'
import { SellerSaleEmail }   from './templates/SellerSaleEmail'

const resend = new Resend(process.env.RESEND_API_KEY!)
const FROM   = 'DEGITALE <orders@degitale.com>'
const REPLY  = 'support@degitale.com'

// ── Types ──────────────────────────────────────────────────────────────────
export interface OrderEmailPayload {
  buyer:   { email: string; name: string }
  seller:  { email: string; name: string; storeName: string }
  listing: {
    title:    string
    type:     'product' | 'service'
    amount:   number
    currency: string
    orderId:  string
  }
  downloadUrl: string | null  // null for services
}

// ── Main dispatcher ────────────────────────────────────────────────────────
export async function sendOrderEmails(payload: OrderEmailPayload): Promise<void> {
  const [buyerResult, sellerResult] = await Promise.allSettled([
    sendBuyerEmail(payload),
    sendSellerEmail(payload),
  ])

  if (buyerResult.status  === 'rejected') console.error('[Email] Buyer email failed:',  buyerResult.reason)
  if (sellerResult.status === 'rejected') console.error('[Email] Seller email failed:', sellerResult.reason)
}

// ── Buyer receipt ──────────────────────────────────────────────────────────
async function sendBuyerEmail(p: OrderEmailPayload) {
  const isProduct   = p.listing.type === 'product'
  const subjectLine = isProduct
    ? `Your download is ready — ${p.listing.title}`
    : `Order confirmed — ${p.listing.title}`

  await resend.emails.send({
    from:     FROM,
    to:       p.buyer.email,
    replyTo:  REPLY,
    subject:  subjectLine,
    react:    BuyerReceiptEmail({
      buyerName:    p.buyer.name,
      listingTitle: p.listing.title,
      listingType:  p.listing.type,
      amount:       p.listing.amount,
      currency:     p.listing.currency,
      orderId:      p.listing.orderId,
      downloadUrl:  p.downloadUrl,
      storeName:    p.seller.storeName,
      supportEmail: REPLY,
    }),
  })
}

// ── Seller sale notification ───────────────────────────────────────────────
async function sendSellerEmail(p: OrderEmailPayload) {
  await resend.emails.send({
    from:     FROM,
    to:       p.seller.email,
    replyTo:  REPLY,
    subject:  `New sale: ${p.listing.title} — $${p.listing.amount.toFixed(2)}`,
    react:    SellerSaleEmail({
      sellerName:   p.seller.name,
      storeName:    p.seller.storeName,
      listingTitle: p.listing.title,
      listingType:  p.listing.type,
      amount:       p.listing.amount,
      platformFee:  Math.round(p.listing.amount * 0.20 * 100) / 100,
      netEarning:   Math.round(p.listing.amount * 0.80 * 100) / 100,
      currency:     p.listing.currency,
      orderId:      p.listing.orderId,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/orders`,
    }),
  })
}


// ─────────────────────────────────────────────────────────────────────────
// lib/email/templates/BuyerReceiptEmail.tsx
// React Email template — buyer download receipt
// ─────────────────────────────────────────────────────────────────────────
/*
import {
  Html, Head, Body, Container, Section, Heading, Text, Button,
  Hr, Link, Preview, Font,
} from '@react-email/components'

interface Props {
  buyerName:    string
  listingTitle: string
  listingType:  'product' | 'service'
  amount:       number
  currency:     string
  orderId:      string
  downloadUrl:  string | null
  storeName:    string
  supportEmail: string
}

export function BuyerReceiptEmail({
  buyerName, listingTitle, listingType, amount, currency,
  orderId, downloadUrl, storeName, supportEmail,
}: Props) {
  const isProduct = listingType === 'product'

  return (
    <Html lang="en" dir="ltr">
      <Head>
        <Font
          fontFamily="DM Sans"
          fallbackFontFamily="Helvetica"
          webFont={{ url: 'https://fonts.gstatic.com/s/dmsans/v14/rP2Hp2ywxg089UriOZSCHBeHFl0.woff2', format: 'woff2' }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>
        {isProduct
          ? `Your download is ready — ${listingTitle}`
          : `Order confirmed — ${listingTitle}`}
      </Preview>
      <Body style={{ background: '#08080E', fontFamily: 'DM Sans, Helvetica, sans-serif', padding: '40px 0' }}>
        <Container style={{ maxWidth: 560, margin: '0 auto', background: '#111118', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(240,237,230,0.07)' }}>

          {-- Header --}
          <Section style={{ background: '#18181F', padding: '24px 32px', borderBottom: '1px solid rgba(240,237,230,0.07)' }}>
            <Heading style={{ fontFamily: 'Georgia, serif', color: '#F0EDE6', fontSize: 22, margin: 0, letterSpacing: 3 }}>
              DEGI<span style={{ color: '#C9A84C' }}>TALE</span>
            </Heading>
          </Section>

          {-- Body --}
          <Section style={{ padding: '32px' }}>
            <Text style={{ color: '#7A7872', fontSize: 13, margin: '0 0 6px' }}>
              Hi {buyerName},
            </Text>
            <Heading as="h2" style={{ color: '#F0EDE6', fontSize: 20, margin: '0 0 20px', fontFamily: 'Georgia, serif' }}>
              {isProduct ? 'Your download is ready' : 'Your order is confirmed'}
            </Heading>

            {-- Order summary box --}
            <Section style={{ background: '#18181F', borderRadius: 12, padding: '16px 20px', marginBottom: 24, border: '1px solid rgba(240,237,230,0.07)' }}>
              <Text style={{ color: '#7A7872', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 10px' }}>
                Order summary
              </Text>
              <Text style={{ color: '#F0EDE6', fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>
                {listingTitle}
              </Text>
              <Text style={{ color: '#7A7872', fontSize: 12, margin: '0 0 12px' }}>
                Sold by {storeName}
              </Text>
              <Hr style={{ border: 'none', borderTop: '1px solid rgba(240,237,230,0.07)', margin: '12px 0' }} />
              <Text style={{ color: '#C9A84C', fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 700, margin: 0 }}>
                {currency} {amount.toFixed(2)}
              </Text>
              <Text style={{ color: '#4A4842', fontSize: 11, margin: '4px 0 0' }}>
                Order #{orderId.slice(0, 8).toUpperCase()}
              </Text>
            </Section>

            {isProduct && downloadUrl && (
              <>
                <Text style={{ color: '#F0EDE6', fontSize: 14, margin: '0 0 16px', lineHeight: 1.6 }}>
                  Click the button below to download your file. This link is unique to your order and
                  <strong style={{ color: '#C9A84C' }}> expires in 48 hours</strong>.
                  Do not share it — each click counts against your download limit.
                </Text>
                <Button
                  href={downloadUrl}
                  style={{ background: '#C9A84C', color: '#08080E', borderRadius: 10, padding: '14px 28px', fontSize: 15, fontWeight: 700, display: 'inline-block', textDecoration: 'none' }}
                >
                  Download your file
                </Button>
                <Text style={{ color: '#4A4842', fontSize: 11, margin: '12px 0 24px' }}>
                  Having trouble? Copy this link: {downloadUrl.slice(0, 60)}…
                </Text>
              </>
            )}

            {!isProduct && (
              <Text style={{ color: '#F0EDE6', fontSize: 14, margin: '0 0 24px', lineHeight: 1.6 }}>
                The seller has been notified and will begin work shortly.
                You'll receive updates on each milestone completion via email.
              </Text>
            )}

            <Hr style={{ border: 'none', borderTop: '1px solid rgba(240,237,230,0.07)', margin: '24px 0' }} />
            <Text style={{ color: '#4A4842', fontSize: 12, lineHeight: 1.6 }}>
              Questions? Reply to this email or contact{' '}
              <Link href={`mailto:${supportEmail}`} style={{ color: '#C9A84C' }}>
                {supportEmail}
              </Link>
              . DEGITALE offers a 30-day money-back guarantee.
            </Text>
          </Section>

          {-- Footer --}
          <Section style={{ background: '#0A0A10', padding: '16px 32px', borderTop: '1px solid rgba(240,237,230,0.05)' }}>
            <Text style={{ color: '#4A4842', fontSize: 11, margin: 0, textAlign: 'center' }}>
              © {new Date().getFullYear()} DEGITALE · Premium Digital Marketplace ·{' '}
              <Link href="https://degitale.com/unsubscribe" style={{ color: '#4A4842' }}>Unsubscribe</Link>
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  )
}
*/


// ─────────────────────────────────────────────────────────────────────────
// lib/email/templates/SellerSaleEmail.tsx
// React Email template — seller sale notification
// ─────────────────────────────────────────────────────────────────────────
/*
interface SellerProps {
  sellerName:   string
  storeName:    string
  listingTitle: string
  listingType:  'product' | 'service'
  amount:       number
  platformFee:  number
  netEarning:   number
  currency:     string
  orderId:      string
  dashboardUrl: string
}

export function SellerSaleEmail({
  sellerName, storeName, listingTitle, listingType,
  amount, platformFee, netEarning, currency, orderId, dashboardUrl,
}: SellerProps) {
  return (
    <Html lang="en">
      <Preview>New sale: {listingTitle} — {currency} {amount.toFixed(2)}</Preview>
      <Body style={{ background: '#08080E', fontFamily: 'DM Sans, Helvetica, sans-serif', padding: '40px 0' }}>
        <Container style={{ maxWidth: 520, margin: '0 auto', background: '#111118', borderRadius: 16, border: '1px solid rgba(240,237,230,0.07)' }}>

          <Section style={{ background: '#18181F', padding: '20px 32px', borderBottom: '1px solid rgba(240,237,230,0.07)' }}>
            <Text style={{ color: '#C9A84C', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', margin: 0 }}>
              DEGITALE · New sale
            </Text>
          </Section>

          <Section style={{ padding: '28px 32px' }}>
            <Text style={{ color: '#7A7872', fontSize: 13, margin: '0 0 4px' }}>
              Hi {sellerName},
            </Text>
            <Heading as="h2" style={{ color: '#F0EDE6', fontSize: 20, margin: '0 0 20px', fontFamily: 'Georgia, serif' }}>
              You just made a sale
            </Heading>

            {-- Listing sold --}
            <Text style={{ color: '#F0EDE6', fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>
              {listingTitle}
            </Text>
            <Text style={{ color: '#7A7872', fontSize: 12, margin: '0 0 20px' }}>
              {storeName} · Order #{orderId.slice(0, 8).toUpperCase()}
            </Text>

            {-- Earnings breakdown --}
            <Section style={{ background: '#18181F', borderRadius: 12, padding: '16px 20px', marginBottom: 24, border: '1px solid rgba(240,237,230,0.07)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tr>
                  <td style={{ color: '#7A7872', fontSize: 12, padding: '5px 0' }}>Gross sale</td>
                  <td style={{ color: '#F0EDE6', fontSize: 12, fontWeight: 600, textAlign: 'right' }}>
                    {currency} {amount.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td style={{ color: '#7A7872', fontSize: 12, padding: '5px 0' }}>Platform fee (20%)</td>
                  <td style={{ color: '#E05555', fontSize: 12, textAlign: 'right' }}>
                    − {currency} {platformFee.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} style={{ borderTop: '1px solid rgba(240,237,230,0.07)', padding: '10px 0 0' }}></td>
                </tr>
                <tr>
                  <td style={{ color: '#F0EDE6', fontSize: 13, fontWeight: 600 }}>Your earnings</td>
                  <td style={{ color: '#C9A84C', fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 700, textAlign: 'right' }}>
                    {currency} {netEarning.toFixed(2)}
                  </td>
                </tr>
              </table>
            </Section>

            {listingType === 'service' && (
              <Text style={{ color: '#F0EDE6', fontSize: 13, lineHeight: 1.6, margin: '0 0 20px', background: 'rgba(201,168,76,0.08)', borderRadius: 8, padding: '12px 16px' }}>
                This is a service order. Log in to your dashboard to start the project and update milestone progress.
              </Text>
            )}

            <Button
              href={dashboardUrl}
              style={{ background: '#C9A84C', color: '#08080E', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}
            >
              View in dashboard →
            </Button>
          </Section>

          <Section style={{ background: '#0A0A10', padding: '14px 32px', borderTop: '1px solid rgba(240,237,230,0.05)' }}>
            <Text style={{ color: '#4A4842', fontSize: 11, margin: 0, textAlign: 'center' }}>
              Payouts are processed on a 7-day rolling basis via Stripe Connect.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
*/
