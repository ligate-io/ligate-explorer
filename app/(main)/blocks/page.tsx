import type { Metadata } from 'next'
import {
  getAllBlocks,
  getAllTxs,
  getBlocksPage,
  getStatsTotals,
} from '@/lib/api'
import { fmtLgtTrim } from '@/lib/format'
import { BlocksTable } from '@/components/tables'
import { LiveBlocksTopStats } from '@/components/live-cards'
import { BlockSpark } from '@/components/svgs'
import { Eyebrow, FrameCard } from '@/components/ui'
import { Pagination } from '@/components/pagination'

export const metadata: Metadata = { title: 'Blocks' }
export const dynamic = 'force-dynamic'

const PER_PAGE = 25

export default async function BlocksPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>
}) {
  const params = await searchParams
  const cursor = params.cursor

  // Four reads:
  //   - all blocks (100-row sample): sparkline + avg txs / block
  //   - all txs   (100-row sample): real fees (gas + protocol burn)
  //   - stats totals: chain-wide block count (not the sample size)
  //   - blocks page: cursor-paginated table body
  // The Block adapter ships `fees_total_nano: "0"` because the slot
  // wire shape doesn't carry it; summing from the tx sample is the
  // honest way to get an actual fee figure here without a per-block
  // N+1 fan-out.
  const [all, allTxs, totals, pageResult] = await Promise.all([
    getAllBlocks(),
    getAllTxs(),
    getStatsTotals().catch(() => null),
    getBlocksPage(cursor, PER_PAGE),
  ])
  const totalTxs = all.reduce((acc, b) => acc + b.tx_count, 0)
  const avgTxs = all.length > 0 ? (totalTxs / all.length).toFixed(2) : '0.00'
  // Real fees = gas paid (currently 0 — indexer doesn't surface
  // fee_paid_nano yet) + protocol burn (real numbers, e.g. 0.10 AVOW
  // per RegisterSchema, 0.0001 AVOW per SubmitAttestation). Summing
  // both matches what the block-detail page shows in its Fees total
  // row, and lines up with the brief: "Block detail FEES TOTAL: sum
  // fee_paid_nano + protocol_fee_nano".
  let totalFees = 0n
  for (const t of allTxs) {
    if (t.fee_nano) totalFees += BigInt(t.fee_nano)
    if (t.protocol_fee_nano) totalFees += BigInt(t.protocol_fee_nano)
  }
  // Chain-wide indexed-blocks count. /v1/stats/totals.blocks is the
  // canonical source; falls back to the latest block height (a tight
  // upper bound) if the stats endpoint fails.
  const indexedBlocks = totals?.blocks ?? all[0]?.height ?? 0

  const rows = pageResult.items

  // Empty-state guard: if /v1/blocks returns zero rows (chain freshly
  // genesized, indexer behind, transient api failure), `all[0]` is
  // undefined. Fall through to 0; the LiveBlocksTopStats wrapper will
  // overwrite both numbers on its first poll anyway.
  const initialLatestBlock = all[0]?.height ?? 0

  // First two stat cards (Latest block + Indexed blocks) are now
  // rendered by <LiveBlocksTopStats> so they advance every 6s without
  // a page reload. The remaining two are 100-block / 100-tx aggregates
  // that drift slowly with chain activity, so they stay static here.
  const stats = [
    { label: 'Avg txs / block', value: avgTxs, serif: true },
    {
      label: 'Fees collected',
      value: fmtLgtTrim(totalFees.toString()),
      serif: true,
      suffix: 'AVOW',
      sub: `Σ gas + protocol · ${allTxs.length} tx${allTxs.length === 1 ? '' : 's'} sample`,
    },
  ]

  return (
    <>
      <div style={{ paddingTop: 16 }}>
        <Eyebrow>Blocks</Eyebrow>
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
          The <em style={{ color: 'var(--color-accent)' }}>tape</em>, head to tail.
        </h1>
        <p
          style={{
            color: 'var(--color-muted)',
            maxWidth: 540,
            marginTop: 16,
          }}
        >
          {all.length} blocks indexed. Every row is a sealed slot of attestations and transfers, newest first.
        </p>
      </div>

      <div
        className="grid-stats-4"
        style={{ marginTop: 40, gap: 0 }}
      >
        {/* Two live cards on the left (Latest block + Indexed blocks)
            self-polling on a 6s cadence. The two static cards below
            cover the per-100 aggregates that don't tick on every new
            slot. */}
        <LiveBlocksTopStats
          initial={{
            latestBlock: initialLatestBlock,
            indexedBlocks,
          }}
        />
        {stats.map((t, i) => {
          const hasSub = 'sub' in t && t.sub
          return (
            <FrameCard
              key={i}
              padding={20}
              style={{
                borderRight:
                  i === stats.length - 1 ? '1px solid var(--color-line)' : 0,
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
                  color: 'var(--color-ink)',
                }}
              >
                {t.value}
                {'suffix' in t && t.suffix ? (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 14,
                      color: 'var(--color-subtle)',
                      marginLeft: 8,
                    }}
                  >
                    {t.suffix}
                  </span>
                ) : null}
              </div>
              {hasSub ? (
                <div
                  className="mono"
                  style={{
                    marginTop: 10,
                    fontSize: 9,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: 'var(--color-subtle)',
                  }}
                  title="Sum of gas + protocol fees across the last 100 indexed transactions. Slot-level fees aren't on the wire today, so this is the closest honest figure without an N+1 fan-out across every block."
                >
                  {t.sub}
                </div>
              ) : null}
            </FrameCard>
          )
        })}
      </div>

      <div style={{ marginTop: 32, marginBottom: 8 }}>
        <div
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-subtle)',
            marginBottom: 8,
          }}
        >
          tx density · {all.length} blocks
        </div>
        <BlockSpark blocks={all.map((b) => ({ tx_count: b.tx_count }))} />
      </div>

      <FrameCard padding={0} style={{ marginTop: 24 }} scrollX>
        <BlocksTable rows={rows} />
      </FrameCard>

      <Pagination
        basePath="/blocks"
        cursor={cursor}
        nextCursor={pageResult.nextCursor}
        itemsOnPage={rows.length}
      />
    </>
  )
}
