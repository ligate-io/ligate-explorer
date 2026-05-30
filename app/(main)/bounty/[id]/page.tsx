import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getBounty } from '@/lib/api'
import { ago, fmtLgt, isoDate, trunc } from '@/lib/format'
import { CopyButton } from '@/components/copy-button'
import { JsonViewer } from '@/components/json-viewer'
import { Eyebrow, FrameCard, LV } from '@/components/ui'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  return { title: `Bounty ${trunc(id, 6, 4)}` }
}

function statusColor(status: string): string {
  switch (status) {
    case 'open':
    case 'finalised':
      return 'var(--color-accent)'
    case 'exhausted':
      return 'var(--color-amber)'
    case 'expired':
    case 'cancelled':
      return 'var(--color-subtle)'
    default:
      return 'var(--color-muted)'
  }
}

// The acceptance predicate is the chain's externally-tagged
// `AcceptancePredicate` enum, e.g. `{ "Any": {} }` or
// `{ "AttestorSet": {...} }`. Surface the variant name (the single
// top-level key) as a human label above the raw JSON.
function predicateLabel(acceptance: Record<string, unknown>): string {
  const keys = Object.keys(acceptance ?? {})
  return keys.length > 0 ? keys[0] : 'unknown'
}

export default async function BountyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const b = await getBounty(id)
  if (!b) notFound()

  const tMs = Date.parse(b.posted_at.timestamp)

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/bounties"
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-subtle)',
          }}
        >
          ← Bounties
        </Link>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 12,
          flexWrap: 'wrap',
        }}
      >
        <Eyebrow>Bounty</Eyebrow>
        <span
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: statusColor(b.status),
          }}
        >
          {b.status}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
          marginBottom: 36,
        }}
      >
        <span
          className="mono"
          style={{
            fontSize: 18,
            color: 'var(--color-bone)',
            wordBreak: 'break-all',
            maxWidth: 760,
          }}
        >
          {b.id}
        </span>
        <CopyButton value={b.id} />
      </div>

      <div
        className="detail-grid-2"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 40,
        }}
      >
        <div>
          <Eyebrow>Board & poster</Eyebrow>
          <div style={{ marginTop: 12 }}>
            <LV
              rows={[
                {
                  label: 'Poster',
                  value: (
                    <Link href={`/address/${b.poster}`} className="link">
                      {trunc(b.poster, 10, 8)}
                    </Link>
                  ),
                },
                {
                  label: 'Board schema',
                  value: (
                    <Link href={`/schema/${b.board_schema_id}`} className="link">
                      {trunc(b.board_schema_id, 10, 8)}
                    </Link>
                  ),
                },
                {
                  label: 'Claims',
                  value: (
                    <span style={{ color: 'var(--color-accent)' }}>
                      {b.claim_count}
                    </span>
                  ),
                },
              ]}
            />
          </div>
        </div>
        <div>
          <Eyebrow>Escrow & terms</Eyebrow>
          <div style={{ marginTop: 12 }}>
            <LV
              rows={[
                {
                  label: 'Pool',
                  value: (
                    <>
                      {fmtLgt(b.pool_nano)}{' '}
                      <span style={{ color: 'var(--color-subtle)' }}>AVOW</span>
                    </>
                  ),
                },
                {
                  label: 'Per attestation',
                  value: (
                    <>
                      {fmtLgt(b.per_attestation_nano)}{' '}
                      <span style={{ color: 'var(--color-subtle)' }}>AVOW</span>
                    </>
                  ),
                },
                {
                  label: 'Escrow remaining',
                  value: (
                    <>
                      {fmtLgt(b.escrow_remaining_nano)}{' '}
                      <span style={{ color: 'var(--color-subtle)' }}>AVOW</span>
                    </>
                  ),
                },
                {
                  label: 'Expiry DA height',
                  value: (
                    <span className="mono">
                      {b.expiry_da_height.toLocaleString()}
                    </span>
                  ),
                },
                {
                  label: 'Dispute window',
                  value: (
                    <>
                      {b.dispute_window_blocks}{' '}
                      <span style={{ color: 'var(--color-subtle)' }}>blocks</span>
                    </>
                  ),
                },
              ]}
            />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 48 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginBottom: 12,
            flexWrap: 'wrap',
          }}
        >
          <Eyebrow>Acceptance predicate</Eyebrow>
          <span
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: '0.12em',
              color: 'var(--color-accent)',
            }}
          >
            {predicateLabel(b.acceptance)}
          </span>
        </div>
        <FrameCard padding={0}>
          <div className="json-block" style={{ border: 0 }}>
            <JsonViewer data={b.acceptance} />
          </div>
        </FrameCard>
      </div>

      <div style={{ marginTop: 48 }}>
        <Eyebrow>Posted</Eyebrow>
        <div style={{ marginTop: 12 }}>
          <LV
            rows={[
              {
                label: 'Tx',
                value: (
                  <Link
                    href={`/tx/${b.posted_at.tx_hash}`}
                    className="link h-mono"
                    title={b.posted_at.tx_hash}
                  >
                    {trunc(b.posted_at.tx_hash, 12, 10)}
                  </Link>
                ),
              },
              {
                label: 'Block',
                value: (
                  <Link
                    href={`/blocks/${b.posted_at.block_height}`}
                    className="link"
                  >
                    #{b.posted_at.block_height}
                  </Link>
                ),
              },
              {
                label: 'When',
                value: (
                  <span suppressHydrationWarning>
                    {Number.isFinite(tMs)
                      ? `${ago(Math.floor((Date.now() - tMs) / 1000))} · ${isoDate(tMs)}`
                      : '—'}
                  </span>
                ),
              },
            ]}
          />
        </div>
      </div>
    </>
  )
}
