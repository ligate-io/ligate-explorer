import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getContract } from '@/lib/api'
import { ago, fmtLgt, isoDate, trunc } from '@/lib/format'
import { CopyButton } from '@/components/copy-button'
import { Eyebrow, FrameCard, LV } from '@/components/ui'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  return { title: `Contract ${trunc(id, 6, 4)}` }
}

// Lifecycle-state → accent colour. `open`/`accepted` are accent; the
// mid-flight states are amber; terminal failures fade to subtle.
function statusColor(status: string): string {
  switch (status) {
    case 'open':
    case 'accepted':
      return 'var(--color-accent)'
    case 'committed':
    case 'delivered':
    case 'disputed':
      return 'var(--color-amber)'
    case 'rejected':
    case 'cancelled':
    case 'expired':
      return 'var(--color-subtle)'
    default:
      return 'var(--color-muted)'
  }
}

// The chain emits the 32-byte criteria-doc hash as a hex string, but the
// current indexer stores the `[u8; 32]` JSON-array repr verbatim
// (`"[237,60,...]"`). Normalise either form to `0x…` hex for display.
function criteriaHex(raw: string): string {
  const t = (raw ?? '').trim()
  if (t.startsWith('[')) {
    try {
      const arr = JSON.parse(t) as unknown
      if (Array.isArray(arr)) {
        return (
          '0x' +
          arr
            .map((b) => (Number(b) & 0xff).toString(16).padStart(2, '0'))
            .join('')
        )
      }
    } catch {
      // fall through to the raw value
    }
  }
  if (!t) return ''
  return t.startsWith('0x') ? t : `0x${t}`
}

export default async function ContractPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const c = await getContract(id)
  if (!c) notFound()

  const criteria = criteriaHex(c.criteria_doc_hash)
  const tMs = Date.parse(c.posted_at.timestamp)

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/contracts"
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-subtle)',
          }}
        >
          ← Contracts
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
        <Eyebrow>Contract</Eyebrow>
        <span
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: statusColor(c.status),
          }}
        >
          {c.status}
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
          {c.id}
        </span>
        <CopyButton value={c.id} />
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
          <Eyebrow>Parties</Eyebrow>
          <div style={{ marginTop: 12 }}>
            <LV
              rows={[
                {
                  label: 'Poster',
                  value: (
                    <Link href={`/address/${c.poster}`} className="link">
                      {trunc(c.poster, 10, 8)}
                    </Link>
                  ),
                },
                {
                  label: 'Arbiter',
                  value: (
                    <Link href={`/address/${c.arbiter}`} className="link">
                      {trunc(c.arbiter, 10, 8)}
                    </Link>
                  ),
                },
                {
                  label: 'Arbiter fee',
                  value: (
                    <>
                      {c.arbiter_fee_bps}{' '}
                      <span style={{ color: 'var(--color-subtle)' }}>
                        bps = {(c.arbiter_fee_bps / 100).toFixed(2)}%
                      </span>
                    </>
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
                      {fmtLgt(c.pool_nano)}{' '}
                      <span style={{ color: 'var(--color-subtle)' }}>AVOW</span>
                    </>
                  ),
                },
                {
                  label: 'Escrow remaining',
                  value: (
                    <>
                      {fmtLgt(c.escrow_remaining_nano)}{' '}
                      <span style={{ color: 'var(--color-subtle)' }}>AVOW</span>
                    </>
                  ),
                },
                {
                  label: 'Expiry DA height',
                  value: (
                    <span className="mono">
                      {c.expiry_da_height.toLocaleString()}
                    </span>
                  ),
                },
                {
                  label: 'Dispute window',
                  value: (
                    <>
                      {c.dispute_window_blocks}{' '}
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
        <Eyebrow>Criteria document</Eyebrow>
        <FrameCard padding={20} style={{ marginTop: 12 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              flexWrap: 'wrap',
            }}
          >
            <span
              className="h-mono"
              style={{
                fontSize: 13,
                color: 'var(--color-bone)',
                wordBreak: 'break-all',
              }}
            >
              {criteria || '—'}
            </span>
            {criteria ? <CopyButton value={criteria} compact /> : null}
          </div>
          <p
            style={{
              color: 'var(--color-subtle)',
              fontSize: 12,
              marginTop: 12,
              marginBottom: 0,
            }}
          >
            SHA-256 of the off-chain criteria document the deliverable is judged against.
          </p>
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
                    href={`/tx/${c.posted_at.tx_hash}`}
                    className="link h-mono"
                    title={c.posted_at.tx_hash}
                  >
                    {trunc(c.posted_at.tx_hash, 12, 10)}
                  </Link>
                ),
              },
              {
                label: 'Block',
                value: (
                  <Link
                    href={`/blocks/${c.posted_at.block_height}`}
                    className="link"
                  >
                    #{c.posted_at.block_height}
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
