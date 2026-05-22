'use client'

// Live-polling client wrappers for the homepage cards.
//
// Each card takes its server-rendered `initial` data as a prop (so
// first paint is fully populated — no skeleton flicker), then polls
// its own endpoint on a 6s cadence via useLivePoll. The hook pauses
// on hidden tabs and only re-renders the card whose data changed,
// so the rest of the page stays mounted across updates.
//
// Replaces the old `<AutoRefresh>` pattern that did `router.refresh()`
// every 6s — that re-ran the entire RSC tree and caused the "whole
// page repaints on new block" flash the user kept hitting.

import Link from 'next/link'
import { useState } from 'react'
import type {
  AttestationItem,
  Block,
  ChainInfo,
  Schema,
  Tx,
} from '@/lib/api-types'
import {
  fetchAttestationsFromBrowser,
  fetchInfoFromBrowser,
  fetchLatestBlocksFromBrowser,
  fetchLatestTxsFromBrowser,
  fetchSchemasFromBrowser,
  fetchStripInfoFromBrowser,
} from '@/lib/api-browser'
import { ago, isoDate, trunc } from '@/lib/format'
import { useLivePoll } from '@/lib/use-live-poll'
import { StatsStrip } from './dashboard'
import { ArrowRight } from './svgs'
import { BlocksTable, TxsTable } from './tables'
import { Eyebrow, FrameCard } from './ui'

const POLL_MS = 6000

// ---------------------------------------------------------------------
// StatsStrip — polls /v1/info + /v1/stats/totals so chain head, tps,
// supply, and sync-status tile all advance live.
// ---------------------------------------------------------------------

export function LiveStatsStrip({ initial }: { initial: ChainInfo }) {
  const [info, setInfo] = useState<ChainInfo>(initial)
  useLivePoll(async () => {
    const fresh = await fetchStripInfoFromBrowser(info)
    if (fresh) setInfo(fresh)
  }, POLL_MS)
  return <StatsStrip info={info} />
}

// ---------------------------------------------------------------------
// Schemas card — first 5 schemas. Polls every 6s; ordering follows
// the api's default `registered_at` DESC sort, so freshly registered
// schemas bubble to the top within one cycle.
// ---------------------------------------------------------------------

