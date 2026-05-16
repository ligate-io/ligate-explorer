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
  fetchLatestBlocksFromBrowser,
  fetchLatestTxsFromBrowser,
  fetchSchemasFromBrowser,
  fetchStripInfoFromBrowser,
} from '@/lib/api-browser'
import { trunc } from '@/lib/format'
import { useLivePoll } from '@/lib/use-live-poll'
import { StatsStrip } from './dashboard'
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
