import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'

// Static, fully self-hosted fonts via @fontsource. Each import
// bundles the woff2 files into the build and injects `@font-face`
// rules pointing at them. No googleapis.com, no gstatic.com, no
// runtime font fetch — bytes ship with the JS bundle and are cached
// like any other static asset.
//
// (Was on next/font/google which DID self-host at build time, but
// the user wanted hard guarantees that the font setup couldn't be
// the source of any flash. @fontsource keeps everything in
// node_modules — easier to reason about, easier to audit.)
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource/space-grotesk/300.css'
import '@fontsource/space-grotesk/400.css'
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/600.css'
import '@fontsource/jetbrains-mono/300.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/600.css'
import './globals.css'

import { ApiHealthBanner } from '@/components/api-health-banner'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'

export const metadata: Metadata = {
  metadataBase: new URL('https://explorer.ligate.io'),
  title: {
    default: 'Ligate Explorer',
    template: '%s · Ligate Explorer',
  },
  description:
    'Block, transaction, schema, attestor set, and attestation explorer for Ligate Chain devnet.',
  applicationName: 'Ligate Explorer',
  authors: [{ name: 'Ligate Labs', url: 'https://ligate.io' }],
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-96x96.png', type: 'image/png', sizes: '96x96' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/site.webmanifest',
  // Open Graph + Twitter cards. Next auto-resolves the image URLs
  // from `app/opengraph-image.tsx` (1200x630 dynamic generator that
  // pulls live chain head); explicit `images: ['/opengraph-image']`
  // would also work but the file-based convention is what Next does
  // by default — keeping these blocks for the rest of the metadata
  // (url, siteName, locale, twitter card type, etc.).
  openGraph: {
    type: 'website',
    url: 'https://explorer.ligate.io',
    siteName: 'Ligate Explorer',
    title: 'Ligate Explorer',
    description:
      'Block, transaction, schema, attestor set, and attestation explorer for Ligate Chain devnet.',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ligate Explorer',
    description:
      'Block, transaction, schema, attestor set, and attestation explorer for Ligate Chain devnet.',
    creator: '@ligatelabs',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        className="grain"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Sticky amber bar that appears when /v1/info has failed
            2+ consecutive polls (api dead, Railway outage, etc.).
            Renders nothing while healthy. Mounted above <Header />
            so it sits at the very top of the viewport. */}
        <ApiHealthBanner />
        <Header />
        <main
          className="page-anim"
          style={{
            paddingTop: 16,
            paddingBottom: 40,
            flex: 1,
          }}
        >
          <div className="page-wrap">{children}</div>
        </main>
        <Footer />
        {/* Vercel Web Analytics. No-op in dev (the script self-disables
            when window.location.hostname is localhost). Goes live the
            moment this app is deployed to the Vercel project that
            owns explorer.ligate.io. Counts page views + visitors +
            referrers; no cookies, no personal data collection. */}
        <Analytics />
      </body>
    </html>
  )
}
