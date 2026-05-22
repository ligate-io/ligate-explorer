// Wire types for the explorer's API client. Mirrors the contract
// in lib/api.ts and the mock fixtures in lib/mock.ts.

/**
 * Cursor-paginated list result. `nextCursor` is opaque to the client
 * (server-encoded); pass it back as the `cursor` arg to the next call,
 * or `null` to indicate this was the last page. Mirrors ligate-api's
 * `Page<T>` envelope (RFC 0001), translated to UI-friendly camelCase.
 */
export interface PageResult<T> {
  items: T[]
  nextCursor: string | null
}

export type TxType =
  | 'SubmitAttestation'
  | 'RegisterSchema'
  | 'RegisterAttestorSet'
  | 'Transfer'
  | 'BondSequencer'
  | 'SubmitProof'

export type TxStatus = 'SUCCESS' | 'REVERTED' | 'PENDING'

export type AddressRole = 'sequencer' | 'attester' | 'prover' | null

export interface Address {
  address: string
  role: AddressRole
}

export interface Block {
  height: number
  hash: string
  /** Parent slot hash. `null` on genesis and on legacy rows pre
   *  ligate-api PR #44 (the indexer derives it from slot N-1). */
  prev_hash: string | null
  timestamp: number
  tx_count: number
  /** Sequencer's Celestia bech32 address (the `da_address` that
   *  submitted the slot's first batch). `null` on legacy rows.
   *  No /address page yet — render as text + copy. */
  proposer: string | null
  /** Sum of fee_paid_nano + protocol_fee_nano across all txs. The api
   *  doesn't carry a slot-level total, so this is computed downstream
   *  from `getTxsForBlock`; the adapter emits `"0"` and detail pages
   *  recompute. */
  fees_total_nano: string
  /** DA-layer settlement state. Omitted on legacy rows (treat absent
   *  as "unknown — render no badge"). */
  finality_status?: 'pending' | 'finalized' | string
  /** ms-since-epoch when the indexer observed pending → finalized.
   *  Omitted while still pending or on legacy rows. */
  finalized_at_ms?: number | null
  /** Celestia (DA) block height where this slot's first batch's blob
   *  was included. Source: ligate-api `BlockResponse.da_block_height`,
   *  threaded from chain v0.2.3's `receipt.da_block_height`
   *  (ligate-io/ligate-chain#355). Powers the "View on Celenium"
   *  deep-link on the block detail page:
   *  `https://mocha.celenium.io/block/{da_block_height}` (singular
   *  `/block/`; the plural `/blocks` is the list page). Absent on
   *  legacy slots ingested before chain v0.2.3 + api PR #63. */
  da_block_height?: number | null
}

export interface TxEvent {
  index: number
  module: string
  type: string
  preview: string
}

export interface Tx {
  hash: string
  height: number
  block_hash: string
  sender: string
  type: TxType
  status: TxStatus
  /** Gas / execution fee paid by the sender. `"0"` until the indexer
   *  exposes it (chain elides from REST in migration 0003). */
  fee_nano: string
  /** Protocol fee burned at execution. Surfaced per-tx by the api now
   *  (used to be hardcoded per-kind on the explorer side). `"0"` for
   *  kinds with no protocol fee (e.g. transfer). */
  protocol_fee_nano: string
  gas_used: number
  nonce: number
  timestamp: number
  /** Raw RFC 0002 `details` blob. Per-kind shape:
   *  - transfer: `{ from, to, amount_nano, token_id }`
   *  - submit_attestation: `{ schema_id, payload_hash, signature_count }`
   *  - register_schema: `{ schema_id, name, version, ... }`
   *  - register_attestor_set: `{ attestor_set_id, members, threshold }`
   *  Use `lib/tx-payload.ts` typed accessors at the render site. */
  payload: Record<string, unknown>
  /** The complete wire response from `/v1/txs/{hash}` — every field
   *  the api ships, including the per-tx envelope (position,
   *  sender_pubkey, outcome, revert_reason, block_*) plus the full
   *  `details` blob. Rendered verbatim in the "Raw transaction"
   *  section so the user sees everything we have, not just the
   *  curated detail blocks above. */
  raw_response: Record<string, unknown>
  events: TxEvent[]
}

export interface Schema {
  schema_id: string
  name: string
  version: number
  owner: string
  attestor_set_id: string
  threshold: string
  fee_routing_bps: number
  fee_routing_addr: string
  payload_shape_hash: string
  description: string
  attestation_count: number
}

// NOTE: the legacy `SchemaAttestation`, `Attestation`, and
// `AttestorSet` interfaces were dropped. The api now ships
// `AttestationItem` (below) for both list rows and detail responses,
// and `AttestorSetItem` for attestor-set list + detail. Schema's
// `recent_attestations: SchemaAttestation[]` field was always `[]`
// in the adapter — detail pages cross-fetch via
// `getSchemaAttestations()` instead.

export interface ChainInfo {
  chain_id: string
  chain_hash: string
  /** /v1/info.version — the chain node version. The api proxies it
   *  through from the upstream chain's /v1/info; render under
   *  "Chain version". (Was the api server's own crate version
   *  historically, before the api flipped to surfacing the chain
   *  version directly.) */
  version: string
  latest_block: number
  tx_per_second: number
  /** Human string ("~6s") derived from block_time_ms; falls back to NEXT_PUBLIC_FINALITY env. */
  finality: string
  /** Raw median delta between recent block timestamps in ms, or null when not yet measurable. */
  block_time_ms: number | null
  rpc_url: string
  api_url: string
  supply_nano: string
  network_status: string
  da_layer: string
}

