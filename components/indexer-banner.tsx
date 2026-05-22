'use client'

import { useEffect, useState } from 'react'

// Top-of-page strip that surfaces *indexer lag*: api is alive and
// responding, but the indexer's behind the chain head by more than
// the threshold. Distinct from the api-unreachable case which
// `<ApiHealthBanner />` covers — the two never render together.
//
// The home page's BlockTickerCard has its own per-card lag hint at
// `indexer_lag_secs > 5`; this banner is the cross-route version, so
// partners on /attestations / /schemas / a detail page (without the
// ticker card) still get the signal.

const apiBase = (
  process.env.NEXT_PUBLIC_API_URL ?? 'https://api.ligate.io'
).replace(/\/+$/, '')

// Lag threshold in slots. Single-slot lag is normal (indexer ingests
// a slot or two behind the chain head); flag only when it slips past
// ~5 slots so we don't cry wolf on every poll cycle.
const LAG_THRESHOLD_SLOTS = 5
const POLL_MS = 15000

interface InfoSnapshot {
  // null = api unreachable. Banner renders nothing in that case so
  // `<ApiHealthBanner />` can own the visual real estate.
  reachable: boolean
  headLagSlots: number | null
}

async function probeInfo(): Promise<InfoSnapshot> {
  try {
    const res = await fetch(`${apiBase}/v1/info`, { cache: 'no-store' })
    if (!res.ok) return { reachable: false, headLagSlots: null }
    const body = (await res.json()) as { head_lag_slots: number | null }
    return { reachable: true, headLagSlots: body.head_lag_slots ?? 0 }
  } catch {
    return { reachable: false, headLagSlots: null }
  }
}

export function IndexerBanner() {
  // Start at `null` (unknown) so first paint never flashes a banner.
  const [snapshot, setSnapshot] = useState<InfoSnapshot | null>(null)

  useEffect(() => {
    let cancelled = false
    const tick = async () => {
      const next = await probeInfo()
      if (!cancelled) setSnapshot(next)
    }
    void tick()
    const id = setInterval(tick, POLL_MS)
    const onFocus = () => void tick()
    window.addEventListener('focus', onFocus)
    return () => {
      cancelled = true
      clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  if (!snapshot) return null
  // ApiHealthBanner owns the unreachable case. Don't double-render.
  if (!snapshot.reachable) return null
  const lag = snapshot.headLagSlots ?? 0
  if (lag <= LAG_THRESHOLD_SLOTS) return null

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-line)',
        padding: '10px 32px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span
          aria-hidden
          style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: 999,
            background: 'var(--color-amber)',
            boxShadow: '0 0 8px var(--color-amber)',
          }}
        />
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-amber)',
          }}
        >
          Indexer behind
        </span>
      </div>
      <span
        style={{
          fontSize: 13,
          color: 'var(--color-bone)',
          lineHeight: 1.4,
        }}
      >
        Indexer is {lag} slots behind the chain head. Newer txs and
        attestations may not appear yet.
      </span>
    </div>
  )
}
