// Browser-callable fetchers for the live homepage cards.
//
// `lib/api.ts` is marked `import "server-only"` (it pulls mock data
// and uses Next-only `next: { revalidate }` cache hints), so client
// components can't import from it. This file mirrors the small subset
// of wire types + adapters the live cards need, and hits the api
// directly from the browser via the public NEXT_PUBLIC_API_URL.
//
// CORS: api.ligate.io ships `access-control-allow-origin: *` so the
// browser fetches go through without a proxy.
//
// Caching: every fetcher uses `cache: 'no-store'` — the home page
// polls these endpoints on its own cadence, so we never want a stale
// in-browser cache hit to mask a freshly-landed block.

import type {
  AttestationItem,
  Block,
  ChainInfo,
  Schema,
  StatsTotals,
  Tx,
  TxStatus,
  TxType,
} from './api-types'

const apiBase = (
  process.env.NEXT_PUBLIC_API_URL ?? 'https://api.ligate.io'
).replace(/\/+$/, '')

// ---------------------------------------------------------------------
// Wire shapes — same names + fields as the private interfaces in
// lib/api.ts, redeclared here so this module stays self-contained and
// doesn't force lib/api.ts to drop its `server-only` marker.
// ---------------------------------------------------------------------

interface Page<T> {
  data: T[]
  pagination: { next: string | null; limit: number }
}

interface ApiInfoResponse {
  chain_id: string
  chain_hash: string
  version: string
  indexer_height: number | null
  head_height: number | null
  head_lag_slots: number | null
}

interface ApiBlockResponse {
  height: number
  hash: string
  parent_hash: string | null
  state_root: string | null
  timestamp: string
  tx_count: number
  batch_count: number
  proposer: string | null
  size_bytes: number | null
  finality_status?: 'pending' | 'finalized' | string
  finalized_at?: string | null
  // Celestia DA block height where this slot's first batch landed.
  // Surfaced by chain v0.2.3+ via receipt.da_block_height and threaded
  // through ligate-api PR #63 onto BlockResponse. Absent on slots
  // ingested before this lands. Same field as in api.ts; kept in
  // parity here because both adapter files declare their own
  // ApiBlockResponse mirror of the api's BlockResponse JSON.
  da_block_height?: number | null
}

interface ApiTxResponse {
  hash: string
  block_height: number
  block_hash: string | null
  block_timestamp: string | null
  position: number
  sender: string | null
  sender_pubkey: string | null
  nonce: number | null
  fee_paid_nano: string | null
  protocol_fee_nano: string | null
  kind: string
  details: Record<string, unknown>
  outcome: string
  revert_reason: string | null
}

interface ApiSchemaResponse {
  id: string
  name: string
  version: number
  owner: string
  attestor_set_id: string
  threshold: number
  fee_routing_bps: number
  fee_routing_addr: string | null
  payload_shape_hash: string
  registered_at: {
    block_height: number
    tx_hash: string
    timestamp: string
  }
  attestation_count: number
}

// ---------------------------------------------------------------------
// Small helpers (mirrored from lib/api.ts so the browser side doesn't
// depend on a server-only module).
// ---------------------------------------------------------------------

function rfc3339ToMillis(s: string | null): number {
  if (!s) return 0
  const ms = Date.parse(s)
  return Number.isNaN(ms) ? 0 : ms
}

function kindToTxType(kind: string): TxType {
  switch (kind) {
    case 'transfer':
      return 'Transfer'
    case 'register_schema':
      return 'RegisterSchema'
    case 'register_attestor_set':
      return 'RegisterAttestorSet'
    case 'submit_attestation':
      return 'SubmitAttestation'
    default:
      return 'Transfer'
  }
}

function outcomeToStatus(outcome: string): TxStatus {
  switch (outcome) {
    case 'committed':
      return 'SUCCESS'
    case 'reverted':
      return 'REVERTED'
    default:
      return 'PENDING'
  }
}

function adaptBlockResponse(r: ApiBlockResponse): Block {
  const finalizedAtMs =
    typeof r.finalized_at === 'string' ? rfc3339ToMillis(r.finalized_at) : null
  return {
    height: r.height,
    hash: r.hash,
    prev_hash: r.parent_hash ?? null,
    proposer: r.proposer ?? null,
    timestamp: rfc3339ToMillis(r.timestamp),
    tx_count: r.tx_count,
    fees_total_nano: '0',
    finality_status: r.finality_status,
    finalized_at_ms: finalizedAtMs,
    da_block_height: r.da_block_height ?? null,
  }
}

function adaptTxResponse(r: ApiTxResponse): Tx {
  return {
    hash: r.hash,
    height: r.block_height,
    block_hash: r.block_hash ?? '',
    sender: r.sender ?? '',
    type: kindToTxType(r.kind),
    status: outcomeToStatus(r.outcome),
    fee_nano: r.fee_paid_nano ?? '0',
    protocol_fee_nano: r.protocol_fee_nano ?? '0',
    raw_response: r as unknown as Record<string, unknown>,
    gas_used: 0,
    nonce: r.nonce ?? 0,
    timestamp: rfc3339ToMillis(r.block_timestamp),
    payload: r.details,
    events: [],
  }
}

