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
  prev_hash: string
  timestamp: number
  tx_count: number
  proposer: string
  fees_total_nano: string
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
  fee_nano: string
  gas_used: number
  nonce: number
  timestamp: number
  payload: Record<string, unknown>
  events: TxEvent[]
}

export interface SchemaAttestation {
  submitter: string
  payload_hash: string
  timestamp: number
  block_height: number
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
  recent_attestations: SchemaAttestation[]
}

// A single attestation: the chain's core object. Identified by a
// `lat1…` id; binds a payload hash to the schema it was submitted
// under and the attestor set whose threshold signed it.
export interface Attestation {
  attestation_id: string
  schema_id: string
  schema_name: string
  attestor_set_id: string
  submitter: string
  payload_hash: string
  signature_count: number
  threshold: string
  block_height: number
  tx_hash: string
  timestamp: number
}

// A registered attestor set: `las1…` id, the member pubkeys, the
// signing threshold, and the schemas bound to it.
export interface AttestorSet {
  attestor_set_id: string
  members: string[]
  threshold: number
  schema_count: number
  attestation_count: number
  registered_block: number
  bound_schemas: { schema_id: string; name: string; version: number }[]
}

export interface ChainInfo {
  chain_id: string
  chain_hash: string
  version: string
  latest_block: number
  tx_per_second: number
  finality: string
  rpc_url: string
  api_url: string
  supply_nano: string
  network_status: string
  da_layer: string
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
