// Homepage dashboard widgets.
//
// Mostly server-safe: deterministic mock-driven SVGs and grids.
// The block ticker progress bar lives in its own client file
// (block-ticker-card.tsx) since it needs setInterval.
//
// `RunNodeStrip` is exported but commented out from the homepage
// composition (we don't have a light node yet; the strip stays in
// code for when one ships).

import { fmtLgtCompact } from '@/lib/format'
import { FrameCard } from './ui'

export function RunNodeStrip() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px',
        border: '1px solid var(--color-line)',
        background: 'linear-gradient(90deg, rgba(167,210,140,0.04), transparent 60%)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <svg width="22" height="22" viewBox="0 0 22 22">
          <circle cx="11" cy="11" r="9" stroke="#a7d28c" strokeWidth="1" fill="none" />
          <circle cx="11" cy="11" r="3.5" fill="#a7d28c" />
        </svg>
        <div>
          <span
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--color-ink)',
              marginRight: 16,
            }}
          >
            Your Own Node
          </span>
          <span style={{ color: 'var(--color-muted)', fontSize: 13 }}>
            Spin up a verifying light node right in your browser. No install, no setup.
          </span>
        </div>
      </div>
      <span
        className="mono link"
        style={{
          fontSize: 11,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          cursor: 'pointer',
        }}
      >
        Run light node →
      </span>
    </div>
  )
}

export function SupplyCard() {
  const supply = 100_000_000
  const bonded = 38_400_000
  const circulating = supply - bonded
  const pct = bonded / supply
  return (
    <FrameCard padding={22}>
      <div
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--color-subtle)',
          marginBottom: 12,
        }}
      >
        Supply
      </div>
      <div
        style={{
          display: 'flex',
          height: 6,
          marginBottom: 18,
          background: 'rgba(167,210,140,0.08)',
        }}
      >
        <div
          style={{
            width: `${pct * 100}%`,
            background: 'linear-gradient(90deg, var(--color-accent), #6fb8d9)',
          }}
        />
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          rowGap: 10,
          columnGap: 16,
        }}
      >
        <span className="mono" style={{ fontSize: 12, color: 'var(--color-muted)' }}>
          Total supply
        </span>
        <span className="mono" style={{ fontSize: 13, color: 'var(--color-ink)' }}>
          {supply.toLocaleString()}{' '}
          <span style={{ color: 'var(--color-subtle)' }}>LGT</span>
        </span>
        <span className="mono" style={{ fontSize: 12, color: 'var(--color-muted)' }}>
          Bonded
        </span>
        <span className="mono" style={{ fontSize: 13, color: 'var(--color-accent)' }}>
          {bonded.toLocaleString()}{' '}
          <span style={{ color: 'var(--color-subtle)' }}>
            ({(pct * 100).toFixed(1)}%)
          </span>
        </span>
        <span className="mono" style={{ fontSize: 12, color: 'var(--color-muted)' }}>
          Circulating
        </span>
        <span className="mono" style={{ fontSize: 13, color: 'var(--color-bone)' }}>
          {circulating.toLocaleString()}
        </span>
        <span className="mono" style={{ fontSize: 12, color: 'var(--color-muted)' }}>
          Inflation
        </span>
        <span className="mono" style={{ fontSize: 13, color: 'var(--color-bone)' }}>
          0.00%{' '}
          <span style={{ color: 'var(--color-subtle)' }}>(devnet)</span>
        </span>
      </div>
    </FrameCard>
  )
}

function deterministicSeq(seed: number, count: number): number[] {
  let s = seed >>> 0
  const out: number[] = []
  for (let i = 0; i < count; i++) {
    s = (s * 1664525 + 1013904223) >>> 0
    out.push(s / 0xffffffff)
  }
  return out
}

