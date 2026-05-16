'use client'

import { useEffect, useRef } from 'react'

/**
 * Visibility-aware polling hook.
 *
 * Calls `fn` every `intervalMs` while the tab is visible. Pauses
 * automatically when the tab goes hidden, resumes when it comes back.
 * Does NOT fire on mount — the homepage's live cards always have
 * server-rendered initial data, so an immediate-on-mount fetch would
 * just duplicate work and risk a brief flash if the api answer races
 * the SSR one. First poll fires `intervalMs` after mount.
 *
 * The `fn` ref is updated on every render so closures stay fresh
 * without forcing the effect to tear down + rebuild the interval —
 * the polling cadence is decoupled from `fn`'s identity.
 *
 * Replaces the route-wide `router.refresh()` AutoRefresh pattern: each
 * live card runs its own poller, only that card re-renders, and the
 * rest of the page tree stays mounted across updates.
 */
export function useLivePoll(
  fn: () => void | Promise<void>,
  intervalMs: number,
): void {
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null

    const start = () => {
      if (id) return
      id = setInterval(() => {
        void fnRef.current()
      }, intervalMs)
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
  }, [intervalMs])
}
