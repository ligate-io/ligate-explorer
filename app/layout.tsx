import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import {
  Instrument_Serif,
  JetBrains_Mono,
  Space_Grotesk,
} from 'next/font/google'
import './globals.css'

import { Footer } from '@/components/footer'
import { Header } from '@/components/header'

// Self-host the three brand faces via next/font/google. Build-time
// inlines the font CSS + serves the woff2 from `/_next/static/media/`
// (same origin), eliminating the two DNS + two TLS handshakes the
// previous `<link>` to fonts.googleapis.com cost on every cold load.
// Exposed as CSS variables so globals.css can keep its --font-*
// references unchanged.
const serif = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-serif-next',
  display: 'swap',
})

const sans = Space_Grotesk({
  weight: ['300', '400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-sans-next',
  display: 'swap',
})

const mono = JetBrains_Mono({
  weight: ['300', '400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-mono-next',
  display: 'swap',
})

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
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${serif.variable} ${sans.variable} ${mono.variable}`}
    >
      <body
        className="grain"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
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
