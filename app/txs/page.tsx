import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllTxs, getTxsPage } from '@/lib/api'
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
  'RegisterAttestorSet',
  'Transfer',
  'BondSequencer',
  'SubmitProof',
]

/**
 * Map PascalCase `TxType` (URL surface) to the wire snake_case `kind`
 * that ligate-api accepts on the `?kind=` query param. Kept narrow:
 * unknown filter values fall through to `null` (no filter) rather
 * than 400ing the api with garbage.
 */
function pascalToWireKind(t: 'All' | TxType): string | null {
  switch (t) {
    case 'All':
      return null
    case 'SubmitAttestation':
      return 'submit_attestation'
    case 'RegisterSchema':
      return 'register_schema'
    case 'Transfer':
      return 'transfer'
    case 'RegisterAttestorSet':
      return 'register_attestor_set'
    case 'BondSequencer':
      return 'bond_sequencer'
    case 'SubmitProof':
      return 'submit_proof'
  }
}

export default async function TxsPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string; type?: string }>
}) {
  const params = await searchParams
  const cursor = params.cursor
  const filter = (TYPES as string[]).includes(params.type ?? 'All')
    ? ((params.type ?? 'All') as 'All' | TxType)
    : 'All'

  // 100-tx snapshot for header stats + filter counts. Paged drill-down
  // table is its own cursor-aware fetch.
  const [all, pageResult] = await Promise.all([
    getAllTxs(),
    getTxsPage(cursor, PER_PAGE, pascalToWireKind(filter)),
  ])
  // Server filters on `?kind=` now (ligate-api PR #43). Unknown kinds
  // come back as zero rows rather than 400, which is what we want.
  // Trust the page result directly; no client-side fallback filter.
  const rows = pageResult.items

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

  // Empty-state guard: Math.max(...[]) returns -Infinity, Math.min(...[])
  // returns +Infinity. If /v1/txs returns zero rows (early bootstrap,
  // api failure, freshly genesized chain) the original code would
  // render "-Infinity recent blocks" in the hero copy below. Guard so
  // the page renders sensibly when the sample is empty.
  const blockSpan =
    all.length > 0
      ? Math.max(...all.map((t) => t.height)) -
        Math.min(...all.map((t) => t.height)) +
        1
      : 0

  return (
    <>
      <div style={{ paddingTop: 16 }}>
        <Eyebrow>Transactions</Eyebrow>
        <h1
          className="serif h-hero"
          style={{
            marginTop: 24,
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
          {blockSpan} recent blocks. Filter by module, follow the
          lifecycle, click any hash to inspect.
        </p>
      </div>

      <div
        className="grid-stats-4"
        style={{ marginTop: 40, gap: 0 }}
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

      <FrameCard padding={0} style={{ marginTop: 24 }} scrollX>
        {rows.length === 0 && filter !== 'All' ? (
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
              No {filter} transactions yet
            </span>
          </div>
        ) : (
          <TxsTable rows={rows} />
        )}
      </FrameCard>

      <Pagination
        basePath="/txs"
        cursor={cursor}
        nextCursor={pageResult.nextCursor}
        itemsOnPage={rows.length}
        extraParams={{ type: filter !== 'All' ? filter : undefined }}
      />
    </>
  )
}
