// Skeleton primitives used by loading.tsx files + the home-page
// Suspense fallbacks. The shimmer comes from the `.skeleton` CSS
// class in globals.css.
//
// Design intent: each skeleton mirrors the EXACT silhouette of the
// content it replaces — same eyebrow, same FrameCard chrome, same
// table row heights — so when the real data streams in, nothing
// shifts. The shimmering pieces just light up where text will be.

import type { CSSProperties, ReactNode } from 'react'
import { Eyebrow, FrameCard } from './ui'

// ============================================================
// Building blocks
// ============================================================

export function SkelBlock({
  width = '100%',
  height = 14,
  style,
}: {
  width?: number | string
  height?: number | string
  style?: CSSProperties
}) {
  return (
    <span
      className="skeleton"
      style={{
        display: 'inline-block',
        width,
        height,
        borderRadius: 0,
        verticalAlign: 'middle',
        ...style,
      }}
    />
  )
}

export function SkelLine({
  width = '100%',
  height = 12,
  style,
}: {
  width?: number | string
  height?: number | string
  style?: CSSProperties
}) {
  return (
    <SkelBlock
      width={width}
      height={height}
      style={{ display: 'block', ...style }}
    />
  )
}

// "View all →" shaped placeholder pinned right.
function SkelViewAll() {
  return <SkelBlock width={56} height={10} />
}

// Eyebrow placeholder for headers that sit OUTSIDE a FrameCard.
function SkelEyebrowRow({ width = 90 }: { width?: number }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
      }}
    >
      <SkelBlock width={width} height={10} />
      <SkelViewAll />
    </div>
  )
}

// ============================================================
// Card-shaped wrappers
// ============================================================

export function SkelCard({
  height = 180,
  children,
}: {
  height?: number
  children?: ReactNode
}) {
  return (
    <FrameCard padding={22} style={{ minHeight: height }}>
      {children}
    </FrameCard>
  )
}

// One table row inside a FrameCard. Uses the same .tbl-compact padding
// the real homepage tables use, so the row heights line up exactly.
function SkelTableRow({
  cols = 4,
  compact = false,
}: {
  cols?: number
  compact?: boolean
}) {
  // Widths chosen so rows visually vary like real data (some short
  // sender addresses, some long hashes, etc.) rather than a wall of
  // identical bars.
  const widths = ['40%', '60%', '30%', '50%', '35%']
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td
          key={i}
          style={{
            padding: compact ? '10px 14px' : '12px 16px',
            borderBottom: '1px solid var(--color-line)',
          }}
        >
          <SkelBlock width={widths[i % widths.length]} height={10} />
        </td>
      ))}
    </tr>
  )
}

// Table card silhouette — eyebrow header row at the top + N body rows.
// Used by list-route loading.tsx (no eyebrow above) and inside home
// rows via SkelHomeTableCard (eyebrow above).
function SkelTable({
  headers,
  rows,
  compact = false,
}: {
  headers: string[]
  rows: number
  compact?: boolean
}) {
  return (
    <table className={`tbl tab-num${compact ? ' tbl-compact' : ''}`}>
      <thead>
        <tr>
          {headers.map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <SkelTableRow key={i} cols={headers.length} compact={compact} />
        ))}
      </tbody>
    </table>
  )
}

// Homepage row-3 / row-4 pattern: eyebrow + "View all →" ABOVE a
// FrameCard with a compact table inside. Used twice in each row so
// the two cards share heights via the parent grid's alignItems:stretch.
// `scrollX` matches the live cards so the skeleton silhouette stays
// identical on mobile (no layout shift on data swap-in).
export function SkelHomeTableCard({
  eyebrowWidth = 90,
  headers,
  rows,
}: {
  eyebrowWidth?: number
  headers: string[]
  rows: number
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <SkelEyebrowRow width={eyebrowWidth} />
      <FrameCard padding={0} style={{ flex: 1 }} scrollX>
        <SkelTable headers={headers} rows={rows} compact />
      </FrameCard>
    </div>
  )
}

// List-page table card: NO eyebrow above (the page has its own hero
// + filter strip above this card). Uses the default (non-compact)
// table padding to match the real /txs, /blocks, etc.
export function SkelListTableCard({
  headers,
  rows = 12,
}: {
  headers: string[]
  rows?: number
}) {
  return (
    <FrameCard padding={0} scrollX>
      <SkelTable headers={headers} rows={rows} />
    </FrameCard>
  )
}

// ============================================================
// Page-header silhouettes (back link, eyebrow, big title)
// ============================================================

export function SkelDetailHeader({
  back = 'Back',
  eyebrow,
  titleWidth = '60%',
  titleHeight = 32,
}: {
  back?: string
  eyebrow: string
  titleWidth?: string | number
  titleHeight?: number
}) {
  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-subtle)',
          }}
        >
          ← {back}
        </span>
      </div>
      <Eyebrow>{eyebrow}</Eyebrow>
      <div style={{ marginTop: 20, marginBottom: 36 }}>
        <SkelLine width={titleWidth} height={titleHeight} />
        <div style={{ marginTop: 16 }}>
          <SkelLine width="40%" height={12} />
        </div>
      </div>
    </>
  )
}

// Two-column LV-style grid skeleton used inside detail pages
// (Header + Execution on /tx, Identity + Production on /blocks,
// etc). N labelled rows per column.
export function SkelDetailGrid({
  leftLabel = 'Header',
  rightLabel = 'Details',
  rowsPerColumn = 4,
}: {
  leftLabel?: string
  rightLabel?: string
  rowsPerColumn?: number
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        gap: 40,
      }}
    >
      <div>
        <Eyebrow>{leftLabel}</Eyebrow>
        <div style={{ marginTop: 14 }}>
          {Array.from({ length: rowsPerColumn }).map((_, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 1fr',
                gap: 16,
                padding: '14px 0',
                borderBottom: '1px solid var(--color-line)',
              }}
            >
              <SkelLine width={70} height={10} />
              <SkelLine width={i % 2 === 0 ? '70%' : '50%'} height={12} />
            </div>
          ))}
        </div>
      </div>
      <div>
        <Eyebrow>{rightLabel}</Eyebrow>
        <div style={{ marginTop: 14 }}>
          {Array.from({ length: rowsPerColumn }).map((_, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 1fr',
                gap: 16,
                padding: '14px 0',
                borderBottom: '1px solid var(--color-line)',
              }}
            >
              <SkelLine width={70} height={10} />
              <SkelLine width={i % 2 === 0 ? '60%' : '80%'} height={12} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
