import type { Metadata } from 'next'
import {
  getAllBlocks,
  getAttestationsDaily,
  getInfo,
  getTxRateDaily,
} from '@/lib/api'
import { Eyebrow, FrameCard } from '@/components/ui'

export const metadata: Metadata = { title: 'Chain stats' }
export const dynamic = 'force-dynamic'

// `/stats` — time-series charts for chain telemetry. Three cards
// stacked full-width:
//   1. Daily transactions (30d) — bars per day, summed across kinds
//   2. Daily attestations (30d) — bars per day, sparse api filled in
//   3. Block time (rolling 10-slot median across the last 100 blocks)
//
// Server-rendered, force-dynamic so each visit hits the api. The
// charts are inline SVG with no external library — keeps the bundle
// small + makes the brand visuals (sage accent, mono labels) easy
// to control. Sibling to TxTrendCard / DailyAttestationsCard on the
// home dashboard; this page is for the deeper-dive view.

// Daily bar chart helper. Renders `count` bars across the full width
// with newest-first ordering and a small "X axis" of date ticks at
// the bottom every 7 days. Returns a complete card (header + chart
// + summary) so callers just pass data + labels.
function DailyBarChart({
  label,
  points,
  unit,
  emptyHint,
}: {
  label: string
  points: { date: string; count: number }[]
  unit?: string
  emptyHint?: string
}) {
  const total = points.reduce((acc, p) => acc + p.count, 0)
  const max = Math.max(1, ...points.map((p) => p.count))
  const days = points.length
  // 7-day date labels at the bottom — oldest, then every 7 days,
  // newest. Skip middle ones if the window is short.
  const ticks: { idx: number; label: string }[] = []
  if (days >= 2) {
    for (let i = 0; i < days; i += 7) {
      ticks.push({ idx: i, label: points[i].date.slice(5) })
    }
    // Always include the newest tick so the right edge has a label.
    if (ticks[ticks.length - 1]?.idx !== days - 1) {
      ticks.push({ idx: days - 1, label: points[days - 1].date.slice(5) })
    }
  }
  // SVG geometry. Width is responsive via `preserveAspectRatio`;
  // each bar takes a fixed `slotW` slot and gets `barW` of it as
  // visible width. Bar height encodes count linearly relative to
  // window max.
  const chartH = 180
  const slotW = Math.max(8, 1000 / Math.max(1, days))
  const barW = Math.max(2, slotW * 0.7)

  return (
    <FrameCard padding={28}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 18,
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
              marginBottom: 8,
            }}
          >
            {label}
          </div>
          <div
            className="serif"
            style={{ fontSize: 38, lineHeight: 1, color: 'var(--color-ink)' }}
          >
            {total >= 1000 ? `${(total / 1000).toFixed(1)}K` : total.toString()}
            {unit ? (
              <span
                className="mono"
                style={{
                  fontSize: 14,
                  color: 'var(--color-subtle)',
                  marginLeft: 8,
                }}
              >
                {unit}
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
      {total === 0 ? (
        <div
          style={{
            height: chartH,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--color-subtle)',
            }}
          >
            {emptyHint ?? 'No activity in window'}
          </span>
        </div>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${days * slotW} ${chartH}`}
            width="100%"
            height={chartH}
            preserveAspectRatio="none"
          >
            {points.map((p, i) => {
              const h = (p.count / max) * (chartH - 20)
              const opacity = 0.4 + (i / Math.max(1, days - 1)) * 0.6
              return (
                <g key={p.date}>
                  <rect
                    x={i * slotW + (slotW - barW) / 2}
                    y={chartH - h}
                    width={barW}
                    height={h}
                    fill="var(--color-accent)"
                    opacity={opacity}
                  >
                    <title>{`${p.date} · ${p.count.toLocaleString()}${unit ? ' ' + unit : ''}`}</title>
                  </rect>
                </g>
              )
            })}
          </svg>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 6,
            }}
          >
            {ticks.map((t, i) => (
              <span
                key={i}
                className="mono"
                style={{ fontSize: 9, color: 'var(--color-subtle)' }}
              >
                {t.label}
              </span>
            ))}
          </div>
        </>
      )}
    </FrameCard>
  )
}

// Block-time chart. Computes rolling-window median of inter-slot
// deltas across the recent-blocks sample, then renders the per-window
// medians as a bar chart. Each bar is one window of `windowSize`
// consecutive slots.
function BlockTimeChart({ blocks }: { blocks: { timestamp: number }[] }) {
  // Sort oldest-first for delta computation. The api returns
  // newest-first; reverse and compute deltas in order.
  const ts = blocks
    .map((b) => b.timestamp)
    .filter((t) => t > 0)
    .sort((a, b) => a - b)
  // Per-slot deltas in seconds. Need len > 1.
  const deltas: number[] = []
  for (let i = 1; i < ts.length; i++) {
    deltas.push((ts[i] - ts[i - 1]) / 1000)
  }
  // Window the deltas so we get ~12 bars regardless of sample size.
  const windowSize = Math.max(1, Math.floor(deltas.length / 12) || 1)
  const windows: number[] = []
  for (let i = 0; i + windowSize <= deltas.length; i += windowSize) {
    const slice = deltas.slice(i, i + windowSize).sort((a, b) => a - b)
    const mid = Math.floor(slice.length / 2)
    const median =
      slice.length % 2
        ? slice[mid]
        : (slice[mid - 1] + slice[mid]) / 2
    windows.push(median)
  }
  const max = Math.max(1, ...windows)
  const overallMedian = windows.length
    ? (() => {
        const sorted = windows.slice().sort((a, b) => a - b)
        const mid = Math.floor(sorted.length / 2)
        return sorted.length % 2
          ? sorted[mid]
          : (sorted[mid - 1] + sorted[mid]) / 2
      })()
    : 0
  const chartH = 180
  const slotW =
    windows.length > 0 ? Math.max(8, 1000 / windows.length) : 8
  const barW = Math.max(4, slotW * 0.7)

  return (
    <FrameCard padding={28}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 18,
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
              marginBottom: 8,
            }}
          >
            Block time
          </div>
          <div
            className="serif"
            style={{ fontSize: 38, lineHeight: 1, color: 'var(--color-ink)' }}
          >
            {overallMedian > 0 ? `~${overallMedian.toFixed(1)}s` : '—'}
            <span
              className="mono"
              style={{
                fontSize: 14,
                color: 'var(--color-subtle)',
                marginLeft: 8,
              }}
            >
              median
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
          {ts.length} slots
        </span>
      </div>
      {windows.length === 0 ? (
        <div
          style={{
            height: chartH,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--color-subtle)',
            }}
          >
            Need ≥2 slots to chart block time
          </span>
        </div>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${windows.length * slotW} ${chartH}`}
            width="100%"
            height={chartH}
            preserveAspectRatio="none"
          >
            {windows.map((v, i) => {
              const h = (v / max) * (chartH - 20)
              const opacity = 0.45 + (i / Math.max(1, windows.length - 1)) * 0.55
              return (
                <rect
                  key={i}
                  x={i * slotW + (slotW - barW) / 2}
                  y={chartH - h}
                  width={barW}
                  height={h}
                  fill="var(--color-accent)"
                  opacity={opacity}
                >
                  <title>{`window ${i + 1} · ${v.toFixed(2)}s median`}</title>
                </rect>
              )
            })}
          </svg>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 6,
            }}
          >
            <span
              className="mono"
              style={{ fontSize: 9, color: 'var(--color-subtle)' }}
            >
              oldest
            </span>
            <span
              className="mono"
              style={{ fontSize: 9, color: 'var(--color-subtle)' }}
            >
              newest
            </span>
          </div>
        </>
      )}
    </FrameCard>
  )
}

