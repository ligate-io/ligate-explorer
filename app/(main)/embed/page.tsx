import type { Metadata } from 'next'
import Link from 'next/link'
import { getSchemas } from '@/lib/api'
import { trunc } from '@/lib/format'
import { CopyButton } from '@/components/copy-button'
import { Eyebrow, FrameCard } from '@/components/ui'

export const metadata: Metadata = { title: 'Embed widgets' }
export const dynamic = 'force-dynamic'

// Partner-facing docs page for the embed widgets. Lives under
// `(main)` so it carries the explorer chrome — partners landing
// here from a tweet / outreach email get the normal nav so they
// can poke around the rest of the site too.
//
// Two widgets shipped today:
//   - /embed/chain-head                   — generic "chain alive" pill
//   - /embed/attestation-count/[schemaId] — per-schema live count
//
// For each, render a live preview embedded in an <iframe> + the
// canonical iframe HTML snippet with a CopyButton. Sample schema
// for the attestation-count widget pulled from the top-by-attestation
// schema currently on chain — falls back to a hardcoded example
// string if /v1/schemas can't reach the api.

// Iframe sample dimensions. The widgets are content-first sized,
// but iframes need explicit width/height — these defaults match
// what each widget renders at comfortably.
const CHAIN_HEAD_W = 260
const CHAIN_HEAD_H = 36
const ATTESTATION_COUNT_W = 320
const ATTESTATION_COUNT_H = 120

const FALLBACK_SAMPLE_SCHEMA =
  'lsc1n6rr5y4m7xma6k7wnjv48jcpcl43wj03l6ty83e8qddwtslfznzq88nhpn'

export default async function EmbedIndexPage() {
  // Pick the most-attested schema as the live example. Sorting by
  // attestation_count DESC so the example shows a real number in
  // the preview iframe instead of "0 attestations". Falls back to a
  // hardcoded id if the schemas fetch fails.
  const schemas = await getSchemas().catch(() => [])
  const sampleSchema = schemas
    .slice()
    .sort((a, b) => b.attestation_count - a.attestation_count)[0]
  const sampleSchemaId = sampleSchema?.schema_id ?? FALLBACK_SAMPLE_SCHEMA
  const sampleSchemaLabel = sampleSchema
    ? `${sampleSchema.name} v${sampleSchema.version}`
    : 'sample schema'

  const chainHeadSnippet = buildIframe(
    'https://explorer.ligate.io/embed/chain-head',
    CHAIN_HEAD_W,
    CHAIN_HEAD_H,
    'Ligate chain head',
  )
  const attestationCountSnippet = buildIframe(
    `https://explorer.ligate.io/embed/attestation-count/${sampleSchemaId}`,
    ATTESTATION_COUNT_W,
    ATTESTATION_COUNT_H,
    `Ligate attestation count · ${sampleSchemaLabel}`,
  )

  return (
    <>
      <div style={{ paddingTop: 16 }}>
        <Eyebrow>Embed widgets</Eyebrow>
        <h1
          className="serif h-hero"
          style={{
            marginTop: 24,
            lineHeight: 0.95,
            color: 'var(--color-ink)',
            maxWidth: '20ch',
            fontWeight: 400,
          }}
        >
          Drop the chain into{' '}
          <em style={{ color: 'var(--color-accent)' }}>your site</em>.
        </h1>
        <p
          style={{
            color: 'var(--color-muted)',
            maxWidth: 560,
            marginTop: 20,
          }}
        >
          Each widget below is an iframe-ready page on
          explorer.ligate.io. Copy the snippet, paste into your site,
          done. Widgets poll the api on their own — no JS bundle to
          ship, no upgrade path to manage. They render against the
          live chain at whatever cadence the widget docs say.
        </p>
      </div>

      <div style={{ marginTop: 56 }}>
        <Eyebrow>Chain head</Eyebrow>
        <p
          style={{
            color: 'var(--color-muted)',
            maxWidth: 560,
            marginTop: 14,
            marginBottom: 18,
          }}
        >
          Compact pill showing chain id + latest block height. Refreshes every 6 seconds. Good for sidebars / footers / status strips.
        </p>
        <WidgetPreview
          embedPath="/embed/chain-head"
          width={CHAIN_HEAD_W}
          height={CHAIN_HEAD_H}
          snippet={chainHeadSnippet}
        />
      </div>

      <div style={{ marginTop: 56 }}>
        <Eyebrow>Attestation count</Eyebrow>
        <p
          style={{
            color: 'var(--color-muted)',
            maxWidth: 560,
            marginTop: 14,
            marginBottom: 18,
          }}
        >
          Per-schema live attestation count. Replace the schema id in
          the snippet with your own (find it on /schemas). Refreshes
          every 10 seconds. Click-through opens the schema detail on
          the explorer in a new tab.
        </p>
        <WidgetPreview
          embedPath={`/embed/attestation-count/${sampleSchemaId}`}
          width={ATTESTATION_COUNT_W}
          height={ATTESTATION_COUNT_H}
          snippet={attestationCountSnippet}
        />
        <p
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--color-subtle)',
            marginTop: 14,
          }}
        >
          Currently previewing:{' '}
          <Link
            href={`/schema/${sampleSchemaId}`}
            className="link"
          >
            {trunc(sampleSchemaId, 10, 6)}
          </Link>
        </p>
      </div>

      <p
        style={{
          marginTop: 64,
          color: 'var(--color-subtle)',
          fontSize: 13,
          maxWidth: 620,
        }}
      >
        Widgets target ligate-devnet-1. When testnet ships, the same
        URLs will switch domains; the iframe contract stays. Need a
        widget shape that isn&apos;t here yet? Pinged us on{' '}
        <a
          href="https://discord.gg/ZWUeJ8k3eP"
          className="link"
          target="_blank"
          rel="noopener noreferrer"
        >
          Discord
        </a>
        .
      </p>
    </>
  )
}

