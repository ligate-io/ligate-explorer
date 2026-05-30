import type { Metadata } from 'next'
import Link from 'next/link'
import { getBounties } from '@/lib/api'
import { ago, fmtLgt, trunc } from '@/lib/format'
import { ArrowRight } from '@/components/svgs'
import { Eyebrow, FrameCard } from '@/components/ui'

export const metadata: Metadata = { title: 'Bounties' }
export const dynamic = 'force-dynamic'

// Lifecycle-state → accent colour. `open` is live (accent); `exhausted`
// is mid-flight (amber); terminal states fade to subtle.
function bountyStatusColor(status: string): string {
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

export default async function BountiesPage() {
  const bounties = await getBounties()
  return (
    <>
      <div style={{ padding: '48px 0 32px' }}>
        <Eyebrow>Bounties</Eyebrow>
        <h1
          className="serif h-hero"
          style={{
            marginTop: 24,
            lineHeight: 1,
            color: 'var(--color-ink)',
            maxWidth: '20ch',
            fontWeight: 400,
          }}
        >
          Pay-per-<em style={{ color: 'var(--color-accent)' }}>attestation</em>, openly.
        </h1>
        <p style={{ color: 'var(--color-muted)', maxWidth: 540, marginTop: 20 }}>
          A bounty escrows AVOW against a board schema and pays out per accepted attestation that satisfies its acceptance predicate. Anyone whose attestation qualifies can claim, until the pool is exhausted.
        </p>
      </div>
      <FrameCard padding={0} scrollX>
        <table className="tbl">
          <thead>
            <tr>
              <th>Bounty</th>
              <th>Poster</th>
              <th>Pool</th>
              <th>Per claim</th>
              <th>Status</th>
              <th>Posted</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {bounties.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: '32px 22px',
                    textAlign: 'center',
                    color: 'var(--color-subtle)',
                  }}
                >
                  <span
                    className="mono"
                    style={{ fontSize: 11, letterSpacing: '0.18em' }}
                  >
                    No bounties posted yet
                  </span>
                </td>
              </tr>
            ) : (
              bounties.map((b) => {
                const tMs = Date.parse(b.posted_at.timestamp)
                return (
                  <tr key={b.id}>
                    <td>
                      <Link
                        href={`/bounty/${b.id}`}
                        className="h-mono"
                        title={b.id}
                      >
                        {trunc(b.id, 10, 6)}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/address/${b.poster}`} className="h-mono">
                        {trunc(b.poster, 6, 4)}
                      </Link>
                    </td>
                    <td>
                      <span className="mono">
                        {fmtLgt(b.pool_nano)}{' '}
                        <span style={{ color: 'var(--color-subtle)' }}>AVOW</span>
                      </span>
                    </td>
                    <td>
                      <span className="mono">
                        {fmtLgt(b.per_attestation_nano)}{' '}
                        <span style={{ color: 'var(--color-subtle)' }}>AVOW</span>
                      </span>
                    </td>
                    <td>
                      <span
                        className="mono"
                        style={{
                          color: bountyStatusColor(b.status),
                          textTransform: 'uppercase',
                          fontSize: 11,
                          letterSpacing: '0.1em',
                        }}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td>
                      <Link
                        href={`/blocks/${b.posted_at.block_height}`}
                        className="mono"
                        style={{ color: 'var(--color-muted)' }}
                      >
                        #{b.posted_at.block_height}
                      </Link>{' '}
                      <span
                        className="mono"
                        style={{ color: 'var(--color-subtle)' }}
                        suppressHydrationWarning
                      >
                        {Number.isFinite(tMs)
                          ? ago(Math.floor((Date.now() - tMs) / 1000))
                          : ''}
                      </span>
                    </td>
                    <td style={{ width: 24, textAlign: 'right' }}>
                      <span className="row-arrow">
                        <ArrowRight />
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </FrameCard>
    </>
  )
}
