import { ImageResponse } from 'next/og'
import { getInfo } from '@/lib/api'

// Open Graph image for /embed (the partner-facing widget gallery).
// Same dimensions + brand language as the root OG, but reframed for
// the partner pitch: headline is "Drop the chain into your site", and
// the lower band shows four miniature widget tiles instead of the live
// block height.
//
// Triggered when partners DM the /embed URL in Slack, paste it on X,
// or drop it into an outreach email; the share card should communicate
// "here's a gallery of drop-in widgets" at thumbnail scale.
//
// Pulls chain id from /v1/info so the live signal in the eyebrow
// reflects the actual network. Falls back to the devnet id string if
// the api can't be reached: card still renders, share still works.
//
// Fonts: system-only (serif / sans-serif / monospace) because Satori
// doesn't reliably parse the @fontsource .woff2 we ship for runtime.

export const alt =
  'Ligate Explorer embed widgets: drop the chain into your site with a single iframe paste.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Mark paths reproduced from components/lockup.tsx so the OG is
// self-contained: no external SVG fetch on render.
const PATH_BOTTOM_RIGHT =
  'M123.03 55.9332L115.623 68.7795L108.216 81.6154L100.819 94.4513L93.4121 107.277H34.2075L26.8004 94.4513L19.4037 81.6154H78.6187L86.0154 68.7795L93.4121 55.9332H123.03Z'
const PATH_LEFT =
  'M49.0113 30.2718L41.6042 43.0973L34.2075 55.9332L26.8004 68.7795L19.4037 81.6154L11.9967 68.7795L4.59998 55.9332L11.9967 43.0973L19.4037 30.2718H49.0113Z'
const PATH_TOP =
  'M108.216 30.2718L100.819 43.0973L93.4121 55.9332H63.8046L71.2221 43.0973L78.6188 30.2718H49.0112L56.4079 17.4359L63.8046 4.60001H93.4121L100.819 17.4359L108.216 30.2718Z'

export default async function EmbedOgImage() {
  const info = await getInfo().catch(() => null)
  const chainId = info?.chain_id ?? 'ligate-devnet-2'

  // The four miniature widget cards rendered along the bottom band.
  // Hardcoded labels (not live data) because Satori-rendered text needs
  // to be deterministic for sharing, and the goal is "this is what's
  // available", not "this is the current state of the chain".
  const tiles: { eyebrow: string; figure: string }[] = [
    { eyebrow: 'chain head', figure: '#12,847' },
    { eyebrow: 'block height', figure: '#12,847' },
    { eyebrow: 'attestation count', figure: '1,204' },
    { eyebrow: 'latest 5', figure: 'live feed' },
  ]

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
        {/* Sage glow in upper-right for visual weight balance, same
            radial as the root OG so this reads as the same family. */}
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

        {/* Wordmark + ligature mark, same lockup as the root OG */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <svg
            width="68"
            height="60"
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
              fontSize: 34,
              fontWeight: 500,
              letterSpacing: '-0.02em',
              color: '#ffffff',
              lineHeight: 1,
            }}
          >
            Ligate Explorer
          </div>
        </div>

        {/* Headline block, top-anchored just below the wordmark */}
        <div
          style={{
            marginTop: 56,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Mono eyebrow with live sage dot */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              fontFamily: 'monospace',
              fontSize: 20,
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
            Embed widgets · {chainId}
          </div>

          {/* The headline. Serif, oversized, sage italic accent. */}
          <div
            style={{
              fontFamily: 'serif',
              fontSize: 96,
              lineHeight: 1,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0 24px',
              maxWidth: 1000,
            }}
          >
            Drop the chain into
            <span
              style={{
                color: '#a7d28c',
                fontStyle: 'italic',
                display: 'flex',
              }}
            >
              your site.
            </span>
          </div>

          {/* Sub-line */}
          <div
            style={{
              fontSize: 22,
              color: '#a8a8b3',
              lineHeight: 1.4,
              maxWidth: 900,
              display: 'flex',
              marginTop: 8,
            }}
          >
            Live chain head, block height, per-schema counts, attestation feed. One iframe paste.
          </div>
        </div>

        {/* Widget tile band, anchored to the bottom. Four miniature
            cards that read as "what's available" at thumbnail size. */}
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            gap: 16,
            justifyContent: 'space-between',
          }}
        >
          {tiles.map((t) => (
            <div
              key={t.eyebrow}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                padding: '20px 18px',
                background: '#101013',
                border: '1px solid #1a1a1f',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontFamily: 'monospace',
                  fontSize: 12,
                  letterSpacing: '0.20em',
                  textTransform: 'uppercase',
                  color: '#6a6a74',
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: '#a7d28c',
                    display: 'flex',
                  }}
                />
                {t.eyebrow}
              </div>
              <div
                style={{
                  fontFamily: 'serif',
                  fontSize: 32,
                  lineHeight: 1,
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                  display: 'flex',
                }}
              >
                {t.figure}
              </div>
            </div>
          ))}
        </div>

        {/* URL pin, bottom-right */}
        <div
          style={{
            position: 'absolute',
            bottom: 24,
            right: 72,
            fontFamily: 'monospace',
            fontSize: 18,
            color: '#6a6a74',
            letterSpacing: '0.12em',
            display: 'flex',
          }}
        >
          explorer.ligate.io/embed
        </div>
      </div>
    ),
    { ...size },
  )
}
