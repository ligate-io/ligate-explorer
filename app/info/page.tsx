import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { getFinalityStats, getInfo } from '@/lib/api'
import { CopyButton } from '@/components/copy-button'
import { Eyebrow, FrameCard } from '@/components/ui'

// Local mirror of the StatsStrip's formatter so /info shows the same
// number as the homepage tile (same source, same precision banding).
function formatTps(tps: number): string {
  if (!Number.isFinite(tps) || tps === 0) return '—'
  if (tps >= 10) return tps.toFixed(1)
  if (tps >= 1) return tps.toFixed(2)
  if (tps >= 0.01) return tps.toFixed(3)
  if (tps >= 0.0001) return tps.toFixed(4)
  return '<0.0001'
}

export const metadata: Metadata = { title: 'Chain info' }
export const dynamic = 'force-dynamic'

export default async function InfoPage() {
  // Finality stats split out from `i.finality` (a single string) so
  // we can render the source badge + percentile breakdown. PR #44
  // brief: source flips estimated → observed once the api has 20+
  // observations; below 100 observations we surface a low-confidence
  // hint so partners don't take the numbers as gospel.
  const [i, finality] = await Promise.all([
    getInfo(),
    getFinalityStats(),
  ])
  const stats: { label: string; value: ReactNode; serif?: boolean }[] = [
    { label: 'Chain ID', value: i.chain_id },
    { label: 'Latest block', value: '#' + i.latest_block.toLocaleString() },
    {
      // Magnitude-scaled formatting so a fractional tps from a sparse
      // chain still reads honestly (".0004" not ".00"). Mirrors the
      // StatsStrip rendering on the homepage. See formatTps in
      // components/dashboard.tsx for the bands.
      label: 'TX / sec',
      value: formatTps(i.tx_per_second),
      serif: true,
    },
    {
      // "Block time" not "Finality" — `i.finality` carries the
      // measured rollup slot interval (mean_block_interval_secs).
      // Render as plain string; the FinalityValue badge wrapper was
      // pulling p50_seconds from /v1/stats/finality (DA settlement,
      // ~18s), which mixed dimensions. The full DA-settlement
      // percentiles still live in the "Finality breakdown" card below.
      label: 'Block time',
      value: i.finality,
    },
    { label: 'DA layer', value: i.da_layer },
    // `i.version` is the chain node version. The api proxies it
    // straight through from the upstream chain's /v1/info. Was labeled
    // "API version" historically when the field actually carried the
    // api server's own Cargo crate version; the api was updated to
    // surface the chain version instead.
    { label: 'Chain version', value: i.version },
  ]

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Eyebrow>Chain info</Eyebrow>
      </div>
      <h1
        className="serif h-detail-lg"
        style={{
          lineHeight: 1,
          color: 'var(--color-ink)',
          maxWidth: '14ch',
          fontWeight: 400,
          margin: 0,
        }}
      >
        Ligate Chain{' '}
        <em style={{ color: 'var(--color-accent)' }}>devnet</em>
      </h1>
      <p
        style={{
          color: 'var(--color-muted)',
          fontSize: 15,
          marginTop: 20,
          maxWidth: 600,
        }}
      >
        Sovereign SDK rollup on Celestia. Built to record attestations cheaply and verifiably, not to move value. Devnet runs without slashing.
      </p>

      <div
        className="grid-stats-3"
        style={{ marginTop: 56, gap: 0 }}
      >
        {stats.map((t, idx) => (
          <FrameCard
            key={idx}
            padding={24}
            style={{
              borderRight: idx % 3 !== 2 ? 0 : '1px solid var(--color-line)',
              borderBottom: idx < 3 ? 0 : '1px solid var(--color-line)',
            }}
          >
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
              {t.label}
            </div>
            <div
              className={t.serif ? 'serif' : 'mono'}
              style={{
                fontSize: t.serif ? 36 : 16,
                color: 'var(--color-ink)',
                lineHeight: 1,
              }}
            >
              {t.value}
            </div>
          </FrameCard>
        ))}
      </div>

      {finality ? (
        <div style={{ marginTop: 56 }}>
          <Eyebrow>Finality breakdown</Eyebrow>
          <FinalityCard finality={finality} />
        </div>
      ) : null}

      <div
        className="detail-grid-2"
        style={{
          marginTop: 56,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 40,
        }}
      >
        <div>
          <Eyebrow>Genesis</Eyebrow>
          <div style={{ marginTop: 12 }}>
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--color-subtle)',
                marginBottom: 8,
              }}
            >
              Chain hash
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: 13,
                  color: 'var(--color-bone)',
                  wordBreak: 'break-all',
                }}
              >
                {i.chain_hash}
              </span>
              <CopyButton value={i.chain_hash} />
            </div>
          </div>
        </div>
        <div>
          <Eyebrow>Endpoints</Eyebrow>
          <div style={{ marginTop: 12 }}>
            <div className="lv-grid">
              <div className="lv-row">
                <div className="lv-label">RPC</div>
                <div className="lv-value">
                  <a
                    href={i.rpc_url}
                    className="link mono"
                    style={{ fontSize: 13 }}
                  >
                    {i.rpc_url}
                  </a>
                  <CopyButton value={i.rpc_url} />
                </div>
              </div>
              <div className="lv-row">
                <div className="lv-label">API</div>
                <div className="lv-value">
                  <a
                    href={i.api_url}
                    className="link mono"
                    style={{ fontSize: 13 }}
                  >
                    {i.api_url}
                  </a>
                  <CopyButton value={i.api_url} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 64 }}>
        <Eyebrow>Resources</Eyebrow>
        <div
          className="grid-stats-4"
          style={{ marginTop: 16, gap: 0 }}
        >
          {[
            {
              label: 'Documentation',
              url: 'https://docs.ligate.io',
              meta: 'API, quickstart, schema spec',
            },
            {
              label: 'Chain repo',
              url: 'https://github.com/ligate-io/ligate-chain',
              meta: 'sdk rollup binary',
            },
            {
              label: 'Explorer source',
              url: 'https://github.com/ligate-io/ligate-explorer',
              meta: 'this site',
            },
            {
              label: 'Public RPC',
              url: i.rpc_url,
              meta: 'cors-enabled, rate-limited',
            },
          ].map((r, idx) => (
            <a
              key={idx}
              href={r.url}
              className="frame"
              style={{
                padding: 20,
                borderRight: idx === 3 ? '1px solid var(--color-line)' : 0,
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              <span className="fc-bl" />
              <span className="fc-br" />
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: 'var(--color-subtle)',
                  marginBottom: 8,
                }}
              >
                {r.label}
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 13,
                  color: 'var(--color-accent)',
                  marginBottom: 6,
                }}
              >
                {r.url.replace(/^https?:\/\//, '')} →
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  color: 'var(--color-muted)',
                  letterSpacing: '0.05em',
                }}
              >
                {r.meta}
              </div>
            </a>
          ))}
        </div>
      </div>
    </>
  )
}