// Backfill helper: api returns sparse points (zero-count days are
// absent), but for a clean rolling bar chart we want one entry per
// day in the window. Builds N days ending today and fills missing
// dates with 0.
function backfillDaily(
  points: { date: string; count: number }[],
  days: number,
): { date: string; count: number }[] {
  const byDate = new Map(points.map((p) => [p.date, p.count]))
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const out: { date: string; count: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setUTCDate(d.getUTCDate() - i)
    const date = d.toISOString().slice(0, 10)
    out.push({ date, count: byDate.get(date) ?? 0 })
  }
  return out
}

export default async function StatsPage() {
  const [info, txRate, attestationDaily, blocks] = await Promise.all([
    getInfo(),
    getTxRateDaily(30),
    getAttestationsDaily(30),
    getAllBlocks(),
  ])

  // tx-rate-daily returns one row per (date, kind, outcome). Sum across
  // kinds + outcomes for the per-day total.
  const txByDate = new Map<string, number>()
  for (const p of txRate) {
    txByDate.set(p.date, (txByDate.get(p.date) ?? 0) + p.count)
  }
  const txPoints = backfillDaily(
    Array.from(txByDate, ([date, count]) => ({ date, count })),
    30,
  )
  const attestationPoints = backfillDaily(attestationDaily, 30)

  return (
    <>
      <div style={{ paddingTop: 16 }}>
        <Eyebrow>Chain stats · {info.chain_id}</Eyebrow>
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
          The chain&apos;s{' '}
          <em style={{ color: 'var(--color-accent)' }}>cadence</em>, charted.
        </h1>
        <p
          style={{
            color: 'var(--color-muted)',
            maxWidth: 560,
            marginTop: 20,
          }}
        >
          Three time-series snapshots: daily transactions and attestations
          over the last 30 days, plus block time as a rolling median across
          the most recent {blocks.length} slots. Each visit hits the api;
          this page doesn&apos;t cache between loads.
        </p>
      </div>

      <div
        style={{
          marginTop: 40,
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        <DailyBarChart
          label="Daily transactions"
          points={txPoints}
          emptyHint="No transactions in window"
        />
        <DailyBarChart
          label="Daily attestations"
          points={attestationPoints}
          emptyHint="No attestations in window"
        />
        <BlockTimeChart blocks={blocks} />
      </div>

      <p
        style={{
          marginTop: 48,
          color: 'var(--color-subtle)',
          fontSize: 13,
          maxWidth: 620,
        }}
      >
        Sources: <span className="mono">/v1/stats/tx-rate-daily</span>{' '}
        + <span className="mono">/v1/stats/attestations-daily</span> +{' '}
        <span className="mono">/v1/blocks?limit=100</span>. Block-time
        windows are computed client-side from the slot-timestamp deltas;
        sparse days in the api responses are backfilled with zero for a
        contiguous bar chart.
      </p>
    </>
  )
}
