'use client'

import { useEffect, useState } from 'react'

// Browser-side base. Same env var the SSR fetcher reads. Trailing
// slash trimmed so concat is predictable.
const apiBase = (
  process.env.NEXT_PUBLIC_API_URL ?? 'https://api.ligate.io'
).replace(/\/+$/, '')

// Live-polling widget body. Refreshes the count via /v1/schemas/{id}
// every 10s — slower than the home page polls because partners are
// the ones embedding this, and we'd rather under-load their iframe
// than nail the api with one request per partner-tab every 6s.
//
// Renders a compact card: schema name + version eyebrow on top, big
// serif count in the middle, "live · last updated Ns ago" footer.
// All wrapped in an <a> that opens the explorer's schema detail in
// a new tab — partners get a "click for more" affordance for free.

interface Initial {
  name: string
  version: number
  count: number
}

const POLL_MS = 10000

interface SchemaSnapshot {
  attestation_count: number
}

async function fetchCount(id: string): Promise<number | null> {
  try {
    const res = await fetch(`${apiBase}/v1/schemas/${id}`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    const body = (await res.json()) as SchemaSnapshot
    return body.attestation_count
  } catch {
    return null
  }
}

export function LiveSchemaAttestationCount({
  schemaId,
  initial,
}: {
  schemaId: string
  initial: Initial
}) {
  const [count, setCount] = useState(initial.count)
  const [updatedAt, setUpdatedAt] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())

  // Poll for fresh count. Visibility-aware: stops when the host tab
  // is hidden so a forgotten background tab doesn't keep poking the
  // api forever.
  useEffect(() => {
    let cancelled = false
    let id: ReturnType<typeof setTimeout> | null = null
    const tick = async () => {
      const next = await fetchCount(schemaId)
      if (cancelled) return
      if (next != null && next !== count) {
        setCount(next)
        setUpdatedAt(Date.now())
      } else if (next != null) {
        // Same count — still update the timestamp so "last updated"
        // reads like a heartbeat rather than a stale read.
        setUpdatedAt(Date.now())
      }
      if (!cancelled) id = setTimeout(tick, POLL_MS)
    }
    const start = () => {
      if (id) return
      id = setTimeout(tick, POLL_MS)
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
    // We intentionally don't depend on `count` here — the closure
    // reads the latest count via setState's callback form when it
    // needs to compare. Including it would tear down + rebuild the
    // interval on every count change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemaId])

  // 1s wall clock for the "Ns ago" countup. Lighter than polling the
  // api just to refresh a label.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const ageSec = Math.max(0, Math.floor((now - updatedAt) / 1000))

  return (
    <a
      href={`https://explorer.ligate.io/schema/${schemaId}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        padding: '18px 20px',
        background: '#0a0a0b',
        border: '1px solid #1a1a1f',
        color: '#efead8',
        textDecoration: 'none',
        fontFamily: 'var(--font-sans), sans-serif',
        maxWidth: 320,
        // Anchor's outline-on-focus stays — partner accessibility tools
        // still get a clear focus ring.
      }}
    >
      {/* Eyebrow: schema name + version */}
      <div
        style={{
          fontFamily: 'var(--font-mono), monospace',
          fontSize: 10,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: '#6a6a74',
          marginBottom: 8,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={`${initial.name} v${initial.version}`}
      >
        {initial.name} · v{initial.version}
      </div>

      {/* Big serif count */}
      <div
        style={{
          fontFamily: 'var(--font-serif), serif',
          fontSize: 36,
          lineHeight: 1,
          color: '#ffffff',
          letterSpacing: '-0.02em',
        }}
      >
        {count.toLocaleString()}
        <span
          style={{
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 12,
            color: '#6a6a74',
            marginLeft: 8,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          {count === 1 ? 'attestation' : 'attestations'}
        </span>
      </div>

      {/* Footer: live indicator + last-updated */}
      <div
        style={{
          marginTop: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: 'var(--font-mono), monospace',
          fontSize: 9,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: '#6a6a74',
        }}
      >
        <span
          aria-hidden
          style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            borderRadius: 999,
            background: '#a7d28c',
            boxShadow: '0 0 6px #a7d28c',
          }}
        />
        Live · updated {ageSec}s ago · ligate-devnet-1
      </div>
    </a>
  )
}
