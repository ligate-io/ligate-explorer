import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getBlock, getInfo, getTxsForBlock } from '@/lib/api'
import { ago, fmtLgt, isoDate, trunc } from '@/lib/format'
import { CopyButton } from '@/components/copy-button'
import { TxsTable } from '@/components/tables'
import { Eyebrow, FrameCard, LV } from '@/components/ui'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ height: string }>
}): Promise<Metadata> {
  const { height } = await params
  return { title: `Block #${height}` }
}

export default async function BlockPage({
  params,
}: {
  params: Promise<{ height: string }>
}) {
  const { height: heightStr } = await params
  const height = parseInt(heightStr, 10)
  if (!Number.isFinite(height)) notFound()

  // Cross-fetch info so we know the chain head — used to disable the
  // "next →" button when we're already at the latest block. Both
  // calls are in flight together; getInfo is cached for 5s api-side
  // so cost is near-zero on cache hit.
  const [block, blockTxs, info] = await Promise.all([
    getBlock(height),
    getTxsForBlock(height),
    getInfo().catch(() => null),
  ])
  if (!block) notFound()
  const latestHeight = info?.latest_block ?? height
  const atGenesis = height <= 1
  const atHead = height >= latestHeight

  // Slot-level fees aren't on the wire (the api adapter ships "0").
  // Sum gas + protocol across the block's txs to get an honest total.
  // ligate-api PR #43 brief explicitly calls this out: "The '0 AVOW'
  // the explorer currently shows on attestation blocks is wrong —
  // it'll be 0.05–0.10 AVOW once you sum both."
  let feesTotal = 0n
  for (const t of blockTxs) {
    if (t.fee_nano) feesTotal += BigInt(t.fee_nano)
    if (t.protocol_fee_nano) feesTotal += BigInt(t.protocol_fee_nano)
  }

  // Latency from slot timestamp to indexer-observed finalized_at.
  // PR #44 surfaces both as ms; subtract once and let `finalityLag`
  // drive the small "Ns after proposal" suffix on the row.
  const finalityLagSec =
    block.finalized_at_ms != null && block.finalized_at_ms > block.timestamp
      ? Math.round((block.finalized_at_ms - block.timestamp) / 1000)
      : null

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/blocks"
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-subtle)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          ← Blocks
        </Link>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <Eyebrow>Block</Eyebrow>
        <FinalityBadge status={block.finality_status} />
      </div>

      <div
        style={{
          marginTop: 4,
          display: 'flex',
          alignItems: 'baseline',
          gap: 24,
          flexWrap: 'wrap',
        }}
      >
        <h1
          className="serif h-detail-xl"
          style={{
            lineHeight: 0.9,
            color: 'var(--color-ink)',
            margin: 0,
            fontWeight: 400,
          }}
        >
          <span style={{ color: 'var(--color-subtle)' }}>#</span>
          {block.height}
        </h1>
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginLeft: 'auto',
            alignItems: 'center',
          }}
        >
          {atGenesis ? (
            <span
              className="btn"
              aria-disabled="true"
              title="No earlier block"
              style={{
                opacity: 0.4,
                pointerEvents: 'none',
                cursor: 'not-allowed',
              }}
            >
              ← prev
            </span>
          ) : (
            <Link href={`/blocks/${block.height - 1}`} className="btn">
              ← prev
            </Link>
          )}
          {atHead ? (
            <span
              className="btn"
              aria-disabled="true"
              title="Already at chain head"
              style={{
                opacity: 0.4,
                pointerEvents: 'none',
                cursor: 'not-allowed',
              }}
            >
              next →
            </span>
          ) : (
            <Link href={`/blocks/${block.height + 1}`} className="btn">
              next →
            </Link>
          )}
        </div>
      </div>

      <div
        className="detail-grid-2"
        style={{
          marginTop: 32,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 40,
        }}
      >
        <div>
          <Eyebrow>Identity</Eyebrow>
          <div style={{ marginTop: 12 }}>
            <LV
              rows={[
                {
                  label: 'Hash',
                  value: (
                    <>
                      <span className="h-mono">
                        {trunc(block.hash, 14, 12)}
                      </span>
                      <CopyButton value={block.hash} />
                    </>
                  ),
                },
                {
                  label: 'Prev hash',
                  value: block.prev_hash ? (
                    <>
                      <Link
                        // The explorer routes blocks by height, not
                        // hash, but the prev hash is what's on chain.
                        // Linking to the height directly is the
                        // cheapest correct thing — no extra resolve
                        // round-trip — and the user gets the prev
                        // block in one click.
                        href={`/blocks/${block.height - 1}`}
                        className="h-mono link"
                        title={block.prev_hash}
                      >
                        {trunc(block.prev_hash, 14, 12)}
                      </Link>
                      <CopyButton value={block.prev_hash} />
                    </>
                  ) : (
                    <span style={{ color: 'var(--color-subtle)' }}>—</span>
                  ),
                },
                {
                  label: 'Time',
                  value: (
                    <>
                      {ago(Math.floor((Date.now() - block.timestamp) / 1000))}{' '}
                      <span style={{ color: 'var(--color-subtle)', marginLeft: 12 }}>
                        {isoDate(block.timestamp)}
                      </span>
                    </>
                  ),
                },
                ...(block.finalized_at_ms != null
                  ? [
                      {
                        label: 'Finalized',
                        value: (
                          <>
                            {isoDate(block.finalized_at_ms)}
                            {finalityLagSec != null ? (
                              <span
                                style={{
                                  color: 'var(--color-subtle)',
                                  marginLeft: 12,
                                }}
                              >
                                ({formatLag(finalityLagSec)} after proposal)
                              </span>
                            ) : null}
                          </>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </div>
        </div>
        <div>
          <Eyebrow>Production</Eyebrow>
          <div style={{ marginTop: 12 }}>
            <LV
              rows={[
                {
                  label: 'Proposer',
                  value: block.proposer ? (
                    <>
                      <span
                        className="h-mono"
                        title={block.proposer}
                        style={{ color: 'var(--color-bone)' }}
                      >
                        {trunc(block.proposer, 14, 6)}
                      </span>
                      <CopyButton value={block.proposer} />
                      <span
                        className="mono"
                        style={{
                          fontSize: 9,
                          letterSpacing: '0.18em',
                          textTransform: 'uppercase',
                          color: 'var(--color-subtle)',
                          marginLeft: 8,
                        }}
                        title="Celestia DA wallet that submitted this slot's first batch."
                      >
                        celestia DA
                      </span>
                    </>
                  ) : (
                    <span style={{ color: 'var(--color-subtle)' }}>—</span>
                  ),
                },
                // DA block height + deep-link to Celenium. Only rendered when
                // the api surfaces a height — slots ingested before chain
                // v0.2.3 + ligate-api PR #63 don't have it. The link points
                // at Celenium's Mocha testnet UI (`mocha.celenium.io`); when
                // we move to Celestia mainnet this becomes `celenium.io`.
                ...(block.da_block_height != null
                  ? [
                      {
                        label: 'DA block',
                        value: (
                          <>
                            <a
                              // Celenium routes block detail under `/block/{height}` (singular).
                              // The list page is `/blocks` (plural), which is the easy footgun:
                              // `/blocks/{height}` 404s. Keep this singular.
                              href={`https://mocha.celenium.io/block/${block.da_block_height}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="h-mono link"
                              title={`View Celestia mocha-4 block ${block.da_block_height} on Celenium`}
                            >
                              {block.da_block_height.toLocaleString()}
                            </a>
                            <span
                              className="mono"
                              style={{
                                fontSize: 9,
                                letterSpacing: '0.18em',
                                textTransform: 'uppercase',
                                color: 'var(--color-subtle)',
                                marginLeft: 8,
                              }}
                              title="Celestia mocha-4 block height where this slot's first batch's blob was included. Click to view on Celenium."
                            >
                              view on celenium ↗
                            </span>
                          </>
                        ),
                      },
                    ]
                  : []),
                { label: 'Tx count', value: block.tx_count },
                {
                  label: 'Fees total',
                  value:
                    feesTotal > 0n ? (
                      <>
                        {fmtLgt(feesTotal.toString())}{' '}
                        <span style={{ color: 'var(--color-subtle)' }}>AVOW</span>
                      </>
                    ) : (
                      <>
                        0 <span style={{ color: 'var(--color-subtle)' }}>AVOW</span>
                      </>
                    ),
                },
              ]}
            />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 56 }}>
        <Eyebrow>Transactions in this block</Eyebrow>
        <FrameCard padding={0} style={{ marginTop: 12 }} scrollX>
          {blockTxs.length ? (
            <TxsTable rows={blockTxs} showBlock={false} />
          ) : (
            <div
              style={{ padding: 40, textAlign: 'center', color: 'var(--color-muted)' }}
            >
              <span className="mono" style={{ fontSize: 11, letterSpacing: '0.18em' }}>
                NO TRANSACTIONS IN THIS BLOCK
              </span>
            </div>
          )}
        </FrameCard>
      </div>
    </>
  )
}

// Maps the optional finality_status field to a small chip. Renders
// nothing when the field is absent (legacy rows pre PR #44) so the
// header layout doesn't reserve dead space for blocks we have no
// settlement signal on.
function FinalityBadge({ status }: { status?: string }) {
  if (!status) return null
  const finalized = status === 'finalized'
  const pending = status === 'pending'
  const color = finalized
    ? 'var(--color-accent)'
    : pending
      ? 'var(--color-amber)'
      : 'var(--color-subtle)'
  return (
    <span
      className="mono"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        border: `1px solid ${color}`,
        color,
        fontSize: 10,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
      }}
      title={
        finalized
          ? 'DA layer has settled this slot.'
          : pending
            ? 'Slot landed on chain but DA hasn’t observed finality yet.'
            : `Status: ${status}`
      }
    >
      {pending ? <PendingDot color={color} /> : <CheckDot color={color} />}
      {finalized ? 'finalized' : pending ? 'pending DA' : status}
    </span>
  )
}

function PendingDot({ color }: { color: string }) {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden>
      <circle cx="4" cy="4" r="3" stroke={color} strokeWidth="1" fill="none">
        <animate
          attributeName="opacity"
          values="0.4;1;0.4"
          dur="1.4s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  )
}

function CheckDot({ color }: { color: string }) {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden>
      <path
        d="M1.5 4 L3.3 5.8 L6.5 2.2"
        stroke={color}
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )
}

function formatLag(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s === 0 ? `${m}m` : `${m}m ${s}s`
}
