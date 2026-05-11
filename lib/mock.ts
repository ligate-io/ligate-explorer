// Typed mock fixtures for the explorer. Mirrors the API contract in
// lib/api.ts so we can iterate on the UI without a live backend.
//
// Numbers and shapes are deliberately representative of the eventual
// devnet state, not literal — when api.ligate.io is wired up the same
// shapes flow through unchanged.

import 'server-only'

import type {
  Address,
  AddressDetail,
  Block,
  ChainInfo,
  DripStatus,
  Schema,
  Tx,
  TxType,
} from './api-types'

const NOW = Date.now()
const TX_TYPES: TxType[] = [
  'SubmitAttestation',
  'RegisterSchema',
  'Transfer',
  'BondSequencer',
  'SubmitProof',
]
const STATUSES = [
  'SUCCESS',
  'SUCCESS',
  'SUCCESS',
  'SUCCESS',
  'SUCCESS',
  'REVERTED',
  'PENDING',
] as const

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}
const r = rng(42)

function hex(len: number): string {
  const c = '0123456789abcdef'
  let s = ''
  for (let i = 0; i < len; i++) s += c[Math.floor(r() * 16)]
  return s
}

function bech(prefix: string, len: number): string {
  const c = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l'
  let s = prefix
  for (let i = 0; i < len; i++) s += c[Math.floor(r() * c.length)]
  return s
}

const ADDRESSES: Address[] = []
for (let i = 0; i < 30; i++) {
  ADDRESSES.push({
    address: 'lig1' + bech('', 38),
    role: i === 2 ? 'sequencer' : i === 5 ? 'attester' : i === 9 ? 'prover' : null,
  })
}

const LATEST_HEIGHT = 1247
const BLOCKS: Block[] = []
for (let i = 0; i < 36; i++) {
  const height = LATEST_HEIGHT - i
  const tx_count = 2 + Math.floor(r() * 8)
  BLOCKS.push({
    height,
    hash: 'lblk1' + bech('', 58),
    prev_hash: 'lblk1' + bech('', 58),
    timestamp: NOW - i * 6000 - Math.floor(r() * 2000),
    tx_count,
    proposer: ADDRESSES[Math.floor(r() * 4)].address,
    fees_total_nano: ((45000 + Math.floor(r() * 20000)) * tx_count).toString(),
  })
}

const TXS: Tx[] = []
for (let i = 0; i < 60; i++) {
  const block = BLOCKS[Math.floor(r() * 10)]
  const sender = ADDRESSES[Math.floor(r() * ADDRESSES.length)]
  const type = TX_TYPES[Math.floor(r() * TX_TYPES.length)]
  const status = STATUSES[Math.floor(r() * STATUSES.length)]

  const payload =
    type === 'SubmitAttestation'
      ? {
          schema_id: 'lsc1' + bech('', 36),
          payload_hash: '0x' + hex(64),
          attestor_set: 'attset_2of3_v1',
          signatures: [
            { signer: 'lig1' + bech('', 38), sig: '0x' + hex(128) },
            { signer: 'lig1' + bech('', 38), sig: '0x' + hex(128) },
          ],
          observed_at: new Date(block.timestamp - 4000).toISOString(),
        }
      : type === 'RegisterSchema'
        ? {
            schema_id: 'lsc1' + bech('', 36),
            name: 'themisra.proof-of-prompt',
            version: 1,
            threshold: '2 of 3',
            payload_shape_hash: '0x' + hex(64),
          }
        : type === 'Transfer'
          ? {
              to: 'lig1' + bech('', 38),
              amount_nano: (
                100_000_000_000 + Math.floor(r() * 5_000_000_000_000)
              ).toString(),
            }
          : type === 'BondSequencer'
            ? {
                sequencer: 'lig1' + bech('', 38),
                bond_nano: '10000000000000',
              }
            : {
                proof_root: '0x' + hex(64),
                span_blocks: [block.height - 5, block.height],
              }

  TXS.push({
    hash: 'ltx1' + bech('', 59),
    height: block.height,
    block_hash: block.hash,
    sender: sender.address,
    type,
    status,
    fee_nano: (30000 + Math.floor(r() * 70000)).toString(),
    gas_used: 21000 + Math.floor(r() * 80000),
    nonce: Math.floor(r() * 200),
    timestamp: block.timestamp + Math.floor(r() * 3000),
    payload,
    events: [
      {
        index: 0,
        module: 'attestation',
        type: 'AttestationSubmitted',
        preview: '{schema:"lsc1...", payload_hash:"0x..."}',
      },
      {
        index: 1,
        module: 'fee',
        type: 'FeeRouted',
        preview: '{to:"lig1...", amount:"0.00012"}',
      },
    ],
  })
}
TXS.sort((a, b) => b.timestamp - a.timestamp)

