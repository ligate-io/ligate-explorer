'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CopyButton } from './copy-button'
import { Eyebrow, FrameCard } from './ui'

/**
 * Rendered when a tx hash is well-formed (so we can route to it) but
 * the api returns 404. The most common cause is the indexer hasn't
 * caught up to the chain yet, especially right after a faucet drip.
 *
 * Polls router.refresh() every 3s for up to ~60s. Once the tx lands
 * the server component finds it and the parent page renders the real
 * detail view.
 */
export function TxPending({ hash }: { hash: string }) {
  const router = useRouter()
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const refresh = setInterval(() => router.refresh(), 3000)
    const tick = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => {
      clearInterval(refresh)
      clearInterval(tick)
    }
  }, [router])

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/"
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-subtle)',
          }}
        >
          ← Home
        </Link>
      </div>
      <Eyebrow>Transaction · pending</Eyebrow>

      <div
        style={{
          marginTop: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: 22,
            color: 'var(--color-ink)',
            wordBreak: 'break-all',
            maxWidth: 800,
          }}
        >
          {hash}
        </div>
        <CopyButton value={hash} />
      </div>

      <FrameCard padding={24} style={{ marginTop: 36 }}>
        <div
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-subtle)',
            marginBottom: 12,
          }}
        >
          Awaiting indexer
        </div>
        <p
          style={{
            color: 'var(--color-bone)',
            fontSize: 15,
            lineHeight: 1.5,
            marginTop: 0,
            marginBottom: 12,
            maxWidth: 600,
          }}
        >
          The chain accepted this transaction, but the indexer hasn't picked
          it up yet. This page is checking every 3 seconds and will switch
          to the full detail view as soon as the tx is queryable.
        </p>
        <p
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--color-subtle)',
            marginTop: 0,
          }}
        >
          Polling for {seconds}s
        </p>
      </FrameCard>
    </>
  )
}
