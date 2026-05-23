import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllTxs, getStatsTotals, getTxsPage } from '@/lib/api'
import { buildAddressLabels } from '@/lib/address-labels'
import type { Tx, TxStatus, TxType } from '@/lib/api-types'
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
// Status filter UI labels. Distinct from `TxStatus` (SUCCESS/REVERTED/
// PENDING) so the URL surface stays human-readable (`?status=Success`)
// while the underlying enum stays uppercase. STATUS_MAP translates one
// to the other; `null` for the All bucket means "don't filter".
type StatusLabel = 'All' | 'Success' | 'Reverted' | 'Pending'
const STATUSES: StatusLabel[] = ['All', 'Success', 'Reverted', 'Pending']
const STATUS_MAP: Record<StatusLabel, TxStatus | null> = {
  All: null,
  Success: 'SUCCESS',
  Reverted: 'REVERTED',
  Pending: 'PENDING',
}

/**
 * Build a `/txs[?kind][&status]` href, omitting empty params. Used by
 * both the kind tab row and the status tab row so each tab preserves
 * the other dimension's current selection when clicked.
 */
function buildTxsHref(kind: 'All' | TxType, status: StatusLabel): string {
  const sp = new URLSearchParams()
  if (kind !== 'All') sp.set('type', kind)
  if (status !== 'All') sp.set('status', status)
  const qs = sp.toString()
  return qs ? `/txs?${qs}` : '/txs'
}

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
  searchParams: Promise<{ cursor?: string; type?: string; status?: string }>
}) {
  const params = await searchParams
  const cursor = params.cursor
  const filter = (TYPES as string[]).includes(params.type ?? 'All')
    ? ((params.type ?? 'All') as 'All' | TxType)
    : 'All'
  const statusFilter: StatusLabel = (STATUSES as string[]).includes(
    params.status ?? 'All',
  )
    ? ((params.status ?? 'All') as StatusLabel)
    : 'All'
  const targetStatus = STATUS_MAP[statusFilter]

  // 100-tx snapshot for header stats + filter counts. Paged drill-down
  // table is its own cursor-aware fetch. `totals` powers the address
  // label map (treasury / faucet badges next to sender addresses);
  // it's catch-to-null so a totals 5xx doesn't take the whole list
  // down — labels just degrade to no-badge.
  const [all, pageResult, totals] = await Promise.all([
    getAllTxs(),
    getTxsPage(cursor, PER_PAGE, pascalToWireKind(filter)),
    getStatsTotals().catch(() => null),
  ])
  const labels = buildAddressLabels({
    treasuryAddress: totals?.treasury_address,
  })
  // Server filters on `?kind=` now (ligate-api PR #43). Unknown kinds
  // come back as zero rows rather than 400. The api does NOT filter on
  // outcome / status though (the `outcome=…` param is silently ignored),
  // so the status filter has to be applied client-side. When it's
  // active we drop the server-paginated `pageResult.items` in favour
  // of the 100-tx `all` sample, filtered both ways. Pagination hides
  // in that mode (the full filtered set is shown in one go; devnet
  // tx volume is well under the sample size).
  const matchesKind = (t: Tx) => filter === 'All' || t.type === filter
  const matchesStatus = (t: Tx) =>
    targetStatus === null || t.status === targetStatus
  const rows =
    targetStatus === null
      ? pageResult.items
      : all.filter(matchesKind).filter(matchesStatus)
  const paginationVisible = targetStatus === null

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
          {blockSpan} recent blocks. Filter by kind, follow the
          lifecycle, click any hash to read the full payload.
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

      {/* Status filter row. Sits ABOVE the kind tab row because status
          is the coarser axis (any kind can be Success / Reverted /
          Pending). Counts here are the global per-status totals from
          the 100-tx sample; they don't recompute against the current
          kind filter, so they stay stable as the user clicks across
          kinds (gives a sense of base rate). */}
      <div
        style={{
          marginTop: 40,
          display: 'flex',
          gap: 0,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {STATUSES.map((s) => {
          const active = statusFilter === s
          const count =
            s === 'All'
              ? all.length
              : s === 'Success'
                ? success
                : s === 'Reverted'
                  ? reverted
                  : pending
          const dotColor =
            s === 'Success'
              ? 'var(--color-accent)'
              : s === 'Reverted'
                ? 'var(--color-coral)'
                : s === 'Pending'
                  ? 'var(--color-amber)'
                  : 'var(--color-subtle)'
          return (
            <Link
              key={s}
              href={buildTxsHref(filter, s)}
              className="mono"
              style={{
                background: 'transparent',
                border: 0,
                borderBottom: active
                  ? '2px solid var(--color-accent)'
                  : '2px solid transparent',
                color: active ? 'var(--color-ink)' : 'var(--color-muted)',
                padding: '14px 18px',
                fontSize: 11,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                marginBottom: -1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {s !== 'All' ? (
                <span
                  aria-hidden
                  style={{
                    display: 'inline-block',
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: dotColor,
                  }}
                />
              ) : null}
              {s}{' '}
              <span style={{ color: 'var(--color-subtle)' }}>{count}</span>
            </Link>
          )
        })}
      </div>

      <div
        style={{
          marginTop: 0,
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
          const href = buildTxsHref(t, statusFilter)
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
        {rows.length === 0 && (filter !== 'All' || statusFilter !== 'All') ? (
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
              No{' '}
              {[
                statusFilter !== 'All' ? statusFilter.toLowerCase() : null,
                filter !== 'All' ? filter : null,
              ]
                .filter(Boolean)
                .join(' ')}{' '}
              transactions yet
            </span>
          </div>
        ) : (
          <TxsTable rows={rows} labels={labels} />
        )}
      </FrameCard>

      {/* Pagination only shows when status filter is inactive. The
          status-filtered view is sourced from the 100-tx `all` sample
          and rendered in one go, so cursor pagination isn't meaningful
          there (and the api doesn't filter on outcome anyway). */}
      {paginationVisible ? (
        <Pagination
          basePath="/txs"
          cursor={cursor}
          nextCursor={pageResult.nextCursor}
          itemsOnPage={rows.length}
          extraParams={{
            type: filter !== 'All' ? filter : undefined,
          }}
        />
      ) : (
        <div
          className="mono"
          style={{
            marginTop: 24,
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--color-subtle)',
          }}
        >
          Showing {rows.length} {rows.length === 1 ? 'item' : 'items'}
        </div>
      )}
    </>
  )
}