const SCHEMAS: Schema[] = [
  {
    schema_id: 'lsc1' + bech('', 36),
    name: 'themisra.proof-of-prompt',
    version: 1,
    owner: ADDRESSES[3].address,
    attestor_set_id: 'attset_2of3_v1',
    threshold: '2 of 3',
    fee_routing_bps: 250,
    fee_routing_addr: ADDRESSES[3].address,
    payload_shape_hash: '0x' + hex(64),
    description:
      'AI prompt and response receipts with signed observation windows.',
    attestation_count: 4128,
    recent_attestations: [],
  },
  {
    schema_id: 'lsc1' + bech('', 36),
    name: 'inkbeam.delivery-receipt',
    version: 2,
    owner: ADDRESSES[7].address,
    attestor_set_id: 'attset_3of5_v0',
    threshold: '3 of 5',
    fee_routing_bps: 100,
    fee_routing_addr: 'none',
    payload_shape_hash: '0x' + hex(64),
    description: 'Carrier-signed parcel delivery confirmations.',
    attestation_count: 612,
    recent_attestations: [],
  },
  {
    schema_id: 'lsc1' + bech('', 36),
    name: 'observa.weather-station',
    version: 1,
    owner: ADDRESSES[12].address,
    attestor_set_id: 'attset_1of1_v0',
    threshold: '1 of 1',
    fee_routing_bps: 0,
    fee_routing_addr: 'none',
    payload_shape_hash: '0x' + hex(64),
    description:
      'Hourly weather telemetry from registered ground stations.',
    attestation_count: 27890,
    recent_attestations: [],
  },
  {
    schema_id: 'lsc1' + bech('', 36),
    name: 'rosetta.kyc-attest',
    version: 3,
    owner: ADDRESSES[15].address,
    attestor_set_id: 'attset_2of3_v1',
    threshold: '2 of 3',
    fee_routing_bps: 500,
    fee_routing_addr: ADDRESSES[15].address,
    payload_shape_hash: '0x' + hex(64),
    description: 'Selective-disclosure identity attestations.',
    attestation_count: 884,
    recent_attestations: [],
  },
  {
    schema_id: 'lsc1' + bech('', 36),
    name: 'meridian.spot-fix',
    version: 1,
    owner: ADDRESSES[20].address,
    attestor_set_id: 'attset_1of1_v0',
    threshold: '1 of 1',
    fee_routing_bps: 50,
    fee_routing_addr: 'none',
    payload_shape_hash: '0x' + hex(64),
    description: 'GNSS position fixes with signed device attestation.',
    attestation_count: 11203,
    recent_attestations: [],
  },
]

for (const s of SCHEMAS) {
  for (let i = 0; i < 8; i++) {
    s.recent_attestations.push({
      submitter: ADDRESSES[Math.floor(r() * ADDRESSES.length)].address,
      payload_hash: '0x' + hex(64),
      timestamp: NOW - Math.floor(r() * 600_000),
      block_height: LATEST_HEIGHT - Math.floor(r() * 30),
    })
  }
}

const CHAIN_INFO: ChainInfo = {
  chain_id: 'ligate-devnet-1',
  chain_hash: 'lsch1' + bech('', 58),
  version: 'ligate-node v0.4.2-rc.1',
  latest_block: LATEST_HEIGHT,
  tx_per_second: 2.4,
  finality: '~12s',
  rpc_url: 'https://rpc.devnet.ligate.io',
  api_url: 'https://api.devnet.ligate.io',
  supply_nano: '100000000000000000',
  network_status: 'Synced',
  da_layer: 'celestia (mocha-4)',
}

export const mockData = {
  blocks: BLOCKS,
  txs: TXS,
  schemas: SCHEMAS,
  addresses: ADDRESSES,
  info: CHAIN_INFO,
}

export function getMockAddressDetail(addr: string): AddressDetail {
  const found = ADDRESSES.find((a) => a.address === addr)
  const role = found?.role ?? null
  const senderTxs = TXS.filter((t) => t.sender === addr).slice(0, 12)
  const recent_txs = senderTxs.length ? senderTxs : TXS.slice(0, 8)

  const seedRng = rng(addr.length * 7 + 17)
  const balance_nano = (
    50_000_000_000 + Math.floor(seedRng() * 5_000_000_000_000)
  ).toString()

  return {
    address: addr,
    balance_nano,
    tx_count: senderTxs.length + Math.floor(seedRng() * 80),
    first_seen_height: 1 + Math.floor(seedRng() * 200),
    first_seen_at: new Date(NOW - 86_400_000 * 18).toISOString().slice(0, 10),
    role,
    sequencer_bond: role === 'sequencer' ? '10000000000000' : null,
    attester_bond: role === 'attester' ? '5000000000000' : null,
    prover_bond: role === 'prover' ? '8000000000000' : null,
    recent_txs,
  }
}

export function getMockDripStatus(_addr: string): DripStatus {
  return { can_drip: true, next_drip_at: null }
}
