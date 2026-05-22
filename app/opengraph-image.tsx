import { ImageResponse } from 'next/og'
import { getInfo } from '@/lib/api'

// Root Open Graph image for the explorer. Renders at
// `/opengraph-image` (1200x630 PNG). Next's metadata system picks it
// up automatically from this filename + emits the `og:image` /
// `twitter:image` meta tags pointing at it.
//
// Dynamic: pulls live chain head from /v1/info on every render so a
// link shared right now shows the current block height. Falls back
// to the chain id + a placeholder height if the api can't be reached
// — the image still renders, the share preview still works.
//
// Fonts: deliberately system-only (`serif`, `sans-serif`, `monospace`).
// @fontsource ships .woff2 files which Satori (the renderer behind
// ImageResponse) doesn't reliably parse; bundling .ttf adds weight.
// The brand identity comes through via color + composition + the
// monochrome ligature mark, not the typeface.

export const alt =
  'Ligate Explorer — live state of the Ligate Chain devnet (blocks, transactions, schemas, attestations)'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Reproduced from components/lockup.tsx for inlining into the OG SVG.
// Satori does render external <svg> but inlining keeps the image
// self-contained; no external <img>/font fetch on the hot path.
const PATH_BOTTOM_RIGHT =
  'M123.03 55.9332L115.623 68.7795L108.216 81.6154L100.819 94.4513L93.4121 107.277H34.2075L26.8004 94.4513L19.4037 81.6154H78.6187L86.0154 68.7795L93.4121 55.9332H123.03Z'
const PATH_LEFT =
  'M49.0113 30.2718L41.6042 43.0973L34.2075 55.9332L26.8004 68.7795L19.4037 81.6154L11.9967 68.7795L4.59998 55.9332L11.9967 43.0973L19.4037 30.2718H49.0113Z'
const PATH_TOP =
  'M108.216 30.2718L100.819 43.0973L93.4121 55.9332H63.8046L71.2221 43.0973L78.6188 30.2718H49.0112L56.4079 17.4359L63.8046 4.60001H93.4121L100.819 17.4359L108.216 30.2718Z'

export default async function OgImage() {
  const info = await getInfo().catch(() => null)
  const chainId = info?.chain_id ?? 'ligate-devnet-1'
  const block =
    info?.latest_block != null
      ? `#${info.latest_block.toLocaleString()}`
      : '#—'
  const blockTime = info?.finality ?? '~6s'

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
        {/* Subtle radial backdrop. Soft sage glow in the upper-right
            so the composition has visual weight balance against the
            text block in the lower half. */}
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

        {/* Top row: ligature mark + wordmark. Same mark used in the
            navbar lockup, monochrome stroked at 9.2 / scaled to ~78px. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <svg
            width="78"
            height="68"
            viewBox="0 0 128 112"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d={PATH_BOTTOM_RIGHT}
              stroke="#efead8"
              strokeWidth={9.2}
              strokeLinejoin="round"
            />
            <path
              d={PATH_LEFT}
              stroke="#efead8"
              strokeWidth={9.2}
              strokeLinejoin="round"
            />
            <path
              d={PATH_TOP}
              stroke="#efead8"
              strokeWidth={9.2}
              strokeLinejoin="round"
            />
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

        {/* Center text block, anchored to the lower half. The big
            block-height serif is the "headline" of the share card —
            it reads as "this is live data" at thumbnail size. */}
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          {/* Mono eyebrow: chain id + live signal */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              fontFamily: 'monospace',
              fontSize: 22,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: '#a7d28c',
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: '#a7d28c',
                display: 'flex',
              }}
            />
            {chainId} · live
          </div>

          {/* Block height — the big serif statement */}
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
            {block}
          </div>

          {/* Sub-line: human description of what this site is */}
          <div
            style={{
              fontSize: 26,
              color: '#a8a8b3',
              lineHeight: 1.4,
              maxWidth: 900,
              display: 'flex',
            }}
          >
            Block, transaction, schema, and attestation explorer · {blockTime} blocks
          </div>
        </div>

        {/* Bottom-right URL pin */}
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
