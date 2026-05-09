// Top-of-page meta strip. Server-safe; data is passed in from the layout.
// Pulsing "live" dot was removed per user feedback (no scaling green circles).

import type { ReactNode } from 'react'

export function MonoStrip({
  items,
}: {
  items: { label: string; value: ReactNode }[]
}) {
  return (
    <div className="mono-strip">
      <span className="live">DEVNET</span>
      <span className="sep">/</span>
      {items.map((it, i) => (
        <span key={i} style={{ display: 'inline-flex', gap: 24 }}>
          <span style={{ color: 'var(--color-muted)' }}>{it.label}</span>
          <span style={{ color: 'var(--color-bone)' }}>{it.value}</span>
          {i < items.length - 1 && <span className="sep">·</span>}
        </span>
      ))}
    </div>
  )
}
