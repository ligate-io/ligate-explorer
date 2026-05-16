'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Periodically calls `router.refresh()` so the current route's server
 * components re-fetch and re-render without losing client state. Used
 * on the homepage so the live block height + recent txs advance
 * without the user having to hit reload.
 *
 * Trade-off: refreshes the whole route, including widgets that change
 * less often. For a devnet explorer at ~6s block time the cost is
 * negligible. Pause polling when the tab is hidden so we're not
 * burning api requests on background tabs.
 */
export function AutoRefresh({ intervalMs = 6000 }: { intervalMs?: number }) {
  const router = useRouter()
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null
    const start = () => {
      if (id) return
      id = setInterval(() => router.refresh(), intervalMs)
    }
    const stop = () => {
      if (id) {
        clearInterval(id)
        id = null
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') start()
      else stop()
    }
    document.addEventListener('visibilitychange', onVisibility)
    if (document.visibilityState === 'visible') start()
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      stop()
    }
  }, [router, intervalMs])
  return null
}
