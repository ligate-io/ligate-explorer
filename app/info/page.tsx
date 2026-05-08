import type { Metadata } from 'next'
import { getInfo } from '@/lib/api'
import { CopyButton } from '@/components/copy-button'
import { Eyebrow, FrameCard } from '@/components/ui'

export const metadata: Metadata = { title: 'Chain info' }
export const dynamic = 'force-dynamic'

export default async function InfoPage() {
  const i = await getInfo()
  const stats = [
    { label: 'Chain ID', value: i.chain_id },
    { label: 'Latest block', value: '#' + i.latest_block.toLocaleString() },
    { label: 'TX / sec', value: i.tx_per_second.toFixed(2), serif: true },
    { label: 'Finality', value: i.finality },
    { label: 'DA layer', value: i.da_layer },
    { label: 'Node version', value: i.version },
  ]

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Eyebrow>Chain info</Eyebrow>
      </div>
      <h1
        className="serif"
        style={{
          fontSize: 88,
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
        Sovereign SDK rollup. Settles to Celestia. Designed to attest, not transfer. Devnet runs without slashing.
      </p>

      <div
        style={{
          marginTop: 56,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 0,
        }}
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

      <div
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
          style={{
            marginTop: 16,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 0,
          }}
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
