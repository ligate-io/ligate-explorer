'use client'

import { useEffect, useRef, useState } from 'react'
import type { NextBlockEta } from '@/lib/api-types'
import { FrameCard } from './ui'

// Browser-side base. lib/api.ts is server-only; the api responds with
// open CORS so we hit /v1/stats/next-block-eta directly. Same env
// variable the SSR fetchers read.
const apiBase = (
  process.env.NEXT_PUBLIC_API_URL ?? 'https://api.ligate.io'
).replace(/\/+$/, '')

// Live block-ticker card. Two signals feed it:
//
//   1. `latestBlock` prop, refreshed by `<AutoRefresh intervalMs={6000}/>`
//      via router.refresh() → the SSR-side getInfo(). This is our
//      ground truth for "a new block landed" — when the prop bumps,
//      we reset the timer to 0 from the wall-clock instant we observe
//      the bump.
//   2. /v1/stats/next-block-eta polled every 10s, which gives us the
//      measured `mean_block_interval_secs` (the bar's full duration).
//      We don't trust eta.last_block_timestamp for the timer because
//      the indexer can lag the chain by 10+s, which would pin the
//      bar at 100% forever even when blocks are landing on schedule.
//
// Height shown is `max(latestBlock, eta.last_block_height)` so the
// card never reads stale relative to the StatsStrip's "Latest block"
// tile.
export function BlockTickerCard({ latestBlock }: { latestBlock: number }) {
  const [eta, setEta] = useState<NextBlockEta | null>(null)
  const [now, setNow] = useState(() => Date.now())
  // Wall-clock instant we last "saw" a new block. Reset by the two
  // signals above. Initialised to mount time — wrong by up to one
  // mean_interval, but the bar self-corrects as soon as the next
  // bump arrives.
  const lastBumpAt = useRef(Date.now())
  // Highest block we've observed across both signals. Used to detect
  // bumps without re-running the reset for stale prop values.
  const lastSeenHeight = useRef(latestBlock)

  // SSR-side bump detector: the page polls /v1/info every 6s; when
  // it returns a higher height, the prop bumps and we reset the
  // timer to "now" (we don't have an exact landing timestamp from
  // SSR, but it's at most 6s old, which is within the bar's tick
  // resolution).
  useEffect(() => {
    if (latestBlock > lastSeenHeight.current) {
      lastSeenHeight.current = latestBlock
      lastBumpAt.current = Date.now()
    }
  }, [latestBlock])

  // Eta polling: every 10s. When eta knows about a newer block than
  // we do, reset the timer using the eta's `last_block_timestamp` if
  // it's recent (within ~30s of now), or "just observed" otherwise.
  // The 30s window keeps us honest when the indexer is heavily
  // lagging — better to under-report elapsed than to pin the bar.
  useEffect(() => {
    let cancelled = false
    const fetchEta = async () => {
      try {
        const res = await fetch(`${apiBase}/v1/stats/next-block-eta`, {
          cache: 'no-store',
        })
        if (cancelled || !res.ok) return
        const body = (await res.json()) as NextBlockEta
        if (cancelled) return
        setEta(body)
        if (body.last_block_height > lastSeenHeight.current) {
          lastSeenHeight.current = body.last_block_height
          const tsMs = Date.parse(body.last_block_timestamp)
          if (Number.isFinite(tsMs) && Date.now() - tsMs < 30_000) {
            lastBumpAt.current = tsMs
          } else {
            lastBumpAt.current = Date.now()
          }
        }
      } catch {
        /* swallow; next interval retries */
      }
    }
    fetchEta()
    const refresh = setInterval(fetchEta, 10_000)
    const tick = setInterval(() => setNow(Date.now()), 100)
    return () => {
      cancelled = true
      clearInterval(refresh)
      clearInterval(tick)
    }
  }, [])

  const meanInterval = eta?.mean_block_interval_secs
  const elapsed = (now - lastBumpAt.current) / 1000
  const overdue = meanInterval != null && elapsed > meanInterval
  const secondsLeft =
    meanInterval != null ? Math.max(0, meanInterval - elapsed) : null
  const progress =
    meanInterval && meanInterval > 0
      ? Math.min(1, Math.max(0, elapsed / meanInterval))
      : 0
  const cells = 18
  const filled = Math.floor(progress * cells)
  const warmingUp = eta != null && meanInterval == null
  const indexerBehind = (eta?.indexer_lag_secs ?? 0) > 5
  // Take the higher of the two signals so the card never lags behind
  // the StatsStrip's "Latest block" tile (both ultimately read from
  // /v1/info via SSR, but eta can also race ahead during heavy lag).
  const height = Math.max(latestBlock, eta?.last_block_height ?? 0)

  return (
    <FrameCard padding={22}>
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
            Block
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span
              className="serif"
              style={{ fontSize: 30, color: 'var(--color-ink)', lineHeight: 1 }}
            >
              #{height.toLocaleString()}
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
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
          <span
            className="serif"
            style={{ fontSize: 22, color: 'var(--color-accent)' }}
          >
            {meanInterval != null ? `~${meanInterval.toFixed(1)}s` : '—'}
          </span>
        </div>
      </div>
      <div
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--color-muted)',
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span
          aria-hidden
          style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            borderRadius: 999,
            background: warmingUp
              ? 'var(--color-subtle)'
              : overdue
                ? 'var(--color-amber)'
                : 'var(--color-accent)',
            boxShadow: warmingUp
              ? 'none'
              : `0 0 6px ${overdue ? 'var(--color-amber)' : 'var(--color-accent)'}`,
          }}
        />
        {warmingUp
          ? 'Indexer warming up'
          : overdue
            ? 'Expected any moment'
            : 'Awaiting new block'}
      </div>
      <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
        {Array.from({ length: cells }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 22,
              background:
                i < filled ? 'var(--color-accent)' : 'rgba(167,210,140,0.08)',
              borderTop:
                '1px solid ' + (i < filled ? 'var(--color-accent)' : 'transparent'),
              backgroundImage:
                i >= filled
                  ? 'repeating-linear-gradient(135deg, transparent, transparent 4px, rgba(255,255,255,0.04) 4px, rgba(255,255,255,0.04) 5px)'
                  : 'none',
            }}
          />
        ))}
        <span
          className="mono"
          style={{
            marginLeft: 10,
            fontSize: 12,
            color: overdue ? 'var(--color-amber)' : 'var(--color-muted)',
            minWidth: 36,
            textAlign: 'right',
          }}
        >
          {secondsLeft == null
            ? '—'
            : overdue
              ? 'now'
              : `${Math.max(0, secondsLeft).toFixed(0)}s`}
        </span>
      </div>
      {indexerBehind ? (
        <div
          className="mono"
          style={{
            marginTop: 12,
            fontSize: 9,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--color-subtle)',
          }}
          title="Chain is producing slots faster than the indexer can ingest. Surfaced from /v1/stats/next-block-eta.indexer_lag_secs."
        >
          Indexer is {(eta?.indexer_lag_secs ?? 0).toFixed(0)}s behind
        </div>
      ) : null}
    </FrameCard>
  )
}
