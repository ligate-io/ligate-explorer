import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'

// Static, fully self-hosted fonts via @fontsource. Each import
// bundles the woff2 files into the build and injects `@font-face`
// rules pointing at them. No googleapis.com, no gstatic.com, no
// runtime font fetch — bytes ship with the JS bundle and are cached
// like any other static asset.
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

// Minimal root layout. Owns the <html>/<body> shell, font loading,
// the global metadata defaults, and Analytics — that's it. Chrome
// (header, footer, banners, page-wrap) lives in `app/(main)/layout.tsx`
// so the embed route group can opt OUT of all of it.
//
// Why route groups instead of conditional rendering: in Next 16 the
// root layout always wraps EVERY route. The only way to give partner
// iframes a clean chromeless surface is to split the tree — main
// routes nest under `(main)`, embed routes nest under `embed/`, and
// each route group's layout decides what chrome to add.

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
  // OG + Twitter inherited by every route. (main) keeps these as-is;
  // embed pages override `robots` to noindex (already noindex above)
  // and don't need their own OG since iframes don't trigger share
  // previews.
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
      {/* No bg / no flex on body — those are route-group concerns. The
          (main) wrapper paints obsidian + grain; embed wrappers leave
          the surface transparent so the host iframe controls bg. */}
      <body style={{ margin: 0 }}>
        {children}
        {/* Vercel Web Analytics. No-op in dev (the script self-disables
            when window.location.hostname is localhost). Goes live the
            moment this app is deployed to the Vercel project that
            owns explorer.ligate.io. Counts page views + visitors +
            referrers; no cookies, no personal data collection.

            Mounted at the root so both (main) and embed routes are
            counted — useful for knowing whether anyone actually
            iframes the embed widgets in the wild. */}
        <Analytics />
      </body>
    </html>
  )
}