// Single widget block: live iframe preview on the left, copy-paste
// snippet on the right. On narrow viewports the preview stacks above
// the snippet via flex-wrap.
function WidgetPreview({
  embedPath,
  width,
  height,
  snippet,
}: {
  embedPath: string
  width: number
  height: number
  snippet: string
}) {
  return (
    <FrameCard padding={24}>
      <div
        style={{
          display: 'flex',
          gap: 24,
          alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}
      >
        {/* Live preview. Same-origin iframe — partners will of course
            cross-origin it from their own domains; the chromeless
            embed layout + transparent body bg means the widget renders
            identically either way. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: width,
            minHeight: height,
            padding: 16,
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px dashed var(--color-line-2)',
          }}
        >
          <iframe
            src={embedPath}
            width={width}
            height={height}
            title="Widget preview"
            style={{
              border: 0,
              background: 'transparent',
              colorScheme: 'dark',
            }}
            loading="lazy"
          />
        </div>
        {/* Snippet + copy */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--color-subtle)',
              marginBottom: 10,
            }}
          >
            Iframe snippet
          </div>
          <pre
            className="mono"
            style={{
              margin: 0,
              padding: 14,
              fontSize: 12,
              lineHeight: 1.5,
              color: 'var(--color-bone)',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--color-line)',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {snippet}
          </pre>
          <div style={{ marginTop: 10 }}>
            <CopyButton value={snippet} />
          </div>
        </div>
      </div>
    </FrameCard>
  )
}

// Build the canonical iframe HTML snippet partners paste into their
// own pages. Adds sensible defaults (border: 0, transparent bg,
// dark color-scheme, lazy loading) so the widget reads correctly on
// both light- and dark-themed host sites.
function buildIframe(
  src: string,
  width: number,
  height: number,
  title: string,
): string {
  return [
    `<iframe`,
    `  src="${src}"`,
    `  width="${width}"`,
    `  height="${height}"`,
    `  title="${title}"`,
    `  loading="lazy"`,
    `  style="border:0;background:transparent;color-scheme:dark"`,
    `></iframe>`,
  ].join('\n')
}
