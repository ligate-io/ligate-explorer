// Homepage dashboard widgets.
//
// Mostly server-safe: deterministic mock-driven SVGs and grids.
// The block ticker progress bar lives in its own client file
// (block-ticker-card.tsx) since it needs setInterval.
//
// `RunNodeStrip` is exported but commented out from the homepage
// composition (we don't have a light node yet; the strip stays in
// code for when one ships).

import Link from 'next/link'
import type { AttestationDailyPoint, AttestorSetItem } from '@/lib/api-types'
import { fmtLgtCompact, trunc } from '@/lib/format'
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

// Supply card. Total + treasury sourced from /v1/stats/totals (real,
// no fabrication). Treasury row links to the treasury address page.
// On devnet-1 the treasury wallet equals the operator-sequencer's;
// they split at testnet/mainnet — surfaced as a small caveat so
// investors don't read the bar as "operator owns most of the chain".
export function SupplyCard({
  totalNano,
  treasuryNano,
  treasuryAddress,
}: {
  totalNano?: string
  treasuryNano?: string
  treasuryAddress?: string
}) {
  const total = totalNano ? BigInt(totalNano) : null
  const treasury = treasuryNano ? BigInt(treasuryNano) : null
  const treasuryPct =
    total && treasury && total > 0n
      ? Number((treasury * 10000n) / total) / 100
      : null
  const totalLgt = total ? Number(total / 1_000_000_000n) : null
  const treasuryLgt = treasury ? Number(treasury / 1_000_000_000n) : null
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
      {treasuryPct != null ? (
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
              width: `${treasuryPct}%`,
              background:
                'linear-gradient(90deg, var(--color-accent), #6fb8d9)',
            }}
          />
        </div>
      ) : null}
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
          {totalLgt != null ? (
            <>
              {totalLgt.toLocaleString()}{' '}
              <span style={{ color: 'var(--color-subtle)' }}>LGT</span>
            </>
          ) : (
            <span style={{ color: 'var(--color-subtle)' }}>unknown</span>
          )}
        </span>
        {treasuryLgt != null ? (
          <>
            <span
              className="mono"
              style={{ fontSize: 12, color: 'var(--color-muted)' }}
            >
              Treasury
            </span>
            <span
              className="mono"
              style={{ fontSize: 13, color: 'var(--color-accent)' }}
            >
              {treasuryAddress ? (
                <a
                  href={`/address/${treasuryAddress}`}
                  className="link"
                  style={{ color: 'var(--color-accent)' }}
                  title={treasuryAddress}
                >
                  {treasuryLgt.toLocaleString()}
                </a>
              ) : (
                treasuryLgt.toLocaleString()
              )}{' '}
              <span style={{ color: 'var(--color-subtle)' }}>
                ({treasuryPct?.toFixed(1)}%)
              </span>
            </span>
          </>
        ) : null}
        <span className="mono" style={{ fontSize: 12, color: 'var(--color-muted)' }}>
          Inflation
        </span>
        <span className="mono" style={{ fontSize: 13, color: 'var(--color-bone)' }}>
          0.00%{' '}
          <span style={{ color: 'var(--color-subtle)' }}>(devnet)</span>
        </span>
      </div>
      {treasuryAddress ? (
        <div
          className="mono"
          style={{
            marginTop: 14,
            fontSize: 9,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--color-subtle)',
            lineHeight: 1.4,
          }}
        >
          On devnet-1 the treasury wallet equals the operator&apos;s.
          They split at testnet/mainnet.
        </div>
      ) : null}
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

