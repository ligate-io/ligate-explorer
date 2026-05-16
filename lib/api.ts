import "server-only";

import { getMockAddressDetail, getMockDripStatus, mockData } from "./mock";
import type {
  AddressDetail,
  AttestationDailyPoint,
  AttestationItem,
  AttestorSetItem,
  Block,
  ChainInfo,
  DripResult,
  DripStatus,
  FinalityStats,
  NextBlockEta,
  PageResult,
  Schema,
  SearchResult,
  StatsTotals,
  TopHolder,
  Tx,
  TxRatePoint,
  TxStatus,
  TxType,
} from "./api-types";

const useMockApi = process.env.USE_MOCK_API !== "false";
const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "https://api.ligate.io";
const rpcBase = process.env.NEXT_PUBLIC_RPC_URL ?? "https://rpc.ligate.io";
// Genesis-pinned token id for $LGT on ligate-devnet-1. The chain's
// `gas_token_config.token_id` writes this; it's stable across the
// devnet's life. Override via env if the token id ever changes.
const lgtTokenId =
  process.env.NEXT_PUBLIC_LGT_TOKEN_ID ??
  "token_1nyl0e0yweragfsatygt24zmd8jrr2vqtvdfptzjhxkguz2xxx3vs0y07u7";
const daLayer = process.env.NEXT_PUBLIC_DA_LAYER ?? "Celestia (mocha-4)";
// Fallback finality string when there aren't enough blocks yet to
// measure the actual median block time. Once we have real data, the
// computed value supersedes this.
const fallbackFinality = process.env.NEXT_PUBLIC_FINALITY ?? "~12s";
// Hard fallback for supply if the chain bank query fails (network
// blip, chain pause). Defaults to the genesis pin (1B). The live read
// in getInfo() supersedes this whenever the chain answers.
const fallbackLgtSupplyNano =
  process.env.NEXT_PUBLIC_LGT_SUPPLY ?? "1000000000000000000"; // 1B LGT

