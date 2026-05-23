import type { Metadata } from 'next'

// Chromeless layout for `/embed/*` partner widgets. Sibling to
// `app/(main)/layout.tsx` — partners drop these routes into an
// iframe on their own site and don't want our header / footer /
// banners / page-wrap bleeding in.
//
// Three differences from main:
//   - No Header / Footer / banners
//   - Transparent body bg so the host iframe shows through (the
//     inline <style> below overrides the globals.css body bg)
//   - `robots: noindex` so the widget URLs don't pollute search
//     results (already inherited from the root layout, restated
//     here for any future search engine that might walk into a
//     widget URL by accident)
//
// Each embed page sets its own internal padding + max-width — this
// layout is just the chromeless shell.

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* Override the globals.css `html, body { background: var(--color-bg) }`
          rule so embed iframes show through to the partner's surface.
          Server-rendered inline style tag — no client JS needed. */}
      <style>{`html, body { background: transparent !important; }`}</style>
      <div
        style={{
          padding: 0,
          margin: 0,
          background: 'transparent',
          fontFamily: 'var(--font-sans)',
          color: 'var(--color-ink)',
        }}
      >
        {children}
      </div>
    </>
  )
}