export function Tx24hCard() {
  const random = deterministicSeq(7, 24)
  const bars = random.map(
    (rv, i) => 1500 + Math.floor(rv * 4000) + Math.sin(i / 3) * 800
  )
  const total = bars.reduce((a, b) => a + b, 0)
  const max = Math.max(...bars)
  const pctChange = ((bars[23] - bars[0]) / bars[0]) * 100

  return (
    <FrameCard padding={22}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 14,
        }}
      >
        <div>
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--color-subtle)',
              marginBottom: 6,
            }}
          >
            Transactions
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span
              className="serif"
              style={{ fontSize: 30, color: 'var(--color-ink)', lineHeight: 1 }}
            >
              {(total / 1000).toFixed(1)}K
            </span>
            <span
              className="mono"
              style={{ fontSize: 11, color: 'var(--color-accent)' }}
            >
              {pctChange >= 0 ? '+' : ''}
              {pctChange.toFixed(1)}%
            </span>
          </div>
        </div>
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-subtle)',
          }}
        >
          24h
        </span>
      </div>
      <svg viewBox="0 0 240 80" width="100%" height="80" preserveAspectRatio="none">
        {bars.map((v, i) => {
          const h = (v / max) * 70
          return (
            <rect
              key={i}
              x={i * 10 + 1}
              y={75 - h}
              width="6"
              height={h}
              fill="var(--color-accent)"
              opacity={0.4 + (i / 24) * 0.6}
            >
              <animate
                attributeName="height"
                from="0"
                to={h}
                dur="0.6s"
                begin={`${i * 0.02}s`}
                fill="freeze"
              />
              <animate
                attributeName="y"
                from="75"
                to={75 - h}
                dur="0.6s"
                begin={`${i * 0.02}s`}
                fill="freeze"
              />
            </rect>
          )
        })}
      </svg>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}
      >
        {[0, 6, 12, 18].map((h) => (
          <span
            key={h}
            className="mono"
            style={{ fontSize: 9, color: 'var(--color-subtle)' }}
          >
            {h}h
          </span>
        ))}
      </div>
    </FrameCard>
  )
}

export function DailyAttestationsCard() {
  const cells = deterministicSeq(13, 7 * 30).map((rv) => Math.floor(rv * 4))
  const cellColor = (v: number) =>
    v === 0
      ? 'rgba(167,210,140,0.06)'
      : v === 1
        ? 'rgba(167,210,140,0.25)'
        : v === 2
          ? 'rgba(167,210,140,0.55)'
          : 'var(--color-accent)'
  return (
    <FrameCard padding={22}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 16,
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-subtle)',
          }}
        >
          Daily attestations
        </div>
        <span className="mono" style={{ fontSize: 11, color: 'var(--color-bone)' }}>
          44.7K{' '}
          <span style={{ color: 'var(--color-subtle)' }}>last 30d</span>
        </span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(30, 1fr)',
          gap: 3,
        }}
      >
        {cells.map((v, i) => (
          <div
            key={i}
            style={{ aspectRatio: '1 / 1', background: cellColor(v) }}
          />
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 12,
        }}
      >
        <span
          className="mono"
          style={{
            fontSize: 9,
            color: 'var(--color-subtle)',
            letterSpacing: '0.18em',
          }}
        >
          30d ago
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span
            className="mono"
            style={{ fontSize: 9, color: 'var(--color-subtle)' }}
          >
            less
          </span>
          {[0, 1, 2, 3].map((v) => (
            <div
              key={v}
              style={{ width: 10, height: 10, background: cellColor(v) }}
            />
          ))}
          <span
            className="mono"
            style={{ fontSize: 9, color: 'var(--color-subtle)' }}
          >
            more
          </span>
        </div>
        <span
          className="mono"
          style={{
            fontSize: 9,
            color: 'var(--color-subtle)',
            letterSpacing: '0.18em',
          }}
        >
          today
        </span>
      </div>
    </FrameCard>
  )
}

