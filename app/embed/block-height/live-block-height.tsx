'use client'

import { useState } from 'react'
import { useLivePoll } from '@/lib/use-live-poll'

// Live-polling counter for the block-height embed widget. Same /v1/info
// + 6s cadence as /embed/chain-head's poller (shared via the
// `useLivePoll` hook), but the render is different: this one is a
// decorative big-serif number (centerpiece composition), not an
// operational pill.

const apiBase = (
  process.env.NEXT_PUBLIC_API_URL ?? 'https://api.ligate.io'
).replace(/\/+$/, '')

interface Initial {
  chainId: string
  latestBlock: number
}

const POLL_MS = 6000

interface InfoSnapshot {
  chain_id: string
  indexer_height: number | null
  head_height: number | null
}

async function fetchHead(): Promise<InfoSnapshot | null> {
  try {
    const res = await fetch(`${apiBase}/v1/info`, { cache: 'no-store' })
    if (!res.ok) return null
    return (await res.json()) as InfoSnapshot
  } catch {
    return null
  }
}

export function LiveBlockHeight({ initial }: { initial: Initial }) {
  const [chainId, setChainId] = useState(initial.chainId)
  const [head, setHead] = useState(initial.latestBlock)

  useLivePoll(async () => {
    const next = await fetchHead()
    if (!next) return
    setChainId(next.chain_id)
    if (next.indexer_height != null) setHead(next.indexer_height)
  }, POLL_MS)

  return (
    <a
      href="https://explorer.ligate.io"
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        padding: '20px 24px',
        background: '#0a0a0b',
        border: '1px solid #1a1a1f',
        color: '#efead8',
        textDecoration: 'none',
        fontFamily: 'var(--font-sans), sans-serif',
        maxWidth: 280,
        textAlign: 'center',
      }}
    >
      {/* Eyebrow: chain id + label */}
      <div
        style={{
          fontFamily: 'var(--font-mono), monospace',
          fontSize: 10,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: '#6a6a74',
          marginBottom: 10,
        }}
      >
        {chainId} · block height
      </div>

      {/* Big serif centerpiece */}
      <div
        style={{
          fontFamily: 'var(--font-serif), serif',
          fontSize: 44,
          lineHeight: 1,
          color: '#ffffff',
          letterSpacing: '-0.02em',
        }}
      >
        #{head.toLocaleString()}
      </div>

      {/* Sage live dot footer to signal it's polling, not a stale screenshot */}
      <div
        style={{
          marginTop: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
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
        live
      </div>
    </a>
  )
}