// All fetches honor the api's Cache-Control headers (added in
// ligate-api PR #45). Tier 0 brief set sensible TTLs per endpoint:
//   5s   /v1/info, /v1/blocks list, /v1/txs list, /v1/stats/next-block-eta
//   10s  /v1/stats/totals
//   30s  /v1/stats/finality, /v1/attestations list
//   60s  /v1/schemas list, /v1/attestor-sets list
//   300s /v1/blocks/{height}, /v1/txs/{hash}, /v1/attestations/{id}
// Next.js fetch cache + Vercel CDN both pick this up automatically.
// Same-URL fetches in a single render are deduped; same-URL fetches
// across renders within max-age serve from the cache.
//
// AutoRefresh's router.refresh() invalidates the route cache so polling
// still detects new blocks — the fetch cache just stops us from making
// duplicate origin RTTs within a single render OR within the response's
// max-age window.
//
// Caller can override per-fetch (e.g. drip-tx polling needs no-store).
async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, init);
  if (!res.ok) {
    throw new Error(`API ${path} returned ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Fetch directly against the chain RPC (rpc.ligate.io), bypassing the
 * indexer api. Used for things the api doesn't surface: live total
 * supply, attestor-set state by id, etc. Same no-cache semantics so
 * AutoRefresh on the home page picks up movements.
 */
async function fetchChain<T>(path: string): Promise<T> {
  const res = await fetch(`${rpcBase}${path}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Chain ${path} returned ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// RFC 0001 / 0002 wire shapes — private to this module
// ---------------------------------------------------------------------------
//
// These mirror ligate-api's `crates/api/src/responses.rs` 1-to-1. Kept
// private so explorer components keep typing against the friendlier
// `Block` / `Tx` / `AddressDetail` shapes in `api-types.ts` while the
// adapters below handle the wire-format → UI-format translation. When
// the explorer eventually adopts RFC 0002 shapes directly, the adapters
// drop and components flip imports.

/** RFC 0001 list-endpoint envelope. */
interface Page<T> {
  data: T[];
  pagination: { next: string | null; limit: number };
}

/** RFC 0002 `Info` body. */
interface ApiInfoResponse {
  chain_id: string;
  chain_hash: string;
  version: string;
  // `null` only on a totally fresh indexer that hasn't ingested a
  // single slot yet, or when the chain proxy fails inside the api.
  indexer_height: number | null;
  head_height: number | null;
  head_lag_slots: number | null;
}

/** RFC 0002 `Block` body. */
interface ApiBlockResponse {
  height: number;
  hash: string;
  // Populated post ligate-api PR #44 (indexer derives from slot N-1).
  // Still `null` on genesis + on legacy rows pre-migration.
  parent_hash: string | null;
  state_root: string | null;
  // RFC3339 with milliseconds, e.g. `"2026-05-11T19:30:56.952Z"`.
  timestamp: string;
  tx_count: number;
  batch_count: number;
  // Sequencer's Celestia bech32 address (the `da_address` that
  // submitted the slot's first batch). `null` on legacy rows. On
  // single-sequencer devnet this is the same address every block.
  proposer: string | null;
  size_bytes: number | null;
  // Settlement state (PR #44). Field is `skip_serializing_if`-omitted
  // entirely on legacy rows — TS captures that with `?:` so the adapter
  // can distinguish absent from any real string value.
  finality_status?: 'pending' | 'finalized' | string;
  // RFC3339 ms timestamp the indexer observed pending → finalized.
  // Omitted while still pending or on legacy rows.
  finalized_at?: string | null;
}

/** RFC 0002 `Tx` body. */
interface ApiTxResponse {
  hash: string;
  block_height: number;
  block_hash: string | null;
  // RFC3339 millis. May be null if the slot→tx join missed; shouldn't
  // happen for finalised txs.
  block_timestamp: string | null;
  position: number;
  sender: string | null;
  sender_pubkey: string | null;
  nonce: number | null;
  // u128 decimal string per RFC 0002.
  fee_paid_nano: string | null;
  // u128 decimal string. Burned at execution (registration / attestation
  // protocol fees). `"0"` for transfer + free kinds.
  protocol_fee_nano: string | null;
  // `"transfer" | "register_attestor_set" | "register_schema" |
  //  "submit_attestation" | "unknown"`
  kind: string;
  details: Record<string, unknown>;
  // `"committed" | "reverted"`. Skipped txs aren't indexed.
  outcome: string;
  revert_reason: string | null;
}

/** RFC 0002 `Schema` body. */
interface ApiSchemaResponse {
  id: string;
  name: string;
  version: number;
  owner: string;
  attestor_set_id: string;
  /** Required-signatures count (M in "M of N"). Now ships on every
   *  schema row (ligate-api PR #52) — was a separate attestor-set
   *  fetch before. Total members (N) still needs the set lookup. */
  threshold: number;
  fee_routing_bps: number;
  fee_routing_addr: string | null;
  payload_shape_hash: string;
  registered_at: {
    block_height: number;
    tx_hash: string;
    timestamp: string;
  };
  attestation_count: number;
}

/** RFC 0002 `AttestorSet` body. */
interface ApiAttestorSetResponse {
  id: string;
  members: string[];
  threshold: number;
  registered_at: {
    block_height: number;
    tx_hash: string;
    timestamp: string;
  };
  schema_count: number;
}

/** RFC 0002 `AddressSummary` body. */
interface ApiAddressSummaryResponse {
  address: string;
  balances: Array<{ token_id: string; amount_nano: string }>;
  tx_count: number;
  first_seen: { block_height: number; timestamp: string } | null;
  last_seen: { block_height: number; timestamp: string } | null;
  schemas_owned_count: number;
  attestor_member_count: number;
}

/** ligate-api `DripResponse` shape (not strictly RFC 0002 since it's a
 *  write endpoint, but documented in `api/src/handlers.rs::DripResponse`). */
interface ApiDripResponse {
  address: string;
  tx_hash: string;
  amount_nano: number;
  drip_amount_lgt: number;
}

/**
 * Per-address branch of `GET /v1/drip/status?address=<addr>`.
 *
 * Documented in `api/src/handlers.rs::AddressDripStatusResponse`. The
 * shape happens to match the explorer's `DripStatus` 1-to-1, so no
 * adapter mapping is needed; we just type the fetch result.
 *
 * `next_drip_at` is an RFC3339-millis UTC instant when `can_drip` is
 * false, and `null` when the address can drip right now. The api
 * computes the timestamp as `Utc::now() + retry_after` so the
 * explorer doesn't need server-clock sync.
 */
interface ApiAddressDripStatusResponse {
  can_drip: boolean;
  next_drip_at: string | null;
}

// ---------------------------------------------------------------------------
// Adapters — wire shape → explorer UI shape
// ---------------------------------------------------------------------------

/**
 * Adapter takes the api's RFC 0002 `Info` body plus an optional
 * `tx_per_second` we computed from the recent-tx window. Three fields
 * still don't have a direct chain source and come from env:
 *
 * - `finality`: NEXT_PUBLIC_FINALITY, defaults to "~12s" (Celestia mocha).
 * - `supply_nano`: NEXT_PUBLIC_LGT_SUPPLY, defaults to 100M LGT
 *   (the genesis pin on devnet, which doesn't inflate). Will become a
 *   live read when the api adds /v1/bank/supply.
 * - `da_layer`: NEXT_PUBLIC_DA_LAYER, defaults to "Celestia (mocha-4)".
 *
 * `rpc_url` is left empty for the explorer page to fill from its own
 * env (it knows its target better than the api does).
 */
function adaptInfoResponse(
  r: ApiInfoResponse,
  txPerSecond: number,
  blockTimeMs: number | null,
  supplyNano: string,
  finalitySource: 'estimated' | 'observed' | string | null,
  finalityDaLayer: string | null,
): ChainInfo {
  // head_lag_slots: 0 → fully caught up; non-zero → still syncing.
  // Surfaced as a UI string so the dashboard pill doesn't have to
  // duplicate the threshold logic.
  const networkStatus =
    r.head_lag_slots == null
      ? "live"
      : r.head_lag_slots === 0
        ? "Synced"
        : `Syncing (lag ${r.head_lag_slots})`;
  // Finality string: prefer the api's stats endpoint (currently
  // estimated; flips to observed once the api adds the observation
  // path). When source is "estimated" surface that to the user with
  // a small italic suffix so partners don't mistake it for real-time.
  const finalityStr = formatBlockTime(blockTimeMs);
  const finalityWithSource =
    finalitySource === "estimated"
      ? `${finalityStr} (est)`
      : finalityStr;
  return {
    chain_id: r.chain_id,
    chain_hash: r.chain_hash,
    version: r.version,
    latest_block: r.indexer_height ?? 0,
    tx_per_second: txPerSecond,
    finality: finalityWithSource,
    block_time_ms: blockTimeMs,
    rpc_url: rpcBase,
    api_url: apiBase,
    supply_nano: supplyNano,
    network_status: networkStatus,
    da_layer: finalityDaLayer ?? daLayer,
  };
}

/**
 * Median delta between consecutive block timestamps. The chain's a
 * single-sequencer rollup so once a block lands it's canonical; the
 * "finality" the user cares about is "how long until the next slot
 * locks my tx in". Median is more honest than mean here because the
 * occasional 30-second pause skews the average, but most blocks land
 * close to the median.
 *
 * Returns null if we don't have enough blocks to measure (caller
 * falls back to the env-driven default).
 */
function medianBlockTimeMs(
  blocks: Array<{ timestamp: string }>,
): number | null {
  // Sort newest → oldest defensively. The api orders this way already
  // but a future endpoint change shouldn't silently break this.
  const ts = blocks
    .map((b) => Date.parse(b.timestamp))
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => b - a)
  if (ts.length < 2) return null
  const deltas: number[] = []
  for (let i = 0; i < ts.length - 1; i++) deltas.push(ts[i] - ts[i + 1])
  deltas.sort((a, b) => a - b)
  const mid = Math.floor(deltas.length / 2)
  return deltas.length % 2
    ? deltas[mid]
    : Math.round((deltas[mid - 1] + deltas[mid]) / 2)
}

function formatBlockTime(ms: number | null): string {
  if (ms == null) return fallbackFinality
  const seconds = ms / 1000
  if (seconds < 1) return `~${seconds.toFixed(2)}s`
  if (seconds < 10) return `~${seconds.toFixed(1)}s`
  return `~${Math.round(seconds)}s`
}

/**
 * Compute tx-per-second from the recent-tx sample.
 *
 * Old approach used a fixed 5-minute window, which pinned tps at 0
 * on a sparse chain (devnet has bursts then long quiet periods);
 * the stat never moved.
 *
 * New approach: span across the full sample (oldest → newest tx in
 * the 100-row /v1/txs fetch). Gives the real recent average — never
 * pinned at zero as long as the chain has any history.
 *
 * Returns 0 when there's fewer than 2 dateable rows (genuine "no
 * signal" case) so the UI can render a "—" instead of a fake number.
 */
function computeTpsFromTxs(
  txs: Array<{ block_timestamp: string | null }>,
): number {
  const ts: number[] = [];
  for (const t of txs) {
    if (!t.block_timestamp) continue;
    const ms = Date.parse(t.block_timestamp);
    if (Number.isFinite(ms)) ts.push(ms);
  }
  if (ts.length < 2) return 0;
  const newest = Math.max(...ts);
  const oldest = Math.min(...ts);
  const spanSec = (newest - oldest) / 1000;
  if (spanSec < 1) return 0;
  return ts.length / spanSec;
}

/**
 * RFC3339 millisecond string → Unix ms number. The explorer's UI
 * components feed `timestamp` into `Date.now() - timestamp` and
 * `isoDate(ts)`, so a JS millis-since-epoch number is what fits.
 */
function rfc3339ToMillis(s: string | null): number {
  if (!s) return 0;
  const ms = Date.parse(s);
  return Number.isNaN(ms) ? 0 : ms;
}

/**
 * Block adapter, updated post ligate-api PR #44 (slot settlement
 * timing). Five fields became real:
 *
 * - `parent_hash`: indexer derives from slot N-1; populated on every
 *   non-genesis post-PR row.
 * - `proposer`: sequencer's Celestia bech32 (`celestia1…`). Single
 *   value across devnet-1 (one sequencer); rotates on multi-sequencer
 *   chains.
 * - `finality_status`: `"pending" | "finalized"`. `skip_serializing_if`
 *   omitted entirely on legacy rows — UI treats absent as "no badge".
 * - `finalized_at`: RFC3339 ms when the slot flipped to finalized.
 *   Adapter converts to ms once.
 *
 * `fees_total_nano` still isn't on the wire; block detail recomputes
 * by summing `fee_paid_nano + protocol_fee_nano` across the slot's
 * tx list (per ligate-api PR #43.B.3 brief).
 */
function adaptBlockResponse(r: ApiBlockResponse): Block {
  // Convert the optional `finalized_at` RFC3339 string to ms once at
  // the adapter so detail pages don't redo the parse + null-check.
  // Preserve `null` (vs `undefined`) so a falsey check still works
  // but the type carries the "explicitly absent" intent.
  const finalizedAtMs =
    typeof r.finalized_at === 'string' ? rfc3339ToMillis(r.finalized_at) : null;
  return {
    height: r.height,
    hash: r.hash,
    // Pass nulls through so the UI can distinguish "not yet known"
    // (legacy row pre PR #44) from a real value. Old adapter coerced
    // to "" / "unknown", which prevented "—" placeholder rendering.
    prev_hash: r.parent_hash ?? null,
    proposer: r.proposer ?? null,
    timestamp: rfc3339ToMillis(r.timestamp),
    tx_count: r.tx_count,
    // Slot-level fees_total_nano isn't on the wire; detail page
    // recomputes from the block's tx list (sums fee_paid + protocol).
    fees_total_nano: "0",
    finality_status: r.finality_status,
    finalized_at_ms: finalizedAtMs,
  };
}

/**
 * Map RFC 0002 `kind` (snake_case) to the explorer's `TxType`
 * (PascalCase). Unknown kinds fall through to `Transfer` so the
 * pill renders; the underlying row data still carries the real
 * `details`.
 */
function kindToTxType(kind: string): TxType {
  switch (kind) {
    case "transfer":
      return "Transfer";
    case "register_schema":
      return "RegisterSchema";
    case "register_attestor_set":
      return "RegisterAttestorSet";
    case "submit_attestation":
      return "SubmitAttestation";
    // Unknown / future kinds collapse to Transfer for the pill. The
    // full kind is still visible in the JSON payload viewer.
    default:
      return "Transfer";
  }
}

function outcomeToStatus(outcome: string): TxStatus {
  switch (outcome) {
    case "committed":
      return "SUCCESS";
    case "reverted":
      return "REVERTED";
    default:
      return "PENDING";
  }
}

/**
 * Chain-side gaps surfaced as defaults:
 *
 * - `sender`: chain emits per-tx events, indexer derives sender for
 *   transfer txs. For other tx kinds (currently only `unknown` until
 *   ligate-chain#295 lands), sender is `null`; default empty string.
 * - `gas_used`: indexer doesn't extract from `LedgerTx.receipt.data`
 *   yet. Surfaced as `0`. Follow-up at the api ingest layer.
 * - `nonce`, `fee_paid_nano`: chain elides body from REST (migration
 *   0003); surfaced as `0` / `"0"` until exposed.
 * - `events`: per-tx event list isn't returned by `/v1/txs/{hash}`
 *   yet; surfaced as `[]`. Follow-up could add an `events` join.
 */
function adaptTxResponse(r: ApiTxResponse): Tx {
  return {
    hash: r.hash,
    height: r.block_height,
    block_hash: r.block_hash ?? "",
    sender: r.sender ?? "",
    type: kindToTxType(r.kind),
    status: outcomeToStatus(r.outcome),
    fee_nano: r.fee_paid_nano ?? "0",
    protocol_fee_nano: r.protocol_fee_nano ?? "0",
    // Stash the entire wire shape so the "Raw transaction" section
    // on the tx detail page can render every field, not just the
    // ones the typed Tx interface promotes.
    raw_response: r as unknown as Record<string, unknown>,
    gas_used: 0,
    nonce: r.nonce ?? 0,
    timestamp: rfc3339ToMillis(r.block_timestamp),
    payload: r.details,
    events: [],
  };
}

/**
 * AddressSummary → AddressDetail. The explorer's shape is richer than
 * the indexer surfaces today; gaps documented inline:
 *
 * - `balance_nano`: explorer is single-token; api surfaces an array
 *   per RFC 0002 (today only the gas token is present). Take the
 *   first entry, default to `"0"`.
 * - `first_seen_height` / `first_seen_at`: from the api's nested
 *   `first_seen: {block_height, timestamp}`.
 * - `role` + `*_bond`: derived from sequencer / attester / prover
 *   registries on-chain; not in the indexer's summary. Surfaced as
 *   `null` until a chain-side lookup is wired.
 * - `recent_txs`: `/v1/addresses/{addr}/txs` endpoint isn't shipped
 *   yet (would be a Phase G.2). Surfaced as `[]`.
 */
function adaptAddressSummary(r: ApiAddressSummaryResponse): AddressDetail {
  return {
    address: r.address,
    balance_nano: r.balances[0]?.amount_nano ?? "0",
    tx_count: r.tx_count,
    first_seen_height: r.first_seen?.block_height ?? 0,
    first_seen_at: r.first_seen?.timestamp ?? "",
    role: null,
    sequencer_bond: null,
    attester_bond: null,
    prover_bond: null,
    recent_txs: [],
  };
}

function adaptDripResponse(r: ApiDripResponse): DripResult {
  return {
    tx_hash: r.tx_hash,
    // u128 emitted as JSON number for small amounts; coerce to string
    // for the explorer's wire contract. Loses precision past 2^53,
    // which is well above any drip amount we'd configure.
    amount_nano: String(r.amount_nano),
  };
}

// ---------------------------------------------------------------------------
// Exported fetchers — same signatures as before, real fetches when
// `USE_MOCK_API=false`.
// ---------------------------------------------------------------------------

export async function getInfo(): Promise<ChainInfo> {
  if (useMockApi) return mockData.info;
  // Five fetches in parallel:
  //   - /v1/info                 chain identity + indexer height
  //   - /v1/txs                  recent-tx sample for tps
  //   - /v1/stats/totals         total supply
  //   - /v1/stats/finality       DA-floor settlement breakdown
  //   - /v1/stats/next-block-eta measured rollup block interval
  // Each non-info call has its own catch so one slow / failing source
  // doesn't take the whole header down.
  const [info, txs, totals, finality, nextEta] = await Promise.all([
    fetchJson<ApiInfoResponse>("/v1/info"),
    fetchJson<Page<ApiTxResponse>>("/v1/txs?limit=100").catch(() => ({
      data: [],
      pagination: { next: null, limit: 0 },
    })),
    fetchJson<StatsTotals>("/v1/stats/totals").catch(() => null),
    fetchJson<FinalityStats>("/v1/stats/finality").catch(() => null),
    getNextBlockEta(),
  ]);
  const tps = computeTpsFromTxs(txs.data);
  // The "block_time_ms" the dashboard reads is the rollup's slot
  // production interval, NOT the DA-layer settlement floor. Two
  // sources can give it to us:
  //   1. /v1/stats/next-block-eta.mean_block_interval_secs — measured
  //      from the indexer's slot timestamps (real, ~6s on devnet).
  //   2. /v1/stats/finality.p50_seconds — DA settlement percentile
  //      (~18s on Celestia mocha). Wrong dimension, but a fallback
  //      when the eta endpoint is unreachable or warming up.
  // The eta endpoint wins when present so the BlockTickerCard "Block
  // time" and the dashboard "Block time" tile show the same number.
  const measuredMs =
    nextEta?.mean_block_interval_secs != null
      ? Math.round(nextEta.mean_block_interval_secs * 1000)
      : null;
  const finalityP50Ms =
    finality && Number.isFinite(finality.p50_seconds)
      ? Math.round(finality.p50_seconds * 1000)
      : null;
  const blockTimeMs = measuredMs ?? finalityP50Ms;
  // Source label drives the "(est)" suffix on the strip: 'observed'
  // when we have a real measurement (eta or post-warmup finality),
  // 'estimated' only while the chain is in its first-hour bootstrap.
  const blockTimeSource =
    measuredMs != null ? 'observed' : (finality?.source ?? null);
  const supplyNano = totals?.total_supply_nano ?? fallbackLgtSupplyNano;
  return adaptInfoResponse(
    info,
    tps,
    blockTimeMs,
    supplyNano,
    blockTimeSource,
    finality?.da_layer ?? null,
  );
}

// ---------------------------------------------------------------------------
// New stats endpoints (ligate-api#39)
// ---------------------------------------------------------------------------

export async function getFinalityStats(): Promise<FinalityStats | null> {
  if (useMockApi) {
    return {
      window: "static",
      sampled_count: 0,
      p50_seconds: 12,
      p95_seconds: 15,
      p99_seconds: 15,
      da_layer: "celestia-mocha",
      source: "estimated",
      as_of: new Date().toISOString(),
    };
  }
  try {
    return await fetchJson<FinalityStats>("/v1/stats/finality");
  } catch {
    return null;
  }
}

/**
 * Single endpoint that resolves a search-bar query (block height, hash,
 * address, schema id, attestor-set id, attestation compound id) to a
 * typed `kind`. Server does the prefix detection so the explorer doesn't
 * have to reimplement it client-side. Browser-callable directly via
 * CORS (api responds `access-control-allow-origin: *`).
 */
export async function searchByQuery(q: string): Promise<SearchResult> {
  // The api currently returns `internal error` for some valid-shape
  // queries (e.g. some `lig1...` addresses). Treat any non-2xx as
  // "not found" rather than throwing — the user gets the same UX
  // either way and we don't surface api hiccups in the search bar.
  try {
    const url = `${apiBase}/v1/search?q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { kind: "not_found", query: q };
    const body = (await res.json()) as SearchResult | { error: string };
    if ("kind" in body) return body;
    return { kind: "not_found", query: q };
  } catch {
    return { kind: "not_found", query: q };
  }
}

// ---------------------------------------------------------------------------
// New attestation + attestor-set list endpoints (ligate-api#39)
// ---------------------------------------------------------------------------
//
// Distinct from the older skeletal `Attestation` / `AttestorSet` types:
// the new wire shapes carry nested `submitted_at` / `registered_at`
// (block_height + tx_hash + timestamp) and the `id` compound for
// routing to detail. UI components consume `AttestationItem` /
// `AttestorSetItem` directly; no adapter pass needed.

interface AttestationItemPage {
  data: AttestationItem[];
  pagination: { next: string | null; limit: number };
}

interface AttestorSetItemPage {
  data: AttestorSetItem[];
  pagination: { next: string | null; limit: number };
}

// `opts.live: true` overrides the api's Cache-Control (30s on the
// attestations list) with a 6s revalidation window so the homepage's
// AutoRefresh-driven re-render actually picks up new attestations
// within one polling cycle. Detail pages and the /attestations list
// page leave it unset → they get the full 30s cache benefit.
export async function getAttestationItems(
  cursor?: string,
  limit = 20,
  opts?: { live?: boolean },
): Promise<PageResult<AttestationItem>> {
  if (useMockApi) return { items: [], nextCursor: null };
  const qs = new URLSearchParams({ limit: String(limit) });
  if (cursor) qs.set("before", cursor);
  try {
    const raw = await fetchJson<AttestationItemPage>(
      `/v1/attestations?${qs}`,
      opts?.live ? { next: { revalidate: 6 } } : undefined,
    );
    return { items: raw.data, nextCursor: raw.pagination.next };
  } catch {
    return { items: [], nextCursor: null };
  }
}

export async function getAttestationItem(
  id: string,
): Promise<AttestationItem | null> {
  if (useMockApi) return null;
  try {
    return await fetchJson<AttestationItem>(`/v1/attestations/${id}`);
  } catch {
    return null;
  }
}

// `opts.live: true` overrides the 60s Cache-Control on /v1/attestor-sets
// with a 6s revalidation window — same rationale as
// getAttestationItems. Used by the homepage's attestor-sets card.
export async function getAttestorSetItems(
  cursor?: string,
  limit = 20,
  opts?: { live?: boolean },
): Promise<PageResult<AttestorSetItem>> {
  if (useMockApi) return { items: [], nextCursor: null };
  const qs = new URLSearchParams({ limit: String(limit) });
  if (cursor) qs.set("before", cursor);
  try {
    const raw = await fetchJson<AttestorSetItemPage>(
      `/v1/attestor-sets?${qs}`,
      opts?.live ? { next: { revalidate: 6 } } : undefined,
    );
    return { items: raw.data, nextCursor: raw.pagination.next };
  } catch {
    return { items: [], nextCursor: null };
  }
}

export async function getSchemaAttestations(
  schemaId: string,
  cursor?: string,
  limit = 20,
): Promise<PageResult<AttestationItem>> {
  if (useMockApi) return { items: [], nextCursor: null };
  const qs = new URLSearchParams({ limit: String(limit) });
  if (cursor) qs.set("before", cursor);
  try {
    const raw = await fetchJson<AttestationItemPage>(
      `/v1/schemas/${schemaId}/attestations?${qs}`,
    );
    return { items: raw.data, nextCursor: raw.pagination.next };
  } catch {
    return { items: [], nextCursor: null };
  }
}

export async function getAttestorSetAttestationsList(
  setId: string,
  cursor?: string,
  limit = 20,
): Promise<PageResult<AttestationItem>> {
  if (useMockApi) return { items: [], nextCursor: null };
  const qs = new URLSearchParams({ limit: String(limit) });
  if (cursor) qs.set("before", cursor);
  try {
    const raw = await fetchJson<AttestationItemPage>(
      `/v1/attestor-sets/${setId}/attestations?${qs}`,
    );
    return { items: raw.data, nextCursor: raw.pagination.next };
  } catch {
    return { items: [], nextCursor: null };
  }
}

// ---------------------------------------------------------------------------
// Stats endpoints — server-derived aggregates that the api caches for ~30s.
// Shape mirrors `crates/api/src/stats.rs::*Response` 1-to-1; no adapter
// layer because the explorer's UI is the only consumer and the shapes
// already fit the widgets.
// ---------------------------------------------------------------------------

export async function getStatsTotals(): Promise<StatsTotals> {
  if (useMockApi) {
    return {
      indexed_at_slot: mockData.info.latest_block,
      blocks: mockData.blocks.length,
      txs_total: mockData.txs.length,
      txs_committed: mockData.txs.filter((t) => t.status === "SUCCESS").length,
      addresses: mockData.addresses.length,
      schemas: mockData.schemas.length,
      attestor_sets: mockData.attestorSets?.length ?? 0,
      attestations: mockData.attestations?.length ?? 0,
      // 1B LGT genesis pin — matches the live api now that PR #42
      // landed (supply query was hitting a hex path the chain rejected;
      // switched to bech32m token_…). Keeping the mock in sync so
      // mock-mode renders the same number.
      total_supply_nano: "1000000000000000000",
    };
  }
  return fetchJson<StatsTotals>("/v1/stats/totals");
}

// /v1/stats/next-block-eta — drop-in for the BlockTickerCard live
// countdown. 5s cache TTL on the api side. Cancel-safe: caller
// fetches on mount, then polls every ~10s; the timer between fetches
// runs purely client-side off `expected_next_at`.
export async function getNextBlockEta(): Promise<NextBlockEta | null> {
  if (useMockApi) {
    // Synthetic tick so the BlockTickerCard renders sensibly under
    // mock mode. Pretend the last block landed 3s ago and the next is
    // 9s away (chain runs ~12s slots).
    const now = Date.now();
    const lastTs = new Date(now - 3000).toISOString();
    const expected = new Date(now + 9000).toISOString();
    return {
      last_block_height: mockData.info.latest_block,
      last_block_timestamp: lastTs,
      mean_block_interval_secs: 12,
      p95_block_interval_secs: 14.5,
      expected_next_at: expected,
      seconds_since_last: 3,
      seconds_until_expected: 9,
      indexer_lag_secs: 0,
    };
  }
  try {
    return await fetchJson<NextBlockEta>("/v1/stats/next-block-eta");
  } catch {
    return null;
  }
}

export async function getTxRateDaily(days = 1): Promise<TxRatePoint[]> {
  if (useMockApi) return [];
  try {
    const r = await fetchJson<{ days: number; points: TxRatePoint[] }>(
      `/v1/stats/tx-rate-daily?days=${days}`,
    );
    return r.points;
  } catch {
    return [];
  }
}

// Daily attestation count (ligate-api PR #53). Sparse: days with
// zero attestations are absent from `points`. Caller fills missing
// dates with 0 when building the heatmap. Default 30 days, capped
// server-side at 90.
export async function getAttestationsDaily(
  days = 30,
): Promise<AttestationDailyPoint[]> {
  if (useMockApi) return [];
  try {
    const r = await fetchJson<{ days: number; points: AttestationDailyPoint[] }>(
      `/v1/stats/attestations-daily?days=${days}`,
    );
    return r.points;
  } catch {
    return [];
  }
}

export async function getTopHolders(n = 10): Promise<TopHolder[]> {
  if (useMockApi) return [];
  try {
    const r = await fetchJson<{ source: string; holders: TopHolder[] }>(
      `/v1/stats/top-holders?n=${n}`,
    );
    return r.holders;
  } catch {
    return [];
  }
}

export async function getLatestBlocks(limit = 20): Promise<Block[]> {
  if (useMockApi) return mockData.blocks.slice(0, limit);
  const raw = await fetchJson<Page<ApiBlockResponse>>(
    `/v1/blocks?limit=${limit}`,
  );
  return raw.data.map(adaptBlockResponse);
}

export async function getAllBlocks(): Promise<Block[]> {
  if (useMockApi) return mockData.blocks;
  // Snapshot of the most-recent 100 blocks, used for header stats
  // (avg-tx / fees / max height) on `/blocks` and `/`. Paginated
  // drill-down is `getBlocksPage`.
  const raw = await fetchJson<Page<ApiBlockResponse>>("/v1/blocks?limit=100");
  return raw.data.map(adaptBlockResponse);
}

/**
 * Cursor-paginated `/blocks` list. Forward-only; the explorer relies
 * on browser back for "prev", per RFC 0001.
 *
 * Mock mode: `cursor` is the decimal stringified start index into
 * `mockData.blocks`. Real mode: the chain api's opaque `before` value.
 * The explorer never inspects the cursor; it just round-trips it.
 */
export async function getBlocksPage(
  cursor?: string,
  limit = 25,
): Promise<PageResult<Block>> {
  if (useMockApi) {
    const start = cursor ? Math.max(0, parseInt(cursor, 10) || 0) : 0;
    const items = mockData.blocks.slice(start, start + limit);
    const next = start + limit < mockData.blocks.length
      ? String(start + limit)
      : null;
    return { items, nextCursor: next };
  }
  const qs = new URLSearchParams({ limit: String(limit) });
  if (cursor) qs.set("before", cursor);
  const raw = await fetchJson<Page<ApiBlockResponse>>(`/v1/blocks?${qs}`);
  return {
    items: raw.data.map(adaptBlockResponse),
    nextCursor: raw.pagination.next,
  };
}

export async function getBlock(height: number): Promise<Block | null> {
  if (useMockApi)
    return mockData.blocks.find((b) => b.height === height) ?? null;
  try {
    const raw = await fetchJson<ApiBlockResponse>(`/v1/blocks/${height}`);
    return adaptBlockResponse(raw);
  } catch {
    return null;
  }
}

export async function getLatestTxs(limit = 20): Promise<Tx[]> {
  if (useMockApi) return mockData.txs.slice(0, limit);
  const raw = await fetchJson<Page<ApiTxResponse>>(`/v1/txs?limit=${limit}`);
  return raw.data.map(adaptTxResponse);
}

export async function getAllTxs(): Promise<Tx[]> {
  if (useMockApi) return mockData.txs;
  const raw = await fetchJson<Page<ApiTxResponse>>("/v1/txs?limit=100");
  return raw.data.map(adaptTxResponse);
}

/**
 * Cursor-paginated `/txs` list. Optional `kind` narrows by tx kind
 * (transfer / submit_attestation / register_schema / ...) and survives
 * pagination via the same `kind` query param baked into the next URL.
 *
 * Mock mode honours `kind` against `mockData.txs[*].type` (which uses
 * the explorer's PascalCase) by mapping it back to the wire kind.
 */
export async function getTxsPage(
  cursor?: string,
  limit = 25,
  kind?: string | null,
): Promise<PageResult<Tx>> {
  if (useMockApi) {
    const pool = kind
      ? mockData.txs.filter((t) => wireKindOf(t.type) === kind)
      : mockData.txs;
    const start = cursor ? Math.max(0, parseInt(cursor, 10) || 0) : 0;
    const items = pool.slice(start, start + limit);
    const next = start + limit < pool.length ? String(start + limit) : null;
    return { items, nextCursor: next };
  }
  const qs = new URLSearchParams({ limit: String(limit) });
  if (cursor) qs.set("before", cursor);
  if (kind) qs.set("kind", kind);
  const raw = await fetchJson<Page<ApiTxResponse>>(`/v1/txs?${qs}`);
  return {
    items: raw.data.map(adaptTxResponse),
    nextCursor: raw.pagination.next,
  };
}

/**
 * Map the explorer's PascalCase `TxType` back to the wire snake_case
 * `kind`. Used in mock mode so the kind filter behaves like the real
 * api. `Transfer` covers any unknown wire kind on the way in (see
 * `kindToTxType`); on the way out, treat it as `transfer` and ignore
 * the ambiguity for unknown txs (they're filtered out, which is
 * fine because `Unknown` isn't a user-selectable filter today).
 */
function wireKindOf(t: string): string {
  switch (t) {
    case "Transfer":
      return "transfer";
    case "RegisterSchema":
      return "register_schema";
    case "SubmitAttestation":
      return "submit_attestation";
    default:
      return t.toLowerCase();
  }
}

export async function getTx(hash: string): Promise<Tx | null> {
  if (useMockApi) return mockData.txs.find((t) => t.hash === hash) ?? null;
  try {
    const raw = await fetchJson<ApiTxResponse>(`/v1/txs/${hash}`);
    return adaptTxResponse(raw);
  } catch {
    return null;
  }
}

export async function getTxsForBlock(height: number): Promise<Tx[]> {
  // Server-side block filter (ligate-api PR #45 Tier 1.1). Was a
  // 100-row scan + client-side filter, which silently missed a
  // block's txs when the block was older than the most recent 100
  // chain-wide txs. Now exact: api returns only this block's rows.
  if (useMockApi) return mockData.txs.filter((t) => t.height === height);
  const raw = await fetchJson<Page<ApiTxResponse>>(
    `/v1/txs?block_height=${height}&limit=100`,
  );
  return raw.data.map(adaptTxResponse);
}

/**
 * Adapt RFC 0002 `Schema` body → explorer `Schema` shape.
 *
 * Threshold is on every schema row now (ligate-api PR #52). For list
 * views we just stringify M ("2"); for detail views the caller passes
 * `totalMembers` to render the full "M of N" once the attestor set
 * has been cross-fetched.
 *
 * `description` isn't carried on-chain. Empty string.
 */
function adaptSchemaResponse(
  r: ApiSchemaResponse,
  totalMembers?: number,
): Schema {
  const thresholdStr =
    typeof totalMembers === 'number'
      ? `${r.threshold} of ${totalMembers}`
      : String(r.threshold);
  return {
    schema_id: r.id,
    name: r.name,
    version: r.version,
    owner: r.owner,
    attestor_set_id: r.attestor_set_id,
    threshold: thresholdStr,
    fee_routing_bps: r.fee_routing_bps,
    fee_routing_addr: r.fee_routing_addr ?? "",
    payload_shape_hash: r.payload_shape_hash,
    description: "",
    attestation_count: r.attestation_count,
  };
}

// `opts.live: true` overrides the 60s Cache-Control on /v1/schemas
// with a 6s revalidation window so the homepage Schemas card picks
// up a freshly-registered schema within one polling cycle. The
// /schemas page leaves opts unset → full 60s cache.
export async function getSchemas(opts?: { live?: boolean }): Promise<Schema[]> {
  if (useMockApi) return mockData.schemas;
  const raw = await fetchJson<Page<ApiSchemaResponse>>(
    "/v1/schemas?limit=100",
    opts?.live ? { next: { revalidate: 6 } } : undefined,
  );
  return raw.data.map((s) => adaptSchemaResponse(s));
}

// Schemas bound to a specific attestor set. Uses the
// `?attestor_set_id=X` filter (ligate-api PR #45 Tier 1.2). Threshold
// now ships on each row (ligate-api PR #52), so each schema renders
// "{threshold}" out of the box. The set detail page passes the
// member count if it wants "{threshold} of N" rendering.
export async function getSchemasForSet(
  attestorSetId: string,
): Promise<Schema[]> {
  if (useMockApi) {
    return mockData.schemas.filter(
      (s) => s.attestor_set_id === attestorSetId,
    );
  }
  try {
    const raw = await fetchJson<Page<ApiSchemaResponse>>(
      `/v1/schemas?attestor_set_id=${encodeURIComponent(attestorSetId)}&limit=100`,
    );
    return raw.data.map((s) => adaptSchemaResponse(s));
  } catch {
    return [];
  }
}

export async function getSchema(id: string): Promise<Schema | null> {
  if (useMockApi)
    return mockData.schemas.find((s) => s.schema_id === id) ?? null;
  let raw: ApiSchemaResponse;
  try {
    raw = await fetchJson<ApiSchemaResponse>(`/v1/schemas/${id}`);
  } catch {
    return null;
  }
  // Threshold itself ships on the schema row now (ligate-api PR #52);
  // we only cross-fetch the attestor set to learn the *member count*
  // for the "M of N" denominator. If that lookup fails, fall back to
  // just rendering the M.
  let totalMembers: number | undefined;
  try {
    const set = await fetchJson<ApiAttestorSetResponse>(
      `/v1/attestor-sets/${raw.attestor_set_id}`,
    );
    totalMembers = set.members.length;
  } catch {
    // Transient api hiccup on the set lookup. Detail page still
    // renders with just the threshold M (no denominator).
  }
  return adaptSchemaResponse(raw, totalMembers);
}

// ---------------------------------------------------------------------
// Attestor set detail
//
// `getAttestations`, `getAttestation`, and `getAttestorSets` (plural)
// were deleted in this cleanup round — the new wire shapes shipped in
// ligate-api PR #39 deprecate them and no consumer references them.
// The `AttestationItem` / `AttestorSetItem` fetchers above replace
// them for both list and detail surfaces.
// ---------------------------------------------------------------------

// Detail endpoint returns the same shape as the list endpoint
// (`AttestorSetItem`) per ligate-api#39. The older richer detail
// (with `bound_schemas` + `attestation_count` denormalised onto the
// row) is gone — callers cross-fetch schemas filtered by
// attestor_set_id to recover the bound list, and use the per-set
// attestations endpoint for the count.
export async function getAttestorSet(
  id: string,
): Promise<AttestorSetItem | null> {
  if (useMockApi) {
    const m = mockData.attestorSets.find((s) => s.attestor_set_id === id);
    if (!m) return null;
    return {
      id: m.attestor_set_id,
      members: m.members,
      threshold: m.threshold,
      schema_count: m.schema_count,
      // Mock fixtures don't track a real registered_at — synthesize
      // a sentinel block_height of 0 so the detail page's "registered
      // in #N" copy still has a number to render under USE_MOCK_API.
      registered_at: {
        block_height: 0,
        tx_hash: "",
        timestamp: "",
      },
    };
  }
  try {
    return await fetchJson<AttestorSetItem>(`/v1/attestor-sets/${id}`);
  } catch {
    return null;
  }
}

export async function getAddress(addr: string): Promise<AddressDetail> {
  if (useMockApi) return getMockAddressDetail(addr);
  const raw = await fetchJson<ApiAddressSummaryResponse>(
    `/v1/addresses/${addr}`,
  );
  return adaptAddressSummary(raw);
}

// Paginated address tx history (ligate-api PR #52). Same envelope +
// cursor as /v1/txs. Returns rows where the address is the sender
// (any kind) OR a transfer participant (from / to). Empty address
// returns {data: [], pagination: {next: null}} with 200, not 404.
export async function getAddressTxs(
  addr: string,
  cursor?: string,
  limit = 20,
): Promise<PageResult<Tx>> {
  if (useMockApi) return { items: [], nextCursor: null };
  const qs = new URLSearchParams({ limit: String(limit) });
  if (cursor) qs.set("before", cursor);
  try {
    const raw = await fetchJson<Page<ApiTxResponse>>(
      `/v1/addresses/${encodeURIComponent(addr)}/txs?${qs}`,
    );
    return {
      items: raw.data.map(adaptTxResponse),
      nextCursor: raw.pagination.next,
    };
  } catch {
    return { items: [], nextCursor: null };
  }
}

export async function getDripStatus(addr: string): Promise<DripStatus> {
  // Mock mode keeps the deterministic "fresh address can drip"
  // answer for local development without booting the api. Real mode
  // calls the per-address branch of `/v1/drip/status` (ligate-api#5,
  // shipped 2026-05). The wire shape matches `DripStatus` 1-to-1.
  if (useMockApi) return getMockDripStatus(addr);
  try {
    const raw = await fetchJson<ApiAddressDripStatusResponse>(
      `/v1/drip/status?address=${encodeURIComponent(addr)}`,
    );
    return { can_drip: raw.can_drip, next_drip_at: raw.next_drip_at };
  } catch {
    // Read failure shouldn't block the faucet UI; default to
    // "let them try, the POST /v1/drip path enforces the rate
    // limit canonically anyway". Better UX than a hard-error toast
    // for a transient api hiccup.
    return { can_drip: true, next_drip_at: null };
  }
}

export async function requestDrip(addr: string): Promise<DripResult> {
  if (useMockApi) {
    const hash =
      "ltx1" +
      Array.from(
        { length: 56 },
        () =>
          "qpzry9x8gf2tvdw0s3jn54khce6mua7l"[Math.floor(Math.random() * 32)],
      ).join("");
    return { tx_hash: hash, amount_nano: "100000000000" };
  }
  const raw = await fetchJson<ApiDripResponse>("/v1/drip", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address: addr }),
  });
  return adaptDripResponse(raw);
}