// Multi-day transaction trend. Takes a `bars` prop (one count per day,
// oldest → newest) sourced from /v1/stats/tx-rate-daily, plus `days`
// for the corner-label window. Sparse windows degrade to an honest
// "no activity" state when the chain hasn't seen any txs at all.
//
// Was `Tx24hCard` historically, when the card was meant to read 24
// hourly bars; the data has actually been daily for a while and the
// label drifted out of sync. Now generic on `days` so the home page
// can ask for any window (currently 30d) and the chrome stays honest.
export function TxTrendCard({
  bars: barsProp,
  days = 30,
}: {
  bars?: number[]
  days?: number
}) {
  const bars = barsProp && barsProp.length > 0 ? barsProp : []
  const total = bars.reduce((a, b) => a + b, 0)
  const max = Math.max(1, ...bars)
  const pctChange =
    bars.length >= 2 && bars[0] > 0
      ? ((bars[bars.length - 1] - bars[0]) / bars[0]) * 100
      : 0

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
              {total >= 1000 ? `${(total / 1000).toFixed(1)}K` : total.toString()}
            </span>
            {total > 0 && bars.length >= 2 && bars[0] > 0 ? (
              <span
                className="mono"
                style={{ fontSize: 11, color: 'var(--color-accent)' }}
              >
                {pctChange >= 0 ? '+' : ''}
                {pctChange.toFixed(1)}%
              </span>
            ) : null}
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
          {days}d
        </span>
      </div>
      {bars.length === 0 ? (
        <div
          style={{
            height: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--color-subtle)',
            }}
          >
            No activity in window
          </span>
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${Math.max(240, bars.length * 10)} 80`}
          width="100%"
          height="80"
          preserveAspectRatio="none"
        >
          {bars.map((v, i) => {
            const h = (v / max) * 70
            const slotW = Math.max(240, bars.length * 10) / bars.length
            const opacity = 0.4 + (i / Math.max(1, bars.length - 1)) * 0.6
            return (
              <rect
                key={i}
                x={i * slotW + 1}
                y={75 - h}
                width={Math.max(2, slotW - 4)}
                height={h}
                fill="var(--color-accent)"
                opacity={opacity}
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
      )}
    </FrameCard>
  )
}

// Daily attestation density. Now powered by /v1/stats/attestations-daily
// (ligate-api PR #53). Renders the last `days` days as a horizontal
// strip of squares — each cell is one day, intensity scales with the
// day's count vs the window max. Bottom legend mirrors GitHub's
// less / more pattern. Title attr on each cell shows date + count
// for hover-inspect.
//
// Wire response is sparse (Postgres GROUP BY doesn't emit zero-count
// rows), so the card backfills missing dates with 0 on this side.
const DAYS = 30
const CELL_PALETTE = [
  'rgba(167,210,140,0.06)', // 0 = no attestations
  'rgba(167,210,140,0.25)', // 1 = low
  'rgba(167,210,140,0.55)', // 2 = medium
  'var(--color-accent)',    // 3 = high
] as const

export function DailyAttestationsCard({
  points = [],
  days = DAYS,
}: {
  points?: AttestationDailyPoint[]
  days?: number
}) {
  const byDate = new Map(points.map((p) => [p.date, p.count]))
  // Build `days` cells ending today (UTC), oldest first → newest last.
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const cells: { date: string; count: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setUTCDate(d.getUTCDate() - i)
    const date = d.toISOString().slice(0, 10)
    cells.push({ date, count: byDate.get(date) ?? 0 })
  }
  const max = Math.max(0, ...cells.map((c) => c.count))
  const total = cells.reduce((acc, c) => acc + c.count, 0)
  const bucket = (n: number) => {
    if (max === 0 || n === 0) return 0
    const r = n / max
    return r < 0.25 ? 1 : r < 0.6 ? 2 : 3
  }
  return (
    // Flex column with `height: 100%` so the FrameCard fills the grid
    // cell stretch (default `align-items: stretch` on `.grid-3`). The
    // heatmap wrapper then claims the leftover vertical space between
    // the header + legend via `flex: 1`, and the grid's
    // `gridAutoRows: 1fr` spreads cells equally — net effect is the
    // card naturally matches the height of taller siblings (e.g.
    // AttestorSetsCard with 5 rows) instead of looking visually short.
    <FrameCard
      padding={22}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
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
          {total.toLocaleString()}{' '}
          <span style={{ color: 'var(--color-subtle)' }}>last {days}d</span>
        </span>
      </div>
      {/* 5 × 6 grid (30 cells). Each cell is one day. Rows are sized
          via `grid-auto-rows: 1fr` so they spread to fill the
          available vertical space — when the parent flex column is
          tall (e.g. AttestorSets with 5 rows next to us), the cells
          grow proportionally. `minHeight` keeps a floor for the case
          where the parent column has nothing forcing it taller. */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
          gridAutoRows: '1fr',
          gap: 3,
          minHeight: 102,
        }}
      >
        {cells.map((c) => (
          <div
            key={c.date}
            title={`${c.date} · ${c.count} ${c.count === 1 ? 'attestation' : 'attestations'}`}
            style={{
              background: CELL_PALETTE[bucket(c.count)],
              cursor: 'default',
              minHeight: 18,
            }}
          />
        ))}
      </div>
      {/* less/more legend pinned right. */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          marginTop: 10,
          gap: 4,
        }}
      >
        <span
          className="mono"
          style={{ fontSize: 9, color: 'var(--color-subtle)' }}
        >
          less
        </span>
        {[0, 1, 2, 3].map((v) => (
          <div
            key={v}
            style={{ width: 10, height: 10, background: CELL_PALETTE[v] }}
          />
        ))}
        <span
          className="mono"
          style={{ fontSize: 9, color: 'var(--color-subtle)' }}
        >
          more
        </span>
      </div>
    </FrameCard>
  )
}

// AttestorSetsCard. Real rows pulled from /v1/attestor-sets?limit=5
// (api ligate-api#39). Each row links to the set detail with its
// threshold and bound-schema count. Was previously a synthetic
// threshold-distribution derived from schemas — replaced now that the
// list endpoint exists. Tracking issue for restoring a Sequencers
// widget once multi-sequencer lands: ligate-io/ligate-explorer.
export function AttestorSetsCard({ sets }: { sets: AttestorSetItem[] }) {
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
        <Link
          href="/attestor-sets"
          className="mono link"
          style={{
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          View all →
        </Link>
      </div>
      {sets.length === 0 ? (
        <div
          className="mono"
          style={{
            padding: '24px 0',
            textAlign: 'center',
            color: 'var(--color-subtle)',
            fontSize: 11,
            letterSpacing: '0.18em',
          }}
        >
          No attestor sets registered yet
        </div>
      ) : (
        sets.map((s, i) => (
          <div
            key={s.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 0',
              borderBottom:
                i < sets.length - 1 ? '1px solid var(--color-line)' : 0,
            }}
          >
            <span
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                minWidth: 0,
              }}
            >
              <Link
                href={`/attestor-set/${s.id}`}
                className="h-mono"
                style={{ fontSize: 12 }}
              >
                {trunc(s.id, 8, 4)}
              </Link>
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  color: 'var(--color-subtle)',
                  letterSpacing: '0.08em',
                }}
              >
                {s.schema_count}{' '}
                {s.schema_count === 1 ? 'schema' : 'schemas'}
              </span>
            </span>
            <span
              className="mono tab-num"
              style={{ fontSize: 13, color: 'var(--color-accent)' }}
            >
              {s.threshold} of {s.members.length}
            </span>
          </div>
        ))
      )}
    </FrameCard>
  )
}

// Fee tracker. Once the api populates `fee_paid_nano` on tx records
// we'll derive Fast / Med / Slow from the recent-tx fee distribution.
// Pre-population the api returns null for every tx, so derived
// percentiles would be 0 / 0 / 0. Caller passes `tiers` when real
// fee data is computed; without it, this renders an honest empty
// state instead of fake LGT prices.
export function FeeTrackerCard({
  tiers,
}: {
  tiers?: Array<{ label: string; value: string; sub: string; color: string }>
}) {
  const empty = !tiers || tiers.length === 0
  const tierColors = ['var(--color-accent)', 'var(--color-amber)', 'var(--color-subtle)']
  const tiersToShow = empty
    ? ['Fast', 'Med', 'Slow'].map((label, i) => ({
        label,
        value: '—',
        sub: 'no data',
        color: tierColors[i] ?? 'var(--color-subtle)',
      }))
    : tiers
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
        {tiersToShow.map((t) => (
          <div
            key={t.label}
            style={{
              border: `1px solid ${empty ? 'var(--color-line)' : t.color}`,
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
                color: empty ? 'var(--color-subtle)' : t.color,
                marginBottom: 8,
              }}
            >
              ● {t.label}
            </div>
            <div
              className="serif"
              style={{
                fontSize: 22,
                color: empty ? 'var(--color-subtle)' : 'var(--color-ink)',
                lineHeight: 1,
              }}
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
              {empty ? t.sub : `LGT · ${t.sub}`}
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
        {empty
          ? 'Awaiting fee-bearing txs'
          : (
            <>
              Updated · <span style={{ color: 'var(--color-bone)' }}>just now</span>
            </>
          )}
      </div>
    </FrameCard>
  )
}

// TX/sec is computed over the recent-tx sample (oldest → newest in
// the 100-row /v1/txs window). On a sparse devnet that's often a
// fraction of a tx per second; .toFixed(2) would always read "0.00"
// and hide the real activity. Scale formatting to the magnitude:
//   ≥ 1     → "1.23" / "12.3"
//   ≥ 0.01  → "0.04"
//   ≥ 0.0001 → "0.0004"
//   < 0.0001 → "<0.0001"
//   exactly 0 (no signal) → "—"
function formatTps(tps: number): string {
  if (!Number.isFinite(tps) || tps === 0) return '—'
  if (tps >= 10) return tps.toFixed(1)
  if (tps >= 1) return tps.toFixed(2)
  if (tps >= 0.01) return tps.toFixed(3)
  if (tps >= 0.0001) return tps.toFixed(4)
  return '<0.0001'
}

// Renders the Network KPI tile based on the live `network_status`
// string set by the api adapter (or the RPC fallback path when api
// is down). Three buckets, each with its own dot color:
//   - "Synced"              → accent green
//   - "API unreachable …"   → coral (api dead, RPC fallback active)
//   - "Syncing (lag N)"     → amber
// Pre-PR-#47 the tile was hardcoded to a green "SYNCED" pill that
// ignored network_status entirely, which hid api outages from users.
function NetworkStatusValue({ status }: { status: string }) {
  const isUnreachable = status.toLowerCase().includes('unreachable')
  const isSyncing = status.toLowerCase().includes('syncing')
  const color = isUnreachable
    ? 'var(--color-coral)'
    : isSyncing
      ? 'var(--color-amber)'
      : 'var(--color-accent)'
  const label = isUnreachable
    ? 'API DOWN · RPC'
    : isSyncing
      ? status.toUpperCase()
      : 'SYNCED'
  return (
    <span title={status}>
      <span
        style={{
          display: 'inline-block',
          width: 6,
          height: 6,
          borderRadius: 999,
          background: color,
          marginRight: 8,
          verticalAlign: 'middle',
          boxShadow: `0 0 6px ${color}`,
        }}
      />
      {label}
    </span>
  )
}

export function StatsStrip({
  info,
}: {
  info: { chain_id: string; latest_block: number; tx_per_second: number; finality: string; supply_nano: string; network_status: string }
}) {
  // "Latest block" tile lived here historically, but the BlockTickerCard
  // immediately below shows the same number bigger + with live timing
  // chrome (countdown bar, "expected any moment", indexer-lag hint). Two
  // surfaces showing the same height also occasionally drifted by 1 when
  // their separate poll cadences hit the api's 5s cache windows out of
  // phase — confusing. BlockTickerCard is the single source of truth now.
  const tiles = [
    { label: 'Chain ID', value: info.chain_id, mono: true },
    { label: 'TX / sec', value: formatTps(info.tx_per_second), serif: true },
    // "Block time" not "Finality" — `info.finality` now sources from
    // /v1/stats/next-block-eta.mean_block_interval_secs (rollup slot
    // production interval, ~6s on devnet), not the DA-layer settlement
    // floor (~18s). The two were getting confused. The full
    // DA-settlement breakdown still lives on /info under "Finality
    // breakdown".
    { label: 'Block time', value: info.finality, mono: true },
    { label: 'LGT supply', value: fmtLgtCompact(info.supply_nano), mono: true },
    {
      // Network status reads `info.network_status` (was hardcoded to
      // "SYNCED" before, which silently lied during api outages).
      // Three visual states keyed off the string:
      //   - "Synced"            → accent green dot
      //   - "API unreachable …" → coral dot (api down, RPC fallback)
      //   - "Syncing (lag N)"   → amber dot
      label: 'Network',
      value: <NetworkStatusValue status={info.network_status} />,
      mono: true,
    },
  ]
  return (
    <FrameCard padding={0} style={{ background: 'var(--color-surface)' }}>
      {/* `stats-strip-inner` carries the responsive rule: flex-wrap +
          50%/33% tile widths on smaller viewports so KPI tiles stay
          legible instead of squeezing to 50px wide. Desktop stays
          on a single horizontal row. */}
      <div className="stats-strip-inner" style={{ display: 'flex' }}>
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
