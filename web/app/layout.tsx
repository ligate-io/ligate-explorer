import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://explorer.ligate.io'),
  title: {
    default: 'Ligate Chain explorer',
    template: '%s · Ligate Chain explorer',
  },
  description:
    'Block, transaction, schema, attestor set, and attestation explorer for Ligate Chain devnet.',
  applicationName: 'Ligate Chain explorer',
  authors: [{ name: 'Ligate Labs', url: 'https://ligate.io' }],
  robots: {
    index: false,
    follow: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap"
        />
      </head>
      <body className="bg-[var(--color-bg)] font-sans text-[var(--color-ink)] antialiased">
        {children}
      </body>
    </html>
  )
}
