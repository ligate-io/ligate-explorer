// UI primitives: FrameCard, Eyebrow, StatusPill, TypeTag, LV row grid.
// All server-safe. CopyButton lives in its own client file.

import type { ReactNode, CSSProperties } from 'react'

export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="eyebrow">{children}</div>
}

export function FrameCard({
  children,
  style,
  padding = 28,
  bare = false,
  className,
  scrollX = false,
}: {
  children: ReactNode
  style?: CSSProperties
  padding?: number
  bare?: boolean
  className?: string
  /** When true, children render inside a `.table-scroll` wrapper so
   *  wide content (mainly tables) can swipe horizontally on mobile
   *  without breaking the FrameCard's corner-bracket chrome. The
   *  corners stay rendered at the card edges; only the inner content
   *  scrolls. */
  scrollX?: boolean
}) {
  const cls = [bare ? 'frame frame-bare' : 'frame', className]
    .filter(Boolean)
    .join(' ')
  return (
    <div className={cls} style={{ padding, ...style }}>
      {scrollX ? <div className="table-scroll">{children}</div> : children}
    </div>
  )
}

export function StatusPill({
  status,
}: {
  status: 'SUCCESS' | 'REVERTED' | 'PENDING'
}) {
  const cls =
    status === 'SUCCESS'
      ? 'pill-success'
      : status === 'REVERTED'
        ? 'pill-error'
        : 'pill-pending'
  return <span className={`pill ${cls}`}>{status}</span>
}

export function TypeTag({ type }: { type: string }) {
  const variant =
    type === 'SubmitAttestation' || type === 'SubmitProof'
      ? 'attest'
      : type === 'RegisterSchema'
        ? 'schema'
        : type === 'Transfer'
          ? 'transfer'
          : ''
  return <span className={`type-tag ${variant}`}>{type}</span>
}

export function LV({
  rows,
}: {
  rows: { label: ReactNode; value: ReactNode }[]
}) {
  return (
    <div className="lv-grid">
      {rows.map((r, i) => (
        <div key={i} className="lv-row">
          <div className="lv-label">{r.label}</div>
          <div className="lv-value">{r.value}</div>
        </div>
      ))}
    </div>
  )
}
