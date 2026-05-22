import { ImageResponse } from 'next/og'
import { getTx } from '@/lib/api'

// Per-transaction OG image. Auto-served at
// `/tx/{hash}/opengraph-image`. Same composition as the block OG +
// root OG; the difference here is the headline shape — txs don't
// have a single numeric like block height, so the eyebrow carries
// the type tag (`TRANSFER` / `SUBMIT_ATTESTATION` / etc.) and the
// big serif shows the truncated hash. Status drives the dot color.

export const alt = 'Ligate Chain transaction'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const PATH_BOTTOM_RIGHT =
  'M123.03 55.9332L115.623 68.7795L108.216 81.6154L100.819 94.4513L93.4121 107.277H34.2075L26.8004 94.4513L19.4037 81.6154H78.6187L86.0154 68.7795L93.4121 55.9332H123.03Z'
const PATH_LEFT =
  'M49.0113 30.2718L41.6042 43.0973L34.2075 55.9332L26.8004 68.7795L19.4037 81.6154L11.9967 68.7795L4.59998 55.9332L11.9967 43.0973L19.4037 30.2718H49.0113Z'
const PATH_TOP =
  'M108.216 30.2718L100.819 43.0973L93.4121 55.9332H63.8046L71.2221 43.0973L78.6188 30.2718H49.0112L56.4079 17.4359L63.8046 4.60001H93.4121L100.819 17.4359L108.216 30.2718Z'

// PascalCase → space-separated upper for the eyebrow.
function formatType(t: string): string {
  return t
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .toUpperCase()
}

function truncMid(s: string, head: number, tail: number): string {
  if (s.length <= head + tail + 1) return s
  return `${s.slice(0, head)}…${s.slice(-tail)}`
}

export default async function Image({
  params,
}: {
  params: Promise<{ hash: string }>
}) {
  const { hash } = await params
  const tx = await getTx(hash).catch(() => null)

  const status = tx?.status ?? 'PENDING'
  const dotColor =
    status === 'SUCCESS'
      ? '#a7d28c'
      : status === 'REVERTED'
        ? '#e88a7a'
        : '#d9b26a'
  const eyebrowText = tx
    ? `${formatType(tx.type)} · ${status}`
    : 'TRANSACTION'
  // Headline keeps the bech32m prefix readable, then truncates the
  // payload + checksum so the hash fits in one line at 96-100px.
  const headlineHash = tx ? truncMid(tx.hash, 16, 12) : truncMid(hash, 16, 12)
  const blockLine = tx ? `Block #${tx.height.toLocaleString()}` : 'awaiting indexer'

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
            {eyebrowText}
          </div>

          {/* Hash as the headline. Use monospace at a slightly smaller
              size than the block-height serif because hashes are dense
              and need to read at thumbnail. */}
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: 86,
              lineHeight: 0.95,
              color: '#ffffff',
              letterSpacing: '-0.01em',
              display: 'flex',
              wordBreak: 'break-all',
            }}
          >
            {headlineHash}
          </div>

          <div
            style={{
              fontSize: 26,
              color: '#a8a8b3',
              lineHeight: 1.4,
              display: 'flex',
            }}
          >
            {blockLine}
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
          explorer.ligate.io
        </div>
      </div>
    ),
    { ...size },
  )
}
