'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CopyButton } from './copy-button'
import { Eyebrow, FrameCard } from './ui'

/**
 * Rendered when the URL carries a well-formed `lat1…` attestation id
 * but the api returns 404. Common cause: an integrating product
 * (Themisra "soft verification", Mneme attestor pilots, etc.) shows
 * the user a "view on explorer" link as soon as it submits the
 * attestation tx, but the indexer hasn't ingested the slot yet. The
 * tx → indexer lag is usually 1–4s on devnet.
 *
 * Same shape as TxPending: polls `router.refresh()` every 3s. Once
 * the api has the row, the server component finds it and the parent
 * page renders the full detail view in place of this card. The user
 * sees an in-place upgrade, no manual reload.
 */
export function AttestationPending({ id }: { id: string }) {
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
          href="/attestations"
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-subtle)',
          }}
        >
          ← Attestations
        </Link>
      </div>
      <Eyebrow>Attestation · pending</Eyebrow>

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
            fontSize: 18,
            color: 'var(--color-ink)',
            wordBreak: 'break-all',
            maxWidth: 800,
          }}
        >
          {id}
        </div>
        <CopyButton value={id} />
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
          The product that linked you here (a Themisra soft-verify, a
          Mneme attestor pilot, or any other integration) has submitted
          this attestation to the chain, but the indexer hasn&apos;t
          picked it up yet. This page is checking every 3 seconds and
          will switch to the full detail view as soon as the row is
          queryable.
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
