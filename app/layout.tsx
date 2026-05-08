import type { Metadata } from 'next'
import './globals.css'

import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { MonoStrip } from '@/components/mono-strip'
import { getInfo } from '@/lib/api'

export const metadata: Metadata = {
  metadataBase: new URL('https://explorer.ligate.io'),
  title: {
    default: 'Ligate Chain Explorer',
    template: '%s · Ligate Chain Explorer',
  },
  description:
    'Block, transaction, schema, attestor set, and attestation explorer for Ligate Chain devnet.',
  applicationName: 'Ligate Chain Explorer',
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const info = await getInfo()
  const stripItems = [
    { label: 'CHAIN', value: info.chain_id },
    { label: 'BLOCK', value: '#' + info.latest_block.toLocaleString() },
    { label: 'TPS', value: info.tx_per_second.toFixed(2) },
    { label: 'FINALITY', value: info.finality },
    { label: 'DA', value: info.da_layer.split(' ')[0] },
  ]

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Space+Grotesk:wght@300;400;500;600&family=JetBrains+Mono:wght@300;400;500;600&display=swap"
        />
      </head>
      <body className="grain">
        <div className="page-wrap" style={{ padding: 0 }}>
          <MonoStrip items={stripItems} />
        </div>
        <Header />
        <main
          className="page-anim"
          style={{ padding: '40px 0', minHeight: 600 }}
        >
          <div className="page-wrap">{children}</div>
        </main>
        <Footer />
      </body>
    </html>
  )
}
