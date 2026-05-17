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

// Live block-ticker card.
//
// Now fully self-polling — was previously driven by `router.refresh()`
// on the home page (AutoRefresh component, removed). The displayed
// height comes from `eta.last_block_height` once the first eta poll
// resolves; until then we render `initialBlock`, the value the server
// passed in during SSR. The StatsStrip is also a self-polling client
// component now, so the two surfaces may transiently drift by one
// block during the few hundred ms between their cache windows; on a
// ~6s slot chain that's perceptually invisible and converges within
// one cycle.
//
// Bar timer resets on EVERY displayed-height change via React's
// official "compare-in-render + setState" pattern (refs track previous
// height; the render-time check schedules a state update; React
// batches it with the same render). More reliable than useEffect for
// prop-driven resets because it doesn't depend on commit timing or
// effect order, and it fires correctly even if the component remounts
// (the ref re-initializes to the new height, no false bump).
//
// Eta polling cadence (4s) is shorter than the api's 5s
// Cache-Control window so we always pick up the freshest value on the
// next interval after a slot lands.
export function BlockTickerCard({ initialBlock }: { initialBlock: number }) {
  const [eta, setEta] = useState<NextBlockEta | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [bumpAt, setBumpAt] = useState(() => Date.now())

  // Displayed height: eta wins once it's loaded; before then we render
  // the server-rendered initial value. Either way it's the source of
  // truth for the bar reset below.
  const displayedHeight = eta?.last_block_height ?? initialBlock

  // Render-time prop comparison. When the displayed height changes,
  // schedule a state update for bumpAt; React batches it into this
  // same render.
  const prevHeightRef = useRef(displayedHeight)
  if (displayedHeight !== prevHeightRef.current) {
    prevHeightRef.current = displayedHeight
    setBumpAt(Date.now())
  }

  // 100ms local tick for the bar progress + countdown.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(id)
  }, [])

  // Derived liveness state. Computed up here so the polling effect
  // below can read `overdue` via a ref to decide whether to accelerate
  // its poll cadence — the rest of the component reads these directly
  // for chrome rendering.
  const meanInterval = eta?.mean_block_interval_secs
  const elapsed = (now - bumpAt) / 1000
  const overdue = meanInterval != null && elapsed > meanInterval

  // Adaptive eta polling.
  //
  // The api endpoint has a 5s Cache-Control TTL, so polling faster
  // than that mostly hits cache. The trick is *catching the moment the
  // cache expires* — at a 4s fixed cadence the worst case was ~8s of
  // stale displayed height (poll right before block lands → wait 4s
  // → cache served stale → poll again → fresh). That's the
  // "freezes then jumps" the user kept hitting.
  //
  // Three liveness levers:
  //   1. Base cadence is 2s, not 4s. We pay one extra fetch per
  //      cache window, but the worst-case staleness drops to ~5+2s.
  //   2. When we're past `expected_next_at` (overdueRef.current),
  //      poll every 1s. We KNOW there's a block we haven't seen, no
  //      reason to wait the full base interval.
  //   3. Window 'focus' event triggers an immediate fetch. macOS
  //      display dimming, alt-tab to another app, dragging the
  //      window, etc. don't all fire 'visibilitychange', but they DO
  //      fire 'focus' on return. Belt-and-suspenders with the
  //      visibility handler.
  //
  // Implementation uses recursive setTimeout (not setInterval) so the
  // delay can change between fires without tearing down the effect.
  const overdueRef = useRef(false)
  overdueRef.current = overdue
  useEffect(() => {
    let cancelled = false
    let id: ReturnType<typeof setTimeout> | null = null
    const fetchEta = async () => {
      try {
        const res = await fetch(`${apiBase}/v1/stats/next-block-eta`, {
          cache: 'no-store',
        })
        if (cancelled || !res.ok) return
        const body = (await res.json()) as NextBlockEta
        if (!cancelled) setEta(body)
      } catch {
        /* swallow; next tick retries */
      }
    }
    const scheduleNext = () => {
      if (cancelled) return
      const delay = overdueRef.current ? 1000 : 2000
      id = setTimeout(async () => {
        await fetchEta()
        scheduleNext()
      }, delay)
    }
    const start = () => {
      if (id) return
      scheduleNext()
    }
    const stop = () => {
      if (id) {
        clearTimeout(id)
        id = null
      }
    }
    // Fires when the tab itself shows/hides (other tab activated,
    // window minimised). Heavier-weight than 'focus'.
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        void fetchEta()
        start()
      } else {
        stop()
      }
    }
    // Fires whenever the window regains keyboard focus. Catches
    // brief away-from-page events that don't trip 'visibilitychange'.
    const onFocus = () => {
      void fetchEta()
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', onFocus)
    void fetchEta()
    if (document.visibilityState === 'visible') start()
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', onFocus)
      stop()
    }
  }, [])

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
              #{displayedHeight.toLocaleString()}
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
