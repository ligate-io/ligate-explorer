'use client'

import { useEffect, useState } from 'react'
import { pingApiHealth } from '@/lib/api-browser'

// Global "API unreachable" banner. Renders nothing while the api is
// healthy; flips to a sticky amber bar at the top of every page when
// /v1/info has failed 2+ consecutive times.
//
// Why a banner instead of just letting pages go empty: with mock data
// removed (PR #46), an api outage produces empty lists everywhere
// with no explanation. The user can't tell if the chain is dead, the
// indexer is dead, or they typed the wrong URL. The banner clarifies.
//
// Polling cadence: 30s. The live cards already poll /v1/info on a 6s
// cadence (LiveStatsStrip, BlockTickerCard via eta) for their own
// purposes; this banner runs independently with a longer interval
// because its only job is to detect prolonged outages, not catch
// every transient blip. A single failure is ignored; 2 consecutive
// failures trip the banner.
//
// On detection: the chain head still advances via the RPC fallback
// path (see `fetchInfoFromBrowser` + `fetchChainHeadFromRpc`), so
// the BlockTickerCard + LiveStatsStrip "latest block" tile keep
// ticking. Indexed surfaces (paginated lists, search, attestation
// listings, aggregated stats) stay empty because the chain RPC
// can't replicate them.
const POLL_MS = 30_000
const FAIL_THRESHOLD = 2

export function ApiHealthBanner() {
  const [consecutiveFails, setConsecutiveFails] = useState(0)

  useEffect(() => {
    let cancelled = false
    let id: ReturnType<typeof setTimeout> | null = null

    const tick = async () => {
      const ok = await pingApiHealth()
      if (cancelled) return
      setConsecutiveFails((prev) => (ok ? 0 : prev + 1))
      if (!cancelled) id = setTimeout(tick, POLL_MS)
    }

    const start = () => {
      if (id) return
      void tick()
    }
    const stop = () => {
      if (id) {
        clearTimeout(id)
        id = null
      }
    }
    const onVis = () => {
      if (document.visibilityState === 'visible') start()
      else stop()
    }
    document.addEventListener('visibilitychange', onVis)
    if (document.visibilityState === 'visible') start()
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVis)
      stop()
    }
  }, [])

  if (consecutiveFails < FAIL_THRESHOLD) return null

  return (
    <div
      role="alert"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 70,
        background: 'var(--color-amber)',
        color: 'var(--color-bg)',
        padding: '10px 24px',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        textAlign: 'center',
        borderBottom: '1px solid rgba(0,0,0,0.2)',
      }}
    >
      API unreachable. Live chain head still ticking via RPC fallback;
      indexed lists and search are temporarily empty.
    </div>
  )
}
