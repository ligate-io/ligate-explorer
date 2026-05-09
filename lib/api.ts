import 'server-only'

import {
  getMockAddressDetail,
  getMockDripStatus,
  mockData,
} from './mock'
import type {
  AddressDetail,
  Block,
  ChainInfo,
  DripResult,
  DripStatus,
  Schema,
  Tx,
} from './api-types'

const useMockApi = process.env.USE_MOCK_API !== 'false'
const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.ligate.io'

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, { cache: 'no-store', ...init })
  if (!res.ok) {
    throw new Error(`API ${path} returned ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function getInfo(): Promise<ChainInfo> {
  if (useMockApi) return mockData.info
  return fetchJson<ChainInfo>('/v1/info')
}

export async function getLatestBlocks(limit = 20): Promise<Block[]> {
  if (useMockApi) return mockData.blocks.slice(0, limit)
  return fetchJson<Block[]>(`/v1/blocks?limit=${limit}`)
}

export async function getAllBlocks(): Promise<Block[]> {
  if (useMockApi) return mockData.blocks
  return fetchJson<Block[]>('/v1/blocks?limit=200')
}

export async function getBlock(height: number): Promise<Block | null> {
  if (useMockApi) return mockData.blocks.find((b) => b.height === height) ?? null
  try {
    return await fetchJson<Block>(`/v1/blocks/${height}`)
  } catch {
    return null
  }
}

export async function getLatestTxs(limit = 20): Promise<Tx[]> {
  if (useMockApi) return mockData.txs.slice(0, limit)
  return fetchJson<Tx[]>(`/v1/txs?limit=${limit}`)
}

export async function getAllTxs(): Promise<Tx[]> {
  if (useMockApi) return mockData.txs
  return fetchJson<Tx[]>('/v1/txs?limit=500')
}

export async function getTx(hash: string): Promise<Tx | null> {
  if (useMockApi) return mockData.txs.find((t) => t.hash === hash) ?? null
  try {
    return await fetchJson<Tx>(`/v1/txs/${hash}`)
  } catch {
    return null
  }
}

export async function getTxsForBlock(height: number): Promise<Tx[]> {
  if (useMockApi) return mockData.txs.filter((t) => t.height === height)
  return fetchJson<Tx[]>(`/v1/blocks/${height}/txs`)
}

export async function getSchemas(): Promise<Schema[]> {
  if (useMockApi) return mockData.schemas
  return fetchJson<Schema[]>('/v1/schemas?limit=100')
}

export async function getSchema(id: string): Promise<Schema | null> {
  if (useMockApi) return mockData.schemas.find((s) => s.schema_id === id) ?? null
  try {
    return await fetchJson<Schema>(`/v1/schemas/${id}`)
  } catch {
    return null
  }
}

export async function getAddress(addr: string): Promise<AddressDetail> {
  if (useMockApi) return getMockAddressDetail(addr)
  return fetchJson<AddressDetail>(`/v1/addresses/${addr}`)
}

export async function getDripStatus(addr: string): Promise<DripStatus> {
  if (useMockApi) return getMockDripStatus(addr)
  return fetchJson<DripStatus>(
    `/v1/drip/status?address=${encodeURIComponent(addr)}`
  )
}

export async function requestDrip(addr: string): Promise<DripResult> {
  if (useMockApi) {
    const hash =
      '0x' +
      Array.from({ length: 64 }, () =>
        '0123456789abcdef'[Math.floor(Math.random() * 16)]
      ).join('')
    return { tx_hash: hash, amount_nano: '100000000000' }
  }
  return fetchJson<DripResult>('/v1/drip', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ address: addr }),
  })
}
