import type { Metadata } from 'next'
import Link from 'next/link'
import { getAddress, getAddressTxs, getStatsTotals } from '@/lib/api'
import { buildAddressLabels } from '@/lib/address-labels'
import { fmtLgt, trunc } from '@/lib/format'
import { AddressBadge } from '@/components/address-badge'
import { AddressQr } from '@/components/address-qr'
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
  // Summary + recent-tx page in parallel. The recent-tx endpoint was
  // missing entirely until ligate-api PR #52 — pages used to render
  // an empty "Recent transactions" placeholder. Now: real history,
  // server-paginated, same envelope as /v1/txs so the existing
  // TxsTable adapter just works.
  const [a, txsPage, totals] = await Promise.all([
    getAddress(addr),
    getAddressTxs(addr, undefined, 20),
    getStatsTotals().catch(() => null),
  ])
  const recentTxs = txsPage.items
  // Address label map — surfaces "TREASURY · FAUCET" badge next to
  // the treasury wallet in the recent-txs table. Catch-to-null on
  // totals so a transient stats failure doesn't break the page,
  // just suppresses badges.
  const labels = buildAddressLabels({
    treasuryAddress: totals?.treasury_address,
  })
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
      {/* Headline row: QR + address column. QR sits on the left so
          phones scanning the page can grab the address visually
          without parsing the bech32 string. Address + copy + badges
          column flexes around it. */}
      <div
        style={{
          marginTop: 20,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 20,
          flexWrap: 'wrap',
        }}
      >
        <AddressQr value={addr} size={108} />
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div
            style={{
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
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <AddressBadge addr={addr} labels={labels} />
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
        </div>
      </div>

      <div
        className={role ? 'grid-stats-4' : 'grid-stats-3'}
        style={{ marginTop: 32, gap: 0 }}
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
            LGT balance
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
        <FrameCard padding={0} style={{ marginTop: 12 }} scrollX>
          {recentTxs.length === 0 ? (
            <div
              style={{
                padding: '48px 22px',
                textAlign: 'center',
                color: 'var(--color-subtle)',
              }}
            >
              <span
                className="mono"
                style={{ fontSize: 11, letterSpacing: '0.18em' }}
              >
                No transactions yet for this address
              </span>
            </div>
          ) : (
            <TxsTable
              rows={recentTxs}
              labels={labels}
              suppressLabelFor={addr}
            />
          )}
        </FrameCard>
      </div>
    </>
  )
}