// AttestorSetsCard replaces the original SequencersCard for v0.
// Devnet runs single-sequencer (per chain repo #79) so a sequencer
// distribution widget would be fiction. The attestor-set distribution
// IS real data driven by registered schemas, fits the same visual
// shape, and grows as schemas register. Tracking issue for restoring
// a real Sequencers widget once multi-sequencer ships:
//   ligate-io/ligate-explorer issue (filed alongside this swap).
export function AttestorSetsCard({
  schemas,
}: {
  schemas: { threshold: string }[]
}) {
  const buckets = new Map<string, number>()
  for (const s of schemas) {
    buckets.set(s.threshold, (buckets.get(s.threshold) ?? 0) + 1)
  }
  // Sort by required-signature count then total members so the legend
  // reads 1-of-1 → 2-of-3 → 3-of-5 in a stable order.
  const palette = [
    'var(--color-accent)',
    '#6fb8d9',
    'var(--color-amber)',
    '#c9a3e8',
    'var(--color-coral)',
  ]
  const rows = [...buckets.entries()]
    .map(([label, value]) => {
      const [have, total] = label.split(' of ').map((n) => parseInt(n, 10))
      return { label, value, have, total }
    })
    .sort((a, b) => a.have - b.have || a.total - b.total)
    .map((r, i) => ({ ...r, color: palette[i % palette.length] }))

  const total = rows.reduce((acc, r) => acc + r.value, 0) || 1

  return (
    <FrameCard padding={22}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 16,
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-subtle)',
          }}
        >
          Attestor sets
        </div>
        <a
          href="/schemas"
          className="mono link"
          style={{
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          View →
        </a>
      </div>
      <div style={{ display: 'flex', height: 4, marginBottom: 22 }}>
        {rows.map((row) => (
          <div
            key={row.label}
            style={{ flex: row.value, background: row.color }}
          />
        ))}
      </div>
      {rows.map((row, i) => (
        <div
          key={row.label}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 0',
            borderBottom: i < rows.length - 1 ? '1px solid var(--color-line)' : 0,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: row.color,
                display: 'inline-block',
              }}
            />
            <span
              className="mono"
              style={{ fontSize: 12, color: 'var(--color-bone)' }}
            >
              {row.label}
            </span>
          </span>
          <span
            className="mono tab-num"
            style={{ fontSize: 13, color: 'var(--color-ink)' }}
          >
            {row.value}
          </span>
        </div>
      ))}
    </FrameCard>
  )
}

export function FeeTrackerCard() {
  const tiers = [
    { label: 'Fast', value: '0.000045', sub: '< 1 block', color: 'var(--color-accent)' },
    { label: 'Med', value: '0.000028', sub: '~ 2 blocks', color: 'var(--color-amber)' },
    { label: 'Slow', value: '0.000018', sub: '~ 5 blocks', color: 'var(--color-subtle)' },
  ]
  return (
    <FrameCard padding={22}>
      <div
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--color-subtle)',
          marginBottom: 16,
        }}
      >
        Fee tracker
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
        }}
      >
        {tiers.map((t) => (
          <div
            key={t.label}
            style={{
              border: `1px solid ${t.color}`,
              padding: 12,
              position: 'relative',
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 9,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: t.color,
                marginBottom: 8,
              }}
            >
              ● {t.label}
            </div>
            <div
              className="serif"
              style={{ fontSize: 22, color: 'var(--color-ink)', lineHeight: 1 }}
            >
              {t.value}
            </div>
            <div
              className="mono"
              style={{
                fontSize: 9,
                color: 'var(--color-subtle)',
                marginTop: 6,
                letterSpacing: '0.1em',
              }}
            >
              LGT · {t.sub}
            </div>
          </div>
        ))}
      </div>
      <div
        className="mono"
        style={{
          fontSize: 10,
          color: 'var(--color-subtle)',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          marginTop: 14,
          paddingTop: 14,
          borderTop: '1px solid var(--color-line)',
        }}
      >
        Updated · <span style={{ color: 'var(--color-bone)' }}>just now</span>
      </div>
    </FrameCard>
  )
}

export function StatsStrip({
  info,
}: {
  info: { chain_id: string; latest_block: number; tx_per_second: number; finality: string; supply_nano: string }
}) {
  const tiles = [
    { label: 'Chain ID', value: info.chain_id, mono: true },
    { label: 'Latest block', value: '#' + info.latest_block.toLocaleString(), mono: true },
    { label: 'TX / sec', value: info.tx_per_second.toFixed(2), serif: true },
    { label: 'Finality', value: info.finality, mono: true },
    { label: 'LGT supply', value: fmtLgtCompact(info.supply_nano), mono: true },
    {
      label: 'Network',
      value: (
        <span>
          <span
            style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: 999,
              background: 'var(--color-accent)',
              marginRight: 8,
              verticalAlign: 'middle',
              boxShadow: '0 0 6px var(--color-accent)',
            }}
          />
          SYNCED
        </span>
      ),
      mono: true,
    },
  ]
  return (
    <FrameCard padding={0} style={{ background: 'var(--color-surface)' }}>
      <div style={{ display: 'flex' }}>
        {tiles.map((t, i) => (
          <div key={i} className="kpi">
            <div className="label">{t.label}</div>
            <div className={`value ${t.serif ? 'serif' : ''}`}>{t.value}</div>
          </div>
        ))}
      </div>
    </FrameCard>
  )
}
