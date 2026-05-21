import "server-only";

import type {
  AddressDetail,
  AttestationDailyPoint,
  AttestationItem,
  AttestorSetItem,
  Block,
  ChainInfo,
  ClusterTopology,
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

// Per-endpoint cache TTLs in seconds. Mirrors the api's Cache-Control
// max-age values (ligate-api PR #49 Tier 0). Why we re-encode them
// here: Next.js's RSC fetch cache does NOT honor upstream
// Cache-Control headers — it ignores them and uses force-cache by
// default, which freezes responses at build time. The Vercel CDN
// layer DOES honor Cache-Control, but it sits behind the RSC cache,
// so without opting in via `next: { revalidate }` we never reach the
// CDN. Each fetcher passes its endpoint's TTL via the helper below;
// `cache: 'no-store'` opts out entirely for fully dynamic reads
// (drip status, search).
//
// The "live: 6s" override that used to live here is gone — the home
// page no longer SSR-polls via `router.refresh()`. Its live cards
// fetch directly from the browser (see `lib/api-browser.ts` +
// `components/live-cards.tsx`) so the SSR cache TTLs only apply on
// hard navigation now.
const TTL = {
  CLUSTER: 5,
  INFO: 5,
  STATS_TOTALS: 10,
  STATS_FINALITY: 30,
  STATS_NEXT_BLOCK_ETA: 5,
  STATS_DAILY: 60,
  STATS_TOP_HOLDERS: 60,
  BLOCKS_LIST: 5,
  BLOCK_DETAIL: 60,
  TXS_LIST: 5,
  TXS_FOR_BLOCK: 60,
  TX_DETAIL: 300,
  ATTESTATIONS_LIST: 30,
  ATTESTATION_DETAIL: 300,
  ATTESTOR_SETS_LIST: 60,
  ATTESTOR_SET_DETAIL: 60,
  SCHEMAS_LIST: 60,
  SCHEMA_DETAIL: 60,
  ADDRESS_SUMMARY: 30,
  ADDRESS_TXS: 30,
} as const;

/**
 * Build a `next: { revalidate }` init object for `fetchJson`. Pass
 * `undefined` instead if you want `cache: 'no-store'` — see
 * `searchByQuery` / `getDripStatus` for examples.
 */
function ttl(seconds: number): RequestInit {
  return { next: { revalidate: seconds } };
}

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
 * supply, attestor-set state by id, etc. Always no-store so the
 * homepage's per-card pollers see fresh chain state on every hit.
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
  // Celestia DA block height where this slot's first batch landed.
  // Surfaced by chain v0.2.3+ via receipt.da_block_height and threaded
  // through ligate-api PR #63 onto BlockResponse. `null` / absent on
  // slots ingested before this lands; explorer treats absent as
  // "no Celenium link to render".
  da_block_height?: number | null;
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
    // Pass-through: api emits `null` (or omits) when not populated;
    // detail page checks `!= null` before rendering the Celenium link.
    da_block_height: r.da_block_height ?? null,
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
// Exported fetchers. All hit the live api at `apiBase` — there's no
// mock fallback. Was previously gated on a `USE_MOCK_API` env var with
// a 100% synthetic fixture branch, but the two surfaces drifted out of
// sync (mock had no attestations, hardcoded supply, fake heights) and
// the env-var default kept silently dropping dev into mock mode. Now
// dev hits api.ligate.io same as prod; offline UI work is unsupported.
// ---------------------------------------------------------------------------

// Minimal slot wire shape returned by /v1/ledger/slots/latest on the
// chain RPC (rpc.ligate.io). Sov-SDK ledger surface. Used only by
// `getInfo()`'s RPC fallback path — never by the regular api flow.
interface RpcSlotResponse {
  type: 'slot'
  number: number
  hash: string
  state_root: string
  timestamp: number
  finality_status?: string
}

/**
 * Synthesise a ChainInfo from the chain RPC's latest slot when the
 * api is unreachable. RPC is on different infra than the api (Caddy
 * fronting the chain node, vs Railway hosting the api), so it usually
 * stays up when the api dies. Fields the RPC can't tell us
 * (chain_id, chain_hash, tps, supply, da_layer) fall back to env
 * defaults or empty sentinels; the explorer's `ApiHealthBanner`
 * renders the "api unreachable" warning so users know why some
 * fields are blank.
 *
 * Returns null when RPC is ALSO unreachable — the page-level error
 * boundary handles that case.
 */
async function getInfoFromRpcFallback(): Promise<ChainInfo | null> {
  try {
    const slot = await fetchChain<RpcSlotResponse>('/v1/ledger/slots/latest');
    return {
      chain_id: '',
      chain_hash: '',
      version: '',
      latest_block: slot.number,
      tx_per_second: 0,
      finality: fallbackFinality,
      block_time_ms: null,
      rpc_url: rpcBase,
      api_url: apiBase,
      supply_nano: fallbackLgtSupplyNano,
      network_status: 'API unreachable · RPC fallback',
      da_layer: daLayer,
    };
  } catch {
    return null;
  }
}

export async function getInfo(): Promise<ChainInfo> {
  try {
    return await getInfoFromApi();
  } catch {
    const fallback = await getInfoFromRpcFallback();
    if (fallback) return fallback;
    // Both api AND rpc are unreachable. Throw so the page-level error
    // boundary catches it; better to show the error page than render
    // a broken UI built from junk defaults.
    throw new Error('Both api and rpc are unreachable');
  }
}

async function getInfoFromApi(): Promise<ChainInfo> {
  // Five fetches in parallel:
  //   - /v1/info                 chain identity + indexer height
  //   - /v1/txs                  recent-tx sample for tps
  //   - /v1/stats/totals         total supply
  //   - /v1/stats/finality       DA-floor settlement breakdown
  //   - /v1/stats/next-block-eta measured rollup block interval
  // Each non-info call has its own catch so one slow / failing source
  // doesn't take the whole header down.
  const [info, txs, totals, finality, nextEta] = await Promise.all([
    fetchJson<ApiInfoResponse>("/v1/info", ttl(TTL.INFO)),
    fetchJson<Page<ApiTxResponse>>("/v1/txs?limit=100", ttl(TTL.TXS_LIST)).catch(() => ({
      data: [],
      pagination: { next: null, limit: 0 },
    })),
    fetchJson<StatsTotals>("/v1/stats/totals", ttl(TTL.STATS_TOTALS)).catch(() => null),
    fetchJson<FinalityStats>("/v1/stats/finality", ttl(TTL.STATS_FINALITY)).catch(() => null),
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
  try {
    return await fetchJson<FinalityStats>("/v1/stats/finality", ttl(TTL.STATS_FINALITY));
  } catch {
    return null;
  }
}

/**
 * Fetch the live DbElected cluster topology from the api proxy (which
 * fronts the chain's `/v1/cluster/nodes`, stripping VPC addresses + adding
 * a `cluster_health` summary). Returns `null` only if the api itself is
 * unreachable; partial / degraded clusters surface as `cluster_health:
 * 'unknown' | 'degraded' | 'leaderless'` and the caller renders them.
 *
 * Cache matches the api's own TTL so we don't waste a server-side hop.
 */
export async function getClusterTopology(): Promise<ClusterTopology | null> {
  try {
    return await fetchJson<ClusterTopology>("/v1/cluster/nodes", ttl(TTL.CLUSTER));
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
  // Mirrors the inline `searchFromBrowser` in components/header.tsx
  // for the rare server-side caller. Distinguishes `error` (api hiccup
  // — query may still be valid) from `not_found` (definitive miss).
  let res: Response;
  try {
    res = await fetch(
      `${apiBase}/v1/search?q=${encodeURIComponent(q)}`,
      { cache: "no-store" },
    );
  } catch {
    return { kind: "error", message: "Search unavailable: api unreachable." };
  }
  if (!res.ok) {
    return {
      kind: "error",
      message: `Search unavailable: api returned ${res.status}.`,
    };
  }
  let body: SearchResult | { error: string };
  try {
    body = (await res.json()) as SearchResult | { error: string };
  } catch {
    return { kind: "error", message: "Search unavailable: malformed response." };
  }
  if ("kind" in body) return body;
  if ("error" in body) {
    return { kind: "error", message: `Search unavailable: ${body.error}.` };
  }
  return { kind: "not_found", query: q };
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

// Server-side fetcher for /v1/attestations. Used for hard navigation
// to the /attestations list page (which paginates) and for the home
// page's first paint of the live attestations card — once the home
// page hydrates, the card fetches directly from the browser via
// `fetchAttestationsFromBrowser` and the SSR cache TTL stops mattering.
export async function getAttestationItems(
  cursor?: string,
  limit = 20,
): Promise<PageResult<AttestationItem>> {
  const qs = new URLSearchParams({ limit: String(limit) });
  if (cursor) qs.set("before", cursor);
  try {
    const raw = await fetchJson<AttestationItemPage>(
      `/v1/attestations?${qs}`,
      ttl(TTL.ATTESTATIONS_LIST),
    );
    return { items: raw.data, nextCursor: raw.pagination.next };
  } catch {
    return { items: [], nextCursor: null };
  }
}

export async function getAttestationItem(
  id: string,
): Promise<AttestationItem | null> {
  try {
    return await fetchJson<AttestationItem>(
      `/v1/attestations/${id}`,
      ttl(TTL.ATTESTATION_DETAIL),
    );
  } catch {
    return null;
  }
}

// Server-side fetcher for /v1/attestor-sets. SSR-only — the homepage's
// attestor-sets card is static (sets change rarely), so there's no
// browser-side poller mirror for this endpoint today.
export async function getAttestorSetItems(
  cursor?: string,
  limit = 20,
): Promise<PageResult<AttestorSetItem>> {
  const qs = new URLSearchParams({ limit: String(limit) });
  if (cursor) qs.set("before", cursor);
  try {
    const raw = await fetchJson<AttestorSetItemPage>(
      `/v1/attestor-sets?${qs}`,
      ttl(TTL.ATTESTOR_SETS_LIST),
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
  const qs = new URLSearchParams({ limit: String(limit) });
  if (cursor) qs.set("before", cursor);
  try {
    const raw = await fetchJson<AttestationItemPage>(
      `/v1/schemas/${schemaId}/attestations?${qs}`,
      ttl(TTL.ATTESTATIONS_LIST),
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
  const qs = new URLSearchParams({ limit: String(limit) });
  if (cursor) qs.set("before", cursor);
  try {
    const raw = await fetchJson<AttestationItemPage>(
      `/v1/attestor-sets/${setId}/attestations?${qs}`,
      ttl(TTL.ATTESTATIONS_LIST),
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

export async function getStatsTotals(): Promise<StatsTotals | null> {
  // Most call sites already wrap in `.catch(() => null)`, but a few
  // don't. Catching at the fetcher level so the page tree doesn't
  // crash when the api is down and the call wasn't defensively wrapped.
  try {
    return await fetchJson<StatsTotals>("/v1/stats/totals", ttl(TTL.STATS_TOTALS));
  } catch {
    return null;
  }
}

// /v1/stats/next-block-eta — drop-in for the BlockTickerCard live
// countdown. 5s cache TTL on the api side. Cancel-safe: caller
// fetches on mount, then polls every ~10s; the timer between fetches
// runs purely client-side off `expected_next_at`.
export async function getNextBlockEta(): Promise<NextBlockEta | null> {
  try {
    return await fetchJson<NextBlockEta>(
      "/v1/stats/next-block-eta",
      ttl(TTL.STATS_NEXT_BLOCK_ETA),
    );
  } catch {
    return null;
  }
}

export async function getTxRateDaily(days = 1): Promise<TxRatePoint[]> {
  try {
    const r = await fetchJson<{ days: number; points: TxRatePoint[] }>(
      `/v1/stats/tx-rate-daily?days=${days}`,
      ttl(TTL.STATS_DAILY),
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
  try {
    const r = await fetchJson<{ days: number; points: AttestationDailyPoint[] }>(
      `/v1/stats/attestations-daily?days=${days}`,
      ttl(TTL.STATS_DAILY),
    );
    return r.points;
  } catch {
    return [];
  }
}

export async function getTopHolders(n = 10): Promise<TopHolder[]> {
  try {
    const r = await fetchJson<{ source: string; holders: TopHolder[] }>(
      `/v1/stats/top-holders?n=${n}`,
      ttl(TTL.STATS_TOP_HOLDERS),
    );
    return r.holders;
  } catch {
    return [];
  }
}

export async function getLatestBlocks(limit = 20): Promise<Block[]> {
  try {
    const raw = await fetchJson<Page<ApiBlockResponse>>(
      `/v1/blocks?limit=${limit}`,
      ttl(TTL.BLOCKS_LIST),
    );
    return raw.data.map(adaptBlockResponse);
  } catch {
    // API unreachable. Return empty so the calling page renders an
    // empty state instead of crashing; the global ApiHealthBanner
    // (see components/api-health-banner.tsx) tells the user why.
    return [];
  }
}

export async function getAllBlocks(): Promise<Block[]> {
  // Snapshot of the most-recent 100 blocks, used for header stats
  // (avg-tx / fees / max height) on `/blocks` and `/`. Paginated
  // drill-down is `getBlocksPage`.
  try {
    const raw = await fetchJson<Page<ApiBlockResponse>>(
      "/v1/blocks?limit=100",
      ttl(TTL.BLOCKS_LIST),
    );
    return raw.data.map(adaptBlockResponse);
  } catch {
    return [];
  }
}

/**
 * Cursor-paginated `/blocks` list. Forward-only; the explorer relies
 * on browser back for "prev", per RFC 0001. The cursor is the chain
 * api's opaque `before` value, round-tripped without inspection.
 */
export async function getBlocksPage(
  cursor?: string,
  limit = 25,
): Promise<PageResult<Block>> {
  const qs = new URLSearchParams({ limit: String(limit) });
  if (cursor) qs.set("before", cursor);
  try {
    const raw = await fetchJson<Page<ApiBlockResponse>>(
      `/v1/blocks?${qs}`,
      ttl(TTL.BLOCKS_LIST),
    );
    return {
      items: raw.data.map(adaptBlockResponse),
      nextCursor: raw.pagination.next,
    };
  } catch {
    return { items: [], nextCursor: null };
  }
}

export async function getBlock(height: number): Promise<Block | null> {
  try {
    const raw = await fetchJson<ApiBlockResponse>(
      `/v1/blocks/${height}`,
      ttl(TTL.BLOCK_DETAIL),
    );
    return adaptBlockResponse(raw);
  } catch {
    return null;
  }
}

export async function getLatestTxs(limit = 20): Promise<Tx[]> {
  try {
    const raw = await fetchJson<Page<ApiTxResponse>>(
      `/v1/txs?limit=${limit}`,
      ttl(TTL.TXS_LIST),
    );
    return raw.data.map(adaptTxResponse);
  } catch {
    return [];
  }
}

export async function getAllTxs(): Promise<Tx[]> {
  try {
    const raw = await fetchJson<Page<ApiTxResponse>>(
      "/v1/txs?limit=100",
      ttl(TTL.TXS_LIST),
    );
    return raw.data.map(adaptTxResponse);
  } catch {
    return [];
  }
}

/**
 * Cursor-paginated `/txs` list. Optional `kind` narrows by tx kind
 * (transfer / submit_attestation / register_schema / ...) and survives
 * pagination via the same `kind` query param baked into the next URL.
 */
export async function getTxsPage(
  cursor?: string,
  limit = 25,
  kind?: string | null,
): Promise<PageResult<Tx>> {
  const qs = new URLSearchParams({ limit: String(limit) });
  if (cursor) qs.set("before", cursor);
  if (kind) qs.set("kind", kind);
  try {
    const raw = await fetchJson<Page<ApiTxResponse>>(`/v1/txs?${qs}`, ttl(TTL.TXS_LIST));
    return {
      items: raw.data.map(adaptTxResponse),
      nextCursor: raw.pagination.next,
    };
  } catch {
    return { items: [], nextCursor: null };
  }
}

export async function getTx(hash: string): Promise<Tx | null> {
  try {
    const raw = await fetchJson<ApiTxResponse>(`/v1/txs/${hash}`, ttl(TTL.TX_DETAIL));
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
  try {
    const raw = await fetchJson<Page<ApiTxResponse>>(
      `/v1/txs?block_height=${height}&limit=100`,
      ttl(TTL.TXS_FOR_BLOCK),
    );
    return raw.data.map(adaptTxResponse);
  } catch {
    return [];
  }
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

// Server-side fetcher for /v1/schemas. Used for the /schemas list
// page and for the home page's first paint — after hydration the
// home page's schemas card polls directly from the browser via
// `fetchSchemasFromBrowser`.
export async function getSchemas(): Promise<Schema[]> {
  try {
    const raw = await fetchJson<Page<ApiSchemaResponse>>(
      "/v1/schemas?limit=100",
      ttl(TTL.SCHEMAS_LIST),
    );
    return raw.data.map((s) => adaptSchemaResponse(s));
  } catch {
    return [];
  }
}

// Schemas bound to a specific attestor set. Uses the
// `?attestor_set_id=X` filter (ligate-api PR #45 Tier 1.2). Threshold
// now ships on each row (ligate-api PR #52), so each schema renders
// "{threshold}" out of the box. The set detail page passes the
// member count if it wants "{threshold} of N" rendering.
export async function getSchemasForSet(
  attestorSetId: string,
): Promise<Schema[]> {
  try {
    const raw = await fetchJson<Page<ApiSchemaResponse>>(
      `/v1/schemas?attestor_set_id=${encodeURIComponent(attestorSetId)}&limit=100`,
      ttl(TTL.SCHEMAS_LIST),
    );
    return raw.data.map((s) => adaptSchemaResponse(s));
  } catch {
    return [];
  }
}

export async function getSchema(id: string): Promise<Schema | null> {
  let raw: ApiSchemaResponse;
  try {
    raw = await fetchJson<ApiSchemaResponse>(
      `/v1/schemas/${id}`,
      ttl(TTL.SCHEMA_DETAIL),
    );
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
      ttl(TTL.ATTESTOR_SET_DETAIL),
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
  try {
    return await fetchJson<AttestorSetItem>(
      `/v1/attestor-sets/${id}`,
      ttl(TTL.ATTESTOR_SET_DETAIL),
    );
  } catch {
    return null;
  }
}

export async function getAddress(addr: string): Promise<AddressDetail> {
  try {
    const raw = await fetchJson<ApiAddressSummaryResponse>(
      `/v1/addresses/${addr}`,
      ttl(TTL.ADDRESS_SUMMARY),
    );
    return adaptAddressSummary(raw);
  } catch {
    // Synthesize an empty detail so /address/[addr] still renders
    // chrome + "no activity yet" empty state when api is down.
    return {
      address: addr,
      balance_nano: "0",
      tx_count: 0,
      first_seen_height: 0,
      first_seen_at: "",
      role: null,
      sequencer_bond: null,
      attester_bond: null,
      prover_bond: null,
      recent_txs: [],
    };
  }
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
  const qs = new URLSearchParams({ limit: String(limit) });
  if (cursor) qs.set("before", cursor);
  try {
    const raw = await fetchJson<Page<ApiTxResponse>>(
      `/v1/addresses/${encodeURIComponent(addr)}/txs?${qs}`,
      ttl(TTL.ADDRESS_TXS),
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
  // Calls the per-address branch of `/v1/drip/status` (ligate-api#5,
  // shipped 2026-05). The wire shape matches `DripStatus` 1-to-1.
  try {
    // Drip throttle state is user-specific and time-sensitive — no
    // caching. Same reason searchByQuery uses no-store.
    const raw = await fetchJson<ApiAddressDripStatusResponse>(
      `/v1/drip/status?address=${encodeURIComponent(addr)}`,
      { cache: "no-store" },
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
  const raw = await fetchJson<ApiDripResponse>("/v1/drip", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address: addr }),
  });
  return adaptDripResponse(raw);
}
