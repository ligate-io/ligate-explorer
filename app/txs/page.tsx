import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllTxs } from '@/lib/api'
import type { TxType } from '@/lib/api-types'
import { TxsTable } from '@/components/tables'
import { Eyebrow, FrameCard } from '@/components/ui'
import { Pagination } from '@/components/pagination'

export const metadata: Metadata = { title: 'Transactions' }
export const dynamic = 'force-dynamic'

const PER_PAGE = 25
const TYPES: ('All' | TxType)[] = [
  'All',
  'SubmitAttestation',
  'RegisterSchema',
  'Transfer',
  'BondSequencer',
  'SubmitProof',
]

export default async function TxsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)
  const filter = (TYPES as string[]).includes(params.type ?? 'All')
    ? ((params.type ?? 'All') as 'All' | TxType)
    : 'All'

  const all = await getAllTxs()
  const filtered = filter === 'All' ? all : all.filter((t) => t.type === filter)
  const rows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const counts = {
    SubmitAttestation: all.filter((t) => t.type === 'SubmitAttestation').length,
    RegisterSchema: all.filter((t) => t.type === 'RegisterSchema').length,
    Transfer: all.filter((t) => t.type === 'Transfer').length,
    BondSequencer: all.filter((t) => t.type === 'BondSequencer').length,
    SubmitProof: all.filter((t) => t.type === 'SubmitProof').length,
  }
  const success = all.filter((t) => t.status === 'SUCCESS').length
  const reverted = all.filter((t) => t.status === 'REVERTED').length
  const pending = all.filter((t) => t.status === 'PENDING').length

  const stats = [
    { label: 'Total txs', value: all.length },
    { label: 'Success', value: success, color: 'var(--color-accent)' },
    { label: 'Reverted', value: reverted, color: 'var(--color-coral)' },
    { label: 'Pending', value: pending, color: 'var(--color-amber)' },
  ]

  const blocksHigh = Math.max(...all.map((t) => t.height))
  const blocksLow = Math.min(...all.map((t) => t.height))

  return (
    <>
      <div style={{ paddingTop: 16 }}>
        <Eyebrow>Transactions</Eyebrow>
        <h1
          className="serif"
          style={{
            marginTop: 24,
            fontSize: 72,
            lineHeight: 0.95,
            color: 'var(--color-ink)',
            maxWidth: '20ch',
            fontWeight: 400,
          }}
        >
          Every <em style={{ color: 'var(--color-accent)' }}>signed</em> action on chain.
        </h1>
        <p
          style={{
            color: 'var(--color-muted)',
            maxWidth: 540,
            marginTop: 16,
          }}
        >
          {all.length.toLocaleString()} transactions across{' '}
          {blocksHigh - blocksLow + 1} recent blocks. Filter by module, follow the
          lifecycle, click any hash to inspect.
        </p>
      </div>

      <div
        style={{
          marginTop: 40,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 0,
        }}
      >
        {stats.map((t, i) => (
          <FrameCard
            key={i}
            padding={20}
            style={{
              borderRight: i === stats.length - 1 ? '1px solid var(--color-line)' : 0,
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--color-subtle)',
                marginBottom: 10,
              }}
            >
              {t.label}
            </div>
            <div
              className="serif"
              style={{
                fontSize: 36,
                lineHeight: 1,
                color: t.color ?? 'var(--color-ink)',
              }}
            >
              {t.value}
            </div>
          </FrameCard>
        ))}
      </div>

      <div
        style={{
          marginTop: 40,
          display: 'flex',
          gap: 0,
          alignItems: 'center',
          flexWrap: 'wrap',
          borderBottom: '1px solid var(--color-line)',
        }}
      >
        {TYPES.map((t) => {
          const active = filter === t
          const count =
            t === 'All' ? all.length : counts[t as keyof typeof counts]
          const href = t === 'All' ? '/txs' : `/txs?type=${t}`
          return (
            <Link
              key={t}
              href={href}
              className="mono"
              style={{
                background: 'transparent',
                border: 0,
                borderBottom: active
                  ? '2px solid var(--color-accent)'
                  : '2px solid transparent',
                color: active ? 'var(--color-ink)' : 'var(--color-muted)',
                padding: '14px 20px',
                fontSize: 11,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                marginBottom: -1,
              }}
            >
              {t}{' '}
              <span style={{ color: 'var(--color-subtle)', marginLeft: 6 }}>
                {count}
              </span>
            </Link>
          )
        })}
      </div>

      <FrameCard padding={0} style={{ marginTop: 24 }}>
        <TxsTable rows={rows} />
      </FrameCard>

      <Pagination
        basePath="/txs"
        page={page}
        perPage={PER_PAGE}
        total={filtered.length}
        extraParams={{ type: filter !== 'All' ? filter : undefined }}
      />
    </>
  )
}
