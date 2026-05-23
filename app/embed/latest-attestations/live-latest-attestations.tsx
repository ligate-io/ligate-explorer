'use client'

import { useEffect, useState } from 'react'
import { formatRelativeTime, trunc } from '@/lib/format'
import { useLivePoll } from '@/lib/use-live-poll'

const apiBase = (
  process.env.NEXT_PUBLIC_API_URL ?? 'https://api.ligate.io'
).replace(/\/+$/, '')

// Live attestations feed for the latest-attestations embed widget.
// Polls /v1/attestations?limit=5 every 15s, visibility-aware (stops
// when the host tab is hidden so dozens of partner tabs don't all
// hammer the api in the background).

interface Row {
  id: string
  schemaId: string
  submitter: string
  timestamp: string
}

const POLL_MS = 15000

interface RawAttestationItem {
  id: string
  schema_id: string
  submitter: string
  submitted_at: { timestamp: string }
}

interface AttestationItemPage {
  data: RawAttestationItem[]
}

async function fetchRows(limit: number): Promise<Row[] | null> {
  try {
    const res = await fetch(`${apiBase}/v1/attestations?limit=${limit}`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    const body = (await res.json()) as AttestationItemPage
    return body.data.map((a) => ({
      id: a.id,
      schemaId: a.schema_id,
      submitter: a.submitter,
      timestamp: a.submitted_at.timestamp,
    }))
  } catch {
    return null
  }
}

export function LiveLatestAttestations({
  limit,
  initial,
}: {
  limit: number
  initial: Row[]
}) {
  const [rows, setRows] = useState(initial)
  const [, setTick] = useState(0)

  // Poll fresh rows. Visibility-awareness + cancellation owned by
  // the shared `useLivePoll` hook.
  useLivePoll(async () => {
    const next = await fetchRows(limit)
    if (next) setRows(next)
  }, POLL_MS)

  // 10s tick to refresh the "Ns ago" labels without re-polling the api
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 10000)
    return () => clearInterval(t)
  }, [])

  return (
    <div
      style={{
        display: 'block',
        padding: '16px 18px',
        background: '#0a0a0b',
        border: '1px solid #1a1a1f',
        color: '#efead8',
        fontFamily: 'var(--font-sans), sans-serif',
        maxWidth: 360,
      }}
    >
      {/* Eyebrow with live dot. Echoes the chain-head + attestation-count
          widgets so all four widgets feel like one family. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: 'var(--font-mono), monospace',
          fontSize: 10,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: '#6a6a74',
          marginBottom: 12,
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
        Latest attestations
      </div>

      {/* Empty state when the api returns no rows (e.g. brand-new
          devnet, or rate-limited fetch). Better than a blank card. */}
      {rows.length === 0 ? (
        <div
          style={{
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 11,
            color: '#6a6a74',
            padding: '12px 0',
          }}
        >
          No attestations yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((r) => (
            <a
              key={r.id}
              href={`https://explorer.ligate.io/attestation/${r.id}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '8px 0',
                borderTop: '1px solid #1a1a1f',
                textDecoration: 'none',
                color: '#efead8',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono), monospace',
                    fontSize: 11,
                    color: '#efead8',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {trunc(r.submitter, 8, 4)}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono), monospace',
                    fontSize: 9,
                    color: '#6a6a74',
                    letterSpacing: '0.06em',
                  }}
                >
                  {trunc(r.schemaId, 8, 4)}
                </span>
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-mono), monospace',
                  fontSize: 9,
                  color: '#6a6a74',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {formatRelativeTime(r.timestamp)}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
