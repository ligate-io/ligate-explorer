import { ImageResponse } from 'next/og'
import { getAttestationItem, getSchema } from '@/lib/api'

// Per-attestation OG image. Auto-served at
// `/attestation/{id}/opengraph-image`. Composition mirrors the block
// + tx generators; eyebrow carries the schema name when available
// (Themisra / Mneme / Iris attestations will read with their product
// schema, e.g. `THEMISRA.PROOF-OF-PROMPT V1 · 2 OF 3`), headline is
// the truncated `lat1…` id, sub-line tells you which block sealed it.

export const alt = 'Ligate Chain attestation'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const PATH_BOTTOM_RIGHT =
  'M123.03 55.9332L115.623 68.7795L108.216 81.6154L100.819 94.4513L93.4121 107.277H34.2075L26.8004 94.4513L19.4037 81.6154H78.6187L86.0154 68.7795L93.4121 55.9332H123.03Z'
const PATH_LEFT =
  'M49.0113 30.2718L41.6042 43.0973L34.2075 55.9332L26.8004 68.7795L19.4037 81.6154L11.9967 68.7795L4.59998 55.9332L11.9967 43.0973L19.4037 30.2718H49.0113Z'
const PATH_TOP =
  'M108.216 30.2718L100.819 43.0973L93.4121 55.9332H63.8046L71.2221 43.0973L78.6188 30.2718H49.0112L56.4079 17.4359L63.8046 4.60001H93.4121L100.819 17.4359L108.216 30.2718Z'

function truncMid(s: string, head: number, tail: number): string {
  if (s.length <= head + tail + 1) return s
  return `${s.slice(0, head)}…${s.slice(-tail)}`
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const a = await getAttestationItem(id).catch(() => null)
  // Schema cross-fetch is best-effort — when it 5xx's we still
  // render a card, just without the human schema name.
  const schema =
    a != null ? await getSchema(a.schema_id).catch(() => null) : null

  const isPending = a == null && /^lat1[a-z0-9]{50,80}$/.test(id)
  const headlineId = truncMid(id, 16, 12)
  const eyebrowText = a
    ? schema
      ? `${schema.name.toUpperCase()} V${schema.version} · ${a.signature_count} ${a.signature_count === 1 ? 'SIG' : 'SIGS'}`
      : `ATTESTATION · ${a.signature_count} ${a.signature_count === 1 ? 'SIG' : 'SIGS'}`
    : isPending
      ? 'ATTESTATION · PENDING'
      : 'ATTESTATION'
  const dotColor = isPending ? '#d9b26a' : '#a7d28c'
  const subLine = a
    ? `Block #${a.submitted_at.block_height.toLocaleString()} · submitter ${truncMid(a.submitter, 6, 4)}`
    : isPending
      ? 'Awaiting indexer — chain has accepted this attestation'
      : 'Not yet indexed'

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
            {headlineId}
          </div>

          <div
            style={{
              fontSize: 26,
              color: '#a8a8b3',
              lineHeight: 1.4,
              display: 'flex',
            }}
          >
            {subLine}
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
