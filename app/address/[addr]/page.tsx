import type { Metadata } from 'next'
import Link from 'next/link'
import { getAddress } from '@/lib/api'
import { fmtLgt, trunc } from '@/lib/format'
import { CopyButton } from '@/components/copy-button'
import { TxsTable } from '@/components/tables'
import { Eyebrow, FrameCard } from '@/components/ui'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ addr: string }>
}): Promise<Metadata> {
  const { addr } = await params
  return { title: `Address ${trunc(addr, 6, 4)}` }
}

export default async function AddressPage({
  params,
}: {
  params: Promise<{ addr: string }>
}) {
  const { addr } = await params
  const a = await getAddress(addr)
  const role = a.role
  const balanceParts = fmtLgt(a.balance_nano).split('.')

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
      <Eyebrow>Address</Eyebrow>
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
            fontSize: 20,
            color: 'var(--color-ink)',
            wordBreak: 'break-all',
          }}
        >
          {addr}
        </div>
        <CopyButton value={addr} />
        {role ? (
          <span
            className="role-chip"
            style={{
              borderColor: 'var(--color-accent)',
              color: 'var(--color-accent)',
              fontSize: 10,
              padding: '4px 8px',
            }}
          >
            {role}
          </span>
        ) : null}
      </div>

      <div
        style={{
          marginTop: 32,
          display: 'grid',
          gridTemplateColumns: role ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)',
          gap: 0,
        }}
      >
        <FrameCard padding={24} style={{ borderRight: 0 }}>
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
            $LGT balance
          </div>
          <div
            className="serif"
            style={{ fontSize: 36, lineHeight: 1, color: 'var(--color-ink)' }}
          >
            {balanceParts[0]}
            <span style={{ color: 'var(--color-subtle)', fontSize: 28 }}>
              .{balanceParts[1]}
            </span>
          </div>
          <div
            className="mono"
            style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 8 }}
          >
            {a.balance_nano} nano
          </div>
        </FrameCard>
        <FrameCard padding={24} style={{ borderRight: 0 }}>
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
            Total tx count
          </div>
          <div
            className="serif"
            style={{ fontSize: 36, lineHeight: 1, color: 'var(--color-ink)' }}
          >
            {a.tx_count}
          </div>
          <div
            className="mono"
            style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 8 }}
          >
            across {a.tx_count > 50 ? 'many' : 'few'} blocks
          </div>
        </FrameCard>
        <FrameCard
          padding={24}
          style={{ borderRight: role ? 0 : '1px solid var(--color-line)' }}
        >
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
            First seen
          </div>
          <div
            className="serif"
            style={{ fontSize: 36, lineHeight: 1, color: 'var(--color-ink)' }}
          >
            #{a.first_seen_height}
          </div>
          <div
            className="mono"
            style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 8 }}
          >
            {a.first_seen_at}
          </div>
        </FrameCard>
        {role ? (
          <FrameCard padding={24}>
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--color-accent)',
                marginBottom: 12,
              }}
            >
              {role} bond
            </div>
            <div
              className="serif"
              style={{ fontSize: 36, lineHeight: 1, color: 'var(--color-ink)' }}
            >
              {fmtLgt(
                a.sequencer_bond ?? a.attester_bond ?? a.prover_bond ?? '0'
              ).split('.')[0]}
              <span style={{ color: 'var(--color-subtle)', fontSize: 22 }}>
                {' '}
                LGT
              </span>
            </div>
            <div
              className="mono"
              style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 8 }}
            >
              locked, can be slashed
            </div>
          </FrameCard>
        ) : null}
      </div>

      <div style={{ marginTop: 56 }}>
        <Eyebrow>Recent transactions</Eyebrow>
        <FrameCard padding={0} style={{ marginTop: 12 }}>
          <TxsTable rows={a.recent_txs} />
        </FrameCard>
      </div>
    </>
  )
}