// /v1/cluster/nodes (chain#442). Mirrors the api's public
// `ClusterTopology` shape; addresses are stripped at the api layer
// before they reach the explorer, so this carries no per-node
// `address` field.

export type ClusterHealth = 'healthy' | 'degraded' | 'leaderless' | 'unknown'

export interface ClusterNode {
  node_id: string
  is_leader: boolean
  last_heartbeat_age_ms: number
}

export interface ClusterTopology {
  nodes: ClusterNode[]
  leader_node_id: string | null
  leader_acquired_at_epoch_ms: number | null
  generated_at_epoch_ms: number
  cluster_health: ClusterHealth
}

export interface AddressDetail {
  address: string
  balance_nano: string
  tx_count: number
  first_seen_height: number
  first_seen_at: string
  role: AddressRole
  sequencer_bond: string | null
  attester_bond: string | null
  prover_bond: string | null
  recent_txs: Tx[]
}

export interface DripStatus {
  can_drip: boolean
  next_drip_at: string | null
}

export interface DripResult {
  tx_hash: string
  amount_nano: string
}

// ============================================================================
// Stats endpoints (api /v1/stats/*)
// ============================================================================

export interface StatsTotals {
  indexed_at_slot: number
  blocks: number
  txs_total: number
  txs_committed: number
  addresses: number
  schemas: number
  attestor_sets: number
  attestations: number
  /** Total LGT supply in nano. Now reliably populated post ligate-api
   *  PR #42 (the supply query was hitting a hex path the chain
   *  rejected; switched to bech32m token_…). The fallback at the
   *  fetcher level still kicks in if the whole stats endpoint 5xx's,
   *  but the field itself shouldn't be missing under normal operation. */
  total_supply_nano: string
  treasury_balance_nano?: string
  treasury_address?: string
}

// /v1/stats/finality. Real percentiles over the configured window once
// the api has 20+ observations (post ligate-api PR #44); falls back to
// `source: 'estimated'`, `window: 'static'`, `sampled_count: 0` on a
// fresh deploy. UI surfaces `source` as a "live" vs "estimated" badge,
// and a "low-confidence" hint when sampled_count < 100.
export interface FinalityStats {
  window: string
  sampled_count: number
  p50_seconds: number
  p95_seconds: number
  p99_seconds: number
  da_layer: string
  source: 'estimated' | 'observed' | string
  as_of: string
}

// /v1/stats/next-block-eta — drop-in for a "next block in Ns" live
// ticker. 5s cache TTL. The four interval/eta fields can be absent
// (not null) when fewer than 2 slots have been indexed; treat that as
// "indexer warming up." `seconds_until_expected` may be negative when
// the chain is overdue; render as "expected any moment" rather than
// negative seconds. `indexer_lag_secs > 5` means the indexer is behind
// the chain — surface as a subtle hint.
export interface NextBlockEta {
  last_block_height: number
  /** RFC3339 ms timestamp. */
  last_block_timestamp: string
  mean_block_interval_secs?: number
  p95_block_interval_secs?: number
  /** RFC3339 ms timestamp (mean_interval + last_block_timestamp). */
  expected_next_at?: string
  seconds_since_last: number
  /** Negative once we're past the expected next-block time. */
  seconds_until_expected?: number
  indexer_lag_secs: number
}

// /v1/search response. Discriminated union on `kind`.
//
// `not_found` is a definitive answer from the api (well-formed query,
// no match). `error` is a client-synthesized fallback when the call
// itself failed (network down, api 5xx, unparseable body) — distinct
// so the UI can tell the user "your query was probably fine, our
// indexer is hiccuping" instead of the misleading "Nothing matched."
export type SearchResult =
  | { kind: 'block'; block_height: number }
  | { kind: 'tx'; tx_hash: string }
  | { kind: 'address'; address: string }
  | { kind: 'schema'; schema_id: string }
  | { kind: 'attestor_set'; attestor_set_id: string }
  | { kind: 'attestation'; id: string }
  | { kind: 'not_found'; query: string }
  | { kind: 'error'; message: string }

// One row from /v1/attestations or its by-schema / by-set variants.
// The shape has nested `submitted_at` (block_height + tx_hash +
// timestamp) instead of the older flat fields, and includes a single
// bech32m `id = lat1…` for routing to detail. The id is derived by
// the chain (ligate-chain v0.2.0+) as
// SHA-256(schema_id_bytes || payload_hash_bytes), bech32m-encoded
// with the `lat` HRP. The pre-v0.2.0 compound `lsc1…:lph1…` form
// is gone.
export interface AttestationItem {
  id: string
  schema_id: string
  payload_hash: string
  submitter: string
  submitter_pubkey?: string
  signature_count: number
  submitted_at: {
    block_height: number
    tx_hash: string
    timestamp: string
  }
}

// One row from /v1/attestor-sets list. Distinct from the existing
// `AttestorSet` (detail-shaped, with bound_schemas + attestation_count)
// so list pages don't have to fan out to detail per row.
export interface AttestorSetItem {
  id: string
  members: string[]
  threshold: number
  schema_count: number
  registered_at: {
    block_height: number
    tx_hash: string
    timestamp: string
  }
}

export interface TxRatePoint {
  date: string // YYYY-MM-DD
  kind: string
  outcome: string
  count: number
}

// /v1/stats/attestations-daily (ligate-api PR #53). One point per day
// the chain saw attestations land. Days with zero attestations are
// absent from `points` (Postgres GROUP BY doesn't emit empty groups);
// callers fill missing dates with 0 on the explorer side.
export interface AttestationDailyPoint {
  date: string // YYYY-MM-DD
  count: number
}

export interface TopHolder {
  rank: number
  address: string
  balance_nano: string
  balance_lgt: number
}
