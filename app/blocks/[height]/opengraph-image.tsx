import { ImageResponse } from 'next/og'
import { getBlock, getTxsForBlock } from '@/lib/api'

// Per-block OG image. Auto-served at `/blocks/{N}/opengraph-image`;
// Next picks it up via the file-based convention and the home OG at
// `app/opengraph-image.tsx` is shadowed for this route.
//
// Same composition language as the root OG (system fonts, sage live
// dot, big serif headline, monochrome wordmark) but tailored to the
// block being shared — height as the headline, tx count + age in
// the sub-line, finality status reflected by the dot color.

export const alt = 'Ligate Chain block'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const PATH_BOTTOM_RIGHT =
  'M123.03 55.9332L115.623 68.7795L108.216 81.6154L100.819 94.4513L93.4121 107.277H34.2075L26.8004 94.4513L19.4037 81.6154H78.6187L86.0154 68.7795L93.4121 55.9332H123.03Z'
const PATH_LEFT =
  'M49.0113 30.2718L41.6042 43.0973L34.2075 55.9332L26.8004 68.7795L19.4037 81.6154L11.9967 68.7795L4.59998 55.9332L11.9967 43.0973L19.4037 30.2718H49.0113Z'
const PATH_TOP =
  'M108.216 30.2718L100.819 43.0973L93.4121 55.9332H63.8046L71.2221 43.0973L78.6188 30.2718H49.0112L56.4079 17.4359L63.8046 4.60001H93.4121L100.819 17.4359L108.216 30.2718Z'

function ageString(timestampMs: number): string {
  const ageSec = Math.floor((Date.now() - timestampMs) / 1000)
  if (!Number.isFinite(ageSec) || ageSec < 0) return 'just now'
  if (ageSec < 60) return `${ageSec}s ago`
  if (ageSec < 3600) return `${Math.floor(ageSec / 60)}m ago`
  if (ageSec < 86400) return `${Math.floor(ageSec / 3600)}h ago`
  return `${Math.floor(ageSec / 86400)}d ago`
}

export default async function Image({
  params,
}: {
  params: Promise<{ height: string }>
}) {
  const { height: heightStr } = await params
  const height = parseInt(heightStr, 10)
  const block = Number.isFinite(height) ? await getBlock(height).catch(() => null) : null
  // Cross-fetch the tx list so the sub-line can show the real tx
  // count (the block adapter's tx_count is authoritative but defaults
  // to 0 if the block lookup itself fails; getTxsForBlock is a
  // separate source we can fall back to). Best-effort either way.
  const txs =
    block != null
      ? await getTxsForBlock(block.height).catch(() => [])
      : []

  const headlineText = block ? `#${block.height.toLocaleString()}` : '#—'
  const txCount = block ? block.tx_count : txs.length
  const ageText = block ? ageString(block.timestamp) : 'unknown age'
  const finalized = block?.finality_status === 'finalized'
  const pending = block?.finality_status === 'pending'
  const dotColor = finalized
    ? '#a7d28c'
    : pending
      ? '#d9b26a'
      : '#6a6a74'
  const statusLabel = finalized
    ? 'FINALIZED'
    : pending
      ? 'PENDING DA'
      : 'BLOCK'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#0a0a0b',
          color: '#efead8',
          display: 'flex',
          flexDirection: 'column',
          padding: 72,
          position: 'relative',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Sage radial glow upper-right, same as root OG */}
        <div
          style={{
            position: 'absolute',
            top: -200,
            right: -200,
            width: 800,
            height: 800,
            background:
              'radial-gradient(circle, rgba(167,210,140,0.10) 0%, transparent 60%)',
            display: 'flex',
          }}
        />

        {/* Lockup */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <svg
            width="78"
            height="68"
            viewBox="0 0 128 112"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d={PATH_BOTTOM_RIGHT} stroke="#efead8" strokeWidth={9.2} strokeLinejoin="round" />
            <path d={PATH_LEFT} stroke="#efead8" strokeWidth={9.2} strokeLinejoin="round" />
            <path d={PATH_TOP} stroke="#efead8" strokeWidth={9.2} strokeLinejoin="round" />
          </svg>
          <div
            style={{
              fontSize: 40,
              fontWeight: 500,
              letterSpacing: '-0.02em',
              color: '#ffffff',
              lineHeight: 1,
            }}
          >
            Ligate Explorer
          </div>
        </div>

        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              fontFamily: 'monospace',
              fontSize: 22,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: dotColor,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: dotColor,
                display: 'flex',
              }}
            />
            {statusLabel}
          </div>

          <div
            style={{
              fontFamily: 'serif',
              fontSize: 160,
              lineHeight: 0.9,
              color: '#ffffff',
              letterSpacing: '-0.03em',
              display: 'flex',
            }}
          >
            {headlineText}
          </div>

          <div
            style={{
              fontSize: 26,
              color: '#a8a8b3',
              lineHeight: 1.4,
              display: 'flex',
            }}
          >
            {txCount} {txCount === 1 ? 'transaction' : 'transactions'} · {ageText}
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 56,
            right: 72,
            fontFamily: 'monospace',
            fontSize: 22,
            color: '#6a6a74',
            letterSpacing: '0.12em',
            display: 'flex',
          }}
        >
          explorer.ligate.io/blocks/{block?.height ?? heightStr}
        </div>
      </div>
    ),
    { ...size },
  )
}
