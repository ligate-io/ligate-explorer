'use client'

import { useState } from 'react'
import { useLivePoll } from '@/lib/use-live-poll'

const apiBase = (
  process.env.NEXT_PUBLIC_API_URL ?? 'https://api.ligate.io'
).replace(/\/+$/, '')

// Live chain-head polling for the chain-head embed widget. Polls
// /v1/info every 6s while the host tab is visible: stops when
// hidden so we don't burn the api on background tabs in dozens of
// partner sites at once. Visibility-awareness + cancellation are
// owned by the shared `useLivePoll` hook.
//
// Renders a compact pill: live dot + chain id + "#height". Wrapped
// in an <a> that opens the explorer home in a new tab so a click
// from a partner widget brings the user back to the main site.

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

export function LiveChainHead({ initial }: { initial: Initial }) {
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
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 14px',
        background: '#0a0a0b',
        border: '1px solid #1a1a1f',
        color: '#efead8',
        textDecoration: 'none',
        fontFamily: 'var(--font-mono), monospace',
        fontSize: 11,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {/* Sage dot + soft glow signals "live polling" at a glance */}
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
      {chainId}
      <span style={{ color: '#6a6a74' }}>·</span>
      <span style={{ color: '#ffffff', letterSpacing: '0.04em' }}>
        #{head.toLocaleString()}
      </span>
    </a>
  )
}