// Full p50 / p95 / p99 + sample count + source breakdown. Renders
// only when /v1/stats/finality returned data. The "low-confidence"
// hint sits below the row when sampled_count < 100, even when
// source==='observed' — we have a measurement, just not many.
function FinalityCard({
  finality,
}: {
  finality: {
    window: string
    sampled_count: number
    p50_seconds: number
    p95_seconds: number
    p99_seconds: number
    source: string
    da_layer: string
    as_of: string
  }
}) {
  const observed = finality.source === 'observed'
  const lowConfidence = finality.sampled_count < 100
  const cells = [
    { label: 'p50', value: `${finality.p50_seconds.toFixed(1)}s` },
    { label: 'p95', value: `${finality.p95_seconds.toFixed(1)}s` },
    { label: 'p99', value: `${finality.p99_seconds.toFixed(1)}s` },
    {
      label: 'Window',
      value: `${finality.window}${
        finality.sampled_count > 0 ? ` · ${finality.sampled_count} obs` : ''
      }`,
    },
  ]
  return (
    <FrameCard padding={24} style={{ marginTop: 12 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 18,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.18em',
            color: 'var(--color-muted)',
          }}
        >
          DA layer: {finality.da_layer}
        </div>
        <span
          className="mono"
          style={{
            fontSize: 9,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            padding: '4px 8px',
            border: `1px solid ${
              observed ? 'var(--color-accent)' : 'var(--color-amber)'
            }`,
            color: observed ? 'var(--color-accent)' : 'var(--color-amber)',
          }}
        >
          {observed ? 'live · measured' : 'estimated · static'}
        </span>
      </div>
      <div
        className="grid-stats-4"
        style={{ gap: 0 }}
      >
        {cells.map((c, idx) => (
          <div
            key={c.label}
            style={{
              padding: '0 18px',
              borderRight:
                idx === cells.length - 1
                  ? 0
                  : '1px solid var(--color-line-2)',
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 9,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--color-subtle)',
                marginBottom: 6,
              }}
            >
              {c.label}
            </div>
            <div
              className="serif"
              style={{
                fontSize: 24,
                color:
                  c.label === 'Window'
                    ? 'var(--color-bone)'
                    : 'var(--color-ink)',
                lineHeight: 1,
              }}
            >
              {c.value}
            </div>
          </div>
        ))}
      </div>
      {lowConfidence ? (
        <div
          className="mono"
          style={{
            marginTop: 18,
            fontSize: 10,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--color-subtle)',
          }}
          title="Fewer than 100 observations in the window. Numbers will tighten as the chain produces more slots."
        >
          // low confidence · {finality.sampled_count} samples
        </div>
      ) : null}
    </FrameCard>
  )
}