function adaptSchemaResponse(r: ApiSchemaResponse): Schema {
  return {
    schema_id: r.id,
    name: r.name,
    version: r.version,
    owner: r.owner,
    attestor_set_id: r.attestor_set_id,
    // List-view schemas render the threshold as just M. The detail
    // page does the M-of-N cross-fetch (still server-side); the
    // homepage table doesn't show the denominator.
    threshold: String(r.threshold),
    fee_routing_bps: r.fee_routing_bps,
    fee_routing_addr: r.fee_routing_addr ?? '',
    payload_shape_hash: r.payload_shape_hash,
    description: '',
    attestation_count: r.attestation_count,
  }
}

// ---------------------------------------------------------------------
// Fetchers — one per live card. Each catches its own failure and
// returns either a sentinel "no change" hint (null) or the previous
// shape with an empty array. Callers decide whether to keep their
// last-good state on null.
// ---------------------------------------------------------------------

async function fetchOk(path: string): Promise<Response | null> {
  try {
    const res = await fetch(`${apiBase}${path}`, { cache: 'no-store' })
    if (!res.ok) return null
    return res
  } catch {
    return null
  }
}

/**
 * Lightweight head-only chain head fetch. Both StatsStrip and
 * the live-blocks card need to know "what's the chain head" so the
 * "fresh" row highlight, the strip's "Latest block" tile, and the
 * BlockTickerCard's bar all advance off the same number.
 *
 * Returns null on any failure; caller keeps last-good value.
 */
export async function fetchInfoFromBrowser(): Promise<{
  info: ApiInfoResponse
  totals: StatsTotals | null
} | null> {
  const [infoRes, totalsRes] = await Promise.all([
    fetchOk('/v1/info'),
    fetchOk('/v1/stats/totals'),
  ])
  if (!infoRes) return null
  try {
    const info = (await infoRes.json()) as ApiInfoResponse
    const totals = totalsRes
      ? ((await totalsRes.json()) as StatsTotals)
      : null
    return { info, totals }
  } catch {
    return null
  }
}

/**
 * Compute tx-per-second from the recent-tx sample. Mirrors the server
 * implementation: span across the full sample (oldest → newest in the
 * recent /v1/txs window). Returns 0 when there's fewer than 2 dateable
 * rows so the UI can render "—" instead of a fake number.
 */
function computeTpsFromTxs(txs: Tx[]): number {
  const ts = txs.map((t) => t.timestamp).filter((t) => t > 0)
  if (ts.length < 2) return 0
  const newest = Math.max(...ts)
  const oldest = Math.min(...ts)
  const spanSec = (newest - oldest) / 1000
  if (spanSec < 1) return 0
  return ts.length / spanSec
}

/**
 * Build a fresh ChainInfo for the StatsStrip. Pulls /v1/info plus a
 * 100-row tx sample (for tps) plus /v1/stats/totals (for supply +
 * treasury). The result has the same shape as the server-side
 * `getInfo()` so StatsStrip's props don't change. `block_time_ms`
 * is left as-is from the initial server prop because computing it
 * client-side would need the median-delta logic plus the eta endpoint,
 * and the BlockTickerCard already owns the "block time" display.
 */
export async function fetchStripInfoFromBrowser(
  fallback: ChainInfo,
): Promise<ChainInfo | null> {
  const headRes = await fetchInfoFromBrowser()
  if (!headRes) return null
  const txsPage = await fetchOk('/v1/txs?limit=100')
  let tps = fallback.tx_per_second
  if (txsPage) {
    try {
      const body = (await txsPage.json()) as Page<ApiTxResponse>
      tps = computeTpsFromTxs(body.data.map(adaptTxResponse))
    } catch {
      /* keep fallback tps */
    }
  }
  const { info, totals } = headRes
  return {
    ...fallback,
    chain_id: info.chain_id,
    chain_hash: info.chain_hash,
    version: info.version,
    latest_block: info.indexer_height ?? fallback.latest_block,
    tx_per_second: tps,
    supply_nano: totals?.total_supply_nano ?? fallback.supply_nano,
    network_status:
      info.head_lag_slots == null
        ? fallback.network_status
        : info.head_lag_slots === 0
          ? 'Synced'
          : `Syncing (lag ${info.head_lag_slots})`,
  }
}

export async function fetchLatestBlocksFromBrowser(
  limit: number,
): Promise<Block[] | null> {
  const res = await fetchOk(`/v1/blocks?limit=${limit}`)
  if (!res) return null
  try {
    const body = (await res.json()) as Page<ApiBlockResponse>
    return body.data.map(adaptBlockResponse)
  } catch {
    return null
  }
}

export async function fetchLatestTxsFromBrowser(
  limit: number,
): Promise<Tx[] | null> {
  const res = await fetchOk(`/v1/txs?limit=${limit}`)
  if (!res) return null
  try {
    const body = (await res.json()) as Page<ApiTxResponse>
    return body.data.map(adaptTxResponse)
  } catch {
    return null
  }
}

export async function fetchSchemasFromBrowser(): Promise<Schema[] | null> {
  const res = await fetchOk('/v1/schemas?limit=100')
  if (!res) return null
  try {
    const body = (await res.json()) as Page<ApiSchemaResponse>
    return body.data.map(adaptSchemaResponse)
  } catch {
    return null
  }
}

interface AttestationItemPage {
  data: AttestationItem[]
  pagination: { next: string | null; limit: number }
}

export async function fetchAttestationsFromBrowser(
  limit: number,
): Promise<AttestationItem[] | null> {
  const res = await fetchOk(`/v1/attestations?limit=${limit}`)
  if (!res) return null
  try {
    const body = (await res.json()) as AttestationItemPage
    return body.data
  } catch {
    return null
  }
}