export function LiveSchemasCard({ initial }: { initial: Schema[] }) {
  const [schemas, setSchemas] = useState<Schema[]>(initial)
  useLivePoll(async () => {
    const fresh = await fetchSchemasFromBrowser()
    if (fresh) setSchemas(fresh.slice(0, 5))
  }, POLL_MS)
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <Eyebrow>Schemas</Eyebrow>
        <Link
          href="/schemas"
          className="mono link"
          style={{
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          View all →
        </Link>
      </div>
      <FrameCard padding={0} style={{ flex: 1 }} scrollX>
        <table className="tbl tab-num tbl-compact">
          <thead>
            <tr>
              <th>Name</th>
              <th>Threshold</th>
              <th>Attestations</th>
            </tr>
          </thead>
          <tbody>
            {schemas.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
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
                    No schemas indexed yet
                  </span>
                </td>
              </tr>
            ) : (
              schemas.map((s) => (
                <tr key={s.schema_id}>
                  <td>
                    <Link
                      href={`/schema/${s.schema_id}`}
                      style={{ display: 'block' }}
                    >
                      <div
                        className="serif"
                        style={{
                          fontSize: 14,
                          color: 'var(--color-ink)',
                          lineHeight: 1.1,
                        }}
                      >
                        {s.name}
                      </div>
                      <div
                        className="mono"
                        style={{
                          fontSize: 9,
                          color: 'var(--color-subtle)',
                          marginTop: 2,
                          letterSpacing: '0.08em',
                        }}
                      >
                        v{s.version} · {trunc(s.schema_id, 6, 4)}
                      </div>
                    </Link>
                  </td>
                  <td>
                    <span
                      className="mono"
                      style={{ color: 'var(--color-accent)' }}
                    >
                      {s.threshold}
                    </span>
                  </td>
                  <td className="mono tab-num">
                    {s.attestation_count.toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </FrameCard>
    </div>
  )
}

// ---------------------------------------------------------------------
// Attestations card — first 5 attestations. Polls every 6s.
// `atts-compact` marker class drives mobile column hiding (the
// Submitter column drops on phones so Payload + Block + Sigs fit).
// ---------------------------------------------------------------------

export function LiveAttestationsCard({
  initial,
}: {
  initial: AttestationItem[]
}) {
  const [items, setItems] = useState<AttestationItem[]>(initial)
  useLivePoll(async () => {
    const fresh = await fetchAttestationsFromBrowser(5)
    if (fresh) setItems(fresh)
  }, POLL_MS)
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <Eyebrow>Latest attestations</Eyebrow>
        <Link
          href="/attestations"
          className="mono link"
          style={{
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          View all →
        </Link>
      </div>
      <FrameCard padding={0} style={{ flex: 1 }} scrollX>
        <table className="tbl tab-num tbl-compact atts-compact">
          <thead>
            <tr>
              <th>Payload</th>
              <th>Block</th>
              <th>Submitter</th>
              <th>Sigs</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
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
                    No attestations indexed yet
                  </span>
                </td>
              </tr>
            ) : (
              items.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link
                      href={`/attestation/${a.id}`}
                      className="h-mono"
                      style={{ display: 'block' }}
                      title={a.payload_hash}
                    >
                      {trunc(a.payload_hash, 6, 4)}
                    </Link>
                  </td>
                  <td>
                    <Link
                      href={`/blocks/${a.submitted_at.block_height}`}
                      className="mono"
                      style={{ color: 'var(--color-muted)' }}
                    >
                      #{a.submitted_at.block_height}
                    </Link>
                  </td>
                  <td>
                    <Link
                      href={`/address/${a.submitter}`}
                      className="h-mono"
                    >
                      {trunc(a.submitter, 6, 4)}
                    </Link>
                  </td>
                  <td>
                    <span
                      className="mono tab-num"
                      style={{ color: 'var(--color-accent)' }}
                    >
                      {a.signature_count}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </FrameCard>
    </div>
  )
}

// ---------------------------------------------------------------------
// Latest blocks card — top 10 blocks via BlocksTable in compact mode.
// Polls /v1/blocks?limit=10 every 6s.
// ---------------------------------------------------------------------

export function LiveLatestBlocks({ initial }: { initial: Block[] }) {
  const [blocks, setBlocks] = useState<Block[]>(initial)
  useLivePoll(async () => {
    const fresh = await fetchLatestBlocksFromBrowser(10)
    if (fresh) setBlocks(fresh)
  }, POLL_MS)
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <Eyebrow>Latest blocks</Eyebrow>
        <Link
          href="/blocks"
          className="mono link"
          style={{
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          View all →
        </Link>
      </div>
      <FrameCard padding={0} style={{ flex: 1 }} scrollX>
        <BlocksTable rows={blocks} compact />
      </FrameCard>
    </div>
  )
}

// ---------------------------------------------------------------------
// Latest transactions card — top 10 txs via TxsTable in compact mode.
// Polls /v1/txs?limit=10 every 6s.
// ---------------------------------------------------------------------

export function LiveLatestTxs({ initial }: { initial: Tx[] }) {
  const [txs, setTxs] = useState<Tx[]>(initial)
  useLivePoll(async () => {
    const fresh = await fetchLatestTxsFromBrowser(10)
    if (fresh) setTxs(fresh)
  }, POLL_MS)
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <Eyebrow>Latest transactions</Eyebrow>
        <Link
          href="/txs"
          className="mono link"
          style={{
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          View all →
        </Link>
      </div>
      <FrameCard padding={0} style={{ flex: 1 }} scrollX>
        <TxsTable rows={txs} showBlock={false} compact />
      </FrameCard>
    </div>
  )
}

// ---------------------------------------------------------------------
// Blocks page top stats — "Latest block" + "Indexed blocks" cards.
// Polls /v1/info + /v1/stats/totals every 6s so the head + indexed
// count advance live while the user is on /blocks (mirrors the home
// page's LiveStatsStrip behavior).
//
// The "Avg txs / block" + "Fees collected" cards next to these are
// 100-block / 100-tx aggregates: changing them live would require
// refetching the full sample on every tick. Cheap to skip; they only
// drift slowly with chain activity and hard-nav refreshes them.
// ---------------------------------------------------------------------

function BlocksStatCard({
  label,
  value,
  borderRight = false,
}: {
  label: string
  value: string
  borderRight?: boolean
}) {
  return (
    <FrameCard
      padding={20}
      style={{
        borderRight: borderRight ? '1px solid var(--color-line)' : 0,
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
        {label}
      </div>
      <div
        className="serif"
        style={{
          fontSize: 36,
          lineHeight: 1,
          color: 'var(--color-ink)',
        }}
      >
        {value}
      </div>
    </FrameCard>
  )
}

export function LiveBlocksTopStats({
  initial,
}: {
  initial: { latestBlock: number; indexedBlocks: number }
}) {
  const [state, setState] = useState(initial)
  useLivePoll(async () => {
    const fresh = await fetchInfoFromBrowser()
    if (!fresh) return
    setState({
      latestBlock: fresh.info.indexer_height ?? state.latestBlock,
      indexedBlocks: fresh.totals?.blocks ?? state.indexedBlocks,
    })
  }, POLL_MS)
  return (
    <>
      <BlocksStatCard
        label="Latest block"
        value={'#' + state.latestBlock.toLocaleString()}
      />
      <BlocksStatCard
        label="Indexed blocks"
        value={state.indexedBlocks.toLocaleString()}
      />
    </>
  )
}

// ---------------------------------------------------------------------
// Sequencer page surface — 3-stat strip (slots produced / block time
// / latest slot) + 10-row recent-slots table. Polls /v1/info +
// /v1/blocks in parallel every 6s so the single-sequencer page advances
// without a manual reload (same UX promise the home + blocks pages
// already make).
//
// `blockTime` is passed in as the SSR seed and kept static client-side:
// the measured slot interval drifts slowly enough that re-fetching it
// every 6s isn't worth it; users care most about new-slot arrival,
// which is what the height + table cover.
// ---------------------------------------------------------------------

export function LiveSequencerSurface({
  initial,
}: {
  initial: {
    chainHead: number
    blockTime: string
    blocks: Block[]
  }
}) {
  const [chainHead, setChainHead] = useState<number>(initial.chainHead)
  const [blocks, setBlocks] = useState<Block[]>(initial.blocks)

  useLivePoll(async () => {
    // Two endpoints in parallel — Promise.all so the next tick is the
    // worst case of either, not the sum. Both calls already retry
    // internally (fetchOk) so we don't bother wrapping in extra catches.
    const [info, fresh] = await Promise.all([
      fetchInfoFromBrowser(),
      fetchLatestBlocksFromBrowser(10),
    ])
    if (info?.info.indexer_height != null) {
      setChainHead(info.info.indexer_height)
    }
    if (fresh) setBlocks(fresh)
  }, POLL_MS)

  const latestSlot = blocks[0]
  const latestSlotAge =
    latestSlot != null
      ? ago(Math.floor((Date.now() - latestSlot.timestamp) / 1000))
      : '—'
  const stats: { label: string; value: string; sub: string }[] = [
    {
      label: 'Slots produced',
      value: '#' + chainHead.toLocaleString(),
      sub: 'all-time on devnet-1',
    },
    {
      label: 'Block time',
      value: initial.blockTime,
      sub: 'measured slot interval',
    },
    {
      label: 'Latest slot',
      value: latestSlot ? '#' + latestSlot.height.toLocaleString() : '—',
      sub: latestSlot ? latestSlotAge : 'no slots indexed yet',
    },
  ]

  return (
    <>
      <div
        className="grid-stats-3"
        style={{ marginTop: 40, gap: 0 }}
      >
        {stats.map((t, i) => (
          <FrameCard
            key={i}
            padding={20}
            style={{
              borderRight: i === 2 ? '1px solid var(--color-line)' : 0,
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
            </div>
            <div
              className="mono"
              style={{
                marginTop: 10,
                fontSize: 9,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--color-subtle)',
              }}
            >
              {t.sub}
            </div>
          </FrameCard>
        ))}
      </div>

      <div style={{ marginTop: 56 }}>
        <Eyebrow>Recent slots produced</Eyebrow>
        <FrameCard padding={0} style={{ marginTop: 12 }} scrollX>
          <table className="tbl tab-num">
            <thead>
              <tr>
                <th>Slot</th>
                <th>Hash</th>
                <th>Txs</th>
                <th>Finality</th>
                <th>Time</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {blocks.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
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
                      No slots indexed yet
                    </span>
                  </td>
                </tr>
              ) : (
                blocks.slice(0, 10).map((b) => {
                  const finalized = b.finality_status === 'finalized'
                  const pending = b.finality_status === 'pending'
                  const finalityLabel = finalized
                    ? 'finalized'
                    : pending
                      ? 'pending DA'
                      : '—'
                  const finalityColor = finalized
                    ? 'var(--color-accent)'
                    : pending
                      ? 'var(--color-amber)'
                      : 'var(--color-subtle)'
                  return (
                    <tr key={b.height}>
                      <td>
                        <Link
                          href={`/blocks/${b.height}`}
                          className="mono link"
                          style={{ color: 'var(--color-ink)' }}
                        >
                          #{b.height}
                        </Link>
                      </td>
                      <td>
                        <span className="h-mono" title={b.hash}>
                          {trunc(b.hash, 10, 6)}
                        </span>
                      </td>
                      <td>
                        <span className="mono">{b.tx_count}</span>
                      </td>
                      <td>
                        <span
                          className="mono"
                          style={{
                            fontSize: 10,
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                            color: finalityColor,
                          }}
                        >
                          {finalityLabel}
                        </span>
                      </td>
                      <td>
                        <span
                          className="mono"
                          style={{ color: 'var(--color-muted)' }}
                          title={isoDate(b.timestamp)}
                        >
                          {ago(Math.floor((Date.now() - b.timestamp) / 1000))}
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
        <div
          style={{
            marginTop: 12,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <Link
            href="/blocks"
            className="mono link"
            style={{
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            All slots →
          </Link>
        </div>
      </div>
    </>
  )
}
