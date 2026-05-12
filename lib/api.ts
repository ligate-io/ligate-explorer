import "server-only";

import { getMockAddressDetail, getMockDripStatus, mockData } from "./mock";
import type {
  AddressDetail,
  Block,
  ChainInfo,
  DripResult,
  DripStatus,
  Schema,
  Tx,
  TxStatus,
  TxType,
} from "./api-types";

const useMockApi = process.env.USE_MOCK_API !== "false";
const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "https://api.ligate.io";

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, { cache: "no-store", ...init });
  if (!res.ok) {
    throw new Error(`API ${path} returned ${res.status}`);
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
  parent_hash: string | null;
  state_root: string | null;
  // RFC3339 with milliseconds, e.g. `"2026-05-11T19:30:56.952Z"`.
  timestamp: string;
  tx_count: number;
  batch_count: number;
  // Chain doesn't expose these in v0 (no leader rotation yet, no slot
  // size accounting); reserved per RFC 0002's "always present, null
  // if absent" rule.
  proposer: string | null;
  size_bytes: number | null;
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
  // `"transfer" | "register_attestor_set" | "register_schema" |
  //  "submit_attestation" | "unknown"`
  kind: string;
  details: Record<string, unknown>;
  // `"committed" | "reverted"`. Skipped txs aren't indexed.
  outcome: string;
  revert_reason: string | null;
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

// ---------------------------------------------------------------------------
// Adapters — wire shape → explorer UI shape
// ---------------------------------------------------------------------------

/**
 * Three fields don't have a direct chain source today:
 *
 * - `tx_per_second`: rolling-window counter; api follow-up.
 * - `finality`: hardcoded to `instant` (MockDa devnet target). Real
 *   Celestia DA will surface this dynamically.
 * - `supply_nano`: total LGT supply; would need a `bank.token_supply`
 *   query at the api layer.
 *
 * `rpc_url` is left empty for the explorer page to fill from its own
 * env (it knows its target better than the api does).
 */
function adaptInfoResponse(r: ApiInfoResponse): ChainInfo {
  return {
    chain_id: r.chain_id,
    chain_hash: r.chain_hash,
    version: r.version,
    latest_block: r.indexer_height ?? 0,
    tx_per_second: 0,
    finality: "instant",
    rpc_url: "",
    api_url: apiBase,
    supply_nano: "0",
    network_status: "live",
    da_layer: "MockDa",
  };
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
 * Two chain-side gaps the api echoes through as `null`:
 *
 * - `parent_hash`: chain returns `null` for genesis and currently for
 *   non-genesis too (slot summary doesn't expose it on REST). The UI
 *   renders a truncated hash; empty string keeps it from crashing.
 * - `proposer`: leader rotation isn't shipped (ligate-chain#82);
 *   surfaced as `"unknown"` so the UI's link target is non-empty.
 *
 * `fees_total_nano` isn't tracked at the slot level by the chain; we
 * surface `"0"`. A follow-up can sum `transactions.fee_paid_nano` per
 * slot at the indexer write site.
 */
function adaptBlockResponse(r: ApiBlockResponse): Block {
  return {
    height: r.height,
    hash: r.hash,
    prev_hash: r.parent_hash ?? "",
    timestamp: rfc3339ToMillis(r.timestamp),
    tx_count: r.tx_count,
    proposer: r.proposer ?? "unknown",
    fees_total_nano: "0",
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
    case "submit_attestation":
      return "SubmitAttestation";
    // Forward-compat: register_attestor_set, unknown, future kinds
    // collapse to Transfer for the pill. The full kind is still
    // visible in the JSON payload viewer.
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
  const raw = await fetchJson<ApiInfoResponse>("/v1/info");
  return adaptInfoResponse(raw);
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
  // `limit=200` keeps the homepage / `/blocks` page on a single page.
  // True pagination drilling lives in a future cursor-aware page.
  const raw = await fetchJson<Page<ApiBlockResponse>>("/v1/blocks?limit=100");
  return raw.data.map(adaptBlockResponse);
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
  // No `/v1/blocks/{height}/txs` endpoint on the api today. Filter
  // the recent-txs page client-side; works for small chain history
  // (devnet). A future endpoint at the api adds a direct join.
  if (useMockApi) return mockData.txs.filter((t) => t.height === height);
  const raw = await fetchJson<Page<ApiTxResponse>>("/v1/txs?limit=100");
  return raw.data.filter((t) => t.block_height === height).map(adaptTxResponse);
}

export async function getSchemas(): Promise<Schema[]> {
  // `/v1/schemas` is still 501 on the api (Phase E, blocked on
  // ligate-chain#295). Surface the empty mock list as `[]` against
  // a live api so the page renders without crashing.
  if (useMockApi) return mockData.schemas;
  return [];
}

export async function getSchema(id: string): Promise<Schema | null> {
  if (useMockApi)
    return mockData.schemas.find((s) => s.schema_id === id) ?? null;
  // Same blocker as `getSchemas`. Returns null so the page 404s
  // gracefully.
  return null;
}

export async function getAddress(addr: string): Promise<AddressDetail> {
  if (useMockApi) return getMockAddressDetail(addr);
  const raw = await fetchJson<ApiAddressSummaryResponse>(
    `/v1/addresses/${addr}`,
  );
  return adaptAddressSummary(raw);
}

export async function getDripStatus(addr: string): Promise<DripStatus> {
  // The api's `/v1/drip/status` is a GLOBAL config endpoint
  // (`drip_amount_nano`, `rate_limit_secs`, `addresses_dripped`), not
  // a per-address rate-limit state. The explorer's faucet UI expects
  // per-address `{can_drip, next_drip_at}`. Until the api ships a
  // per-address endpoint, keep the per-address answer on mock — it
  // reads as "yes you can drip" which matches reality at a fresh
  // address.
  return getMockDripStatus(addr);
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
