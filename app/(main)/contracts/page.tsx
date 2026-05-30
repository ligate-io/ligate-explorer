import type { Metadata } from 'next'
import Link from 'next/link'
import { getContracts } from '@/lib/api'
import { ago, fmtLgt, trunc } from '@/lib/format'
import { ArrowRight } from '@/components/svgs'
import { Eyebrow, FrameCard } from '@/components/ui'

export const metadata: Metadata = { title: 'Contracts' }
export const dynamic = 'force-dynamic'

// Lifecycle-state → accent colour. `open` is the live/actionable state
// (accent); mid-flight states (committed/delivered/disputed) are amber;
// terminal states (accepted/rejected/cancelled/expired) fade to subtle.
function contractStatusColor(status: string): string {
  switch (status) {
    case 'open':
      return 'var(--color-accent)'
    case 'committed':
    case 'delivered':
    case 'disputed':
      return 'var(--color-amber)'
    case 'accepted':
      return 'var(--color-accent)'
    case 'rejected':
    case 'cancelled':
    case 'expired':
      return 'var(--color-subtle)'
    default:
      return 'var(--color-muted)'
  }
}

export default async function ContractsPage() {
  const contracts = await getContracts()
  return (
    <>
      <div style={{ padding: '48px 0 32px' }}>
        <Eyebrow>Contracts</Eyebrow>
        <h1
          className="serif h-hero"
          style={{
            marginTop: 24,
            lineHeight: 1,
            color: 'var(--color-ink)',
            maxWidth: '18ch',
            fontWeight: 400,
          }}
        >
          Escrowed <em style={{ color: 'var(--color-accent)' }}>work</em>, on chain.
        </h1>
        <p style={{ color: 'var(--color-muted)', maxWidth: 540, marginTop: 20 }}>
          A contract escrows AVOW against an off-chain criteria document with a named arbiter to resolve disputes. The poster funds the pool; a worker commits, delivers, and is paid on acceptance.
        </p>
      </div>
      <FrameCard padding={0} scrollX>
        <table className="tbl">
          <thead>
            <tr>
              <th>Contract</th>
              <th>Poster</th>
              <th>Pool</th>
              <th>Status</th>
              <th>Posted</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {contracts.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
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
                    No contracts posted yet
                  </span>
                </td>
              </tr>
            ) : (
              contracts.map((c) => {
                const tMs = Date.parse(c.posted_at.timestamp)
                return (
                  <tr key={c.id}>
                    <td>
                      <Link
                        href={`/contract/${c.id}`}
                        className="h-mono"
                        title={c.id}
                      >
                        {trunc(c.id, 10, 6)}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/address/${c.poster}`} className="h-mono">
                        {trunc(c.poster, 6, 4)}
                      </Link>
                    </td>
                    <td>
                      <span className="mono">
                        {fmtLgt(c.pool_nano)}{' '}
                        <span style={{ color: 'var(--color-subtle)' }}>AVOW</span>
                      </span>
                    </td>
                    <td>
                      <span
                        className="mono"
                        style={{
                          color: contractStatusColor(c.status),
                          textTransform: 'uppercase',
                          fontSize: 11,
                          letterSpacing: '0.1em',
                        }}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td>
                      <Link
                        href={`/blocks/${c.posted_at.block_height}`}
                        className="mono"
                        style={{ color: 'var(--color-muted)' }}
                      >
                        #{c.posted_at.block_height}
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
