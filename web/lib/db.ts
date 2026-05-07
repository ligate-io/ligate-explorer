import 'server-only'

import { Pool, type PoolClient } from 'pg'

let pool: Pool | undefined

function getPool(): Pool | undefined {
  if (pool) return pool
  const url = process.env.DATABASE_URL
  if (!url) return undefined
  pool = new Pool({
    connectionString: url,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  })
  pool.on('error', (err) => {
    console.error('postgres pool error', err)
  })
  return pool
}

async function withClient<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T | undefined> {
  const p = getPool()
  if (!p) return undefined
  const client = await p.connect()
  try {
    return await fn(client)
  } finally {
    client.release()
  }
}

export type Block = {
  height: bigint
  tx_count: number
  timestamp: Date
}

export async function getLatestBlocks(limit = 20): Promise<Block[]> {
  const rows = await withClient(async (c) => {
    const result = await c.query<{
      height: string
      tx_count: number
      timestamp: Date
    }>(
      'SELECT height, tx_count, timestamp FROM slots ORDER BY height DESC LIMIT $1',
      [limit],
    )
    return result.rows
  })
  if (!rows) return []
  return rows.map((r) => ({
    height: BigInt(r.height),
    tx_count: r.tx_count,
    timestamp: r.timestamp,
  }))
}

export type ChainInfo = {
  chain_id: string
  chain_hash: string
  version: string
}

export async function getChainInfo(): Promise<ChainInfo | undefined> {
  const rows = await withClient(async (c) => {
    const result = await c.query<{ k: string; v: ChainInfo | string }>(
      "SELECT k, v FROM indexer_state WHERE k IN ('chain_id', 'chain_hash', 'node_version')",
    )
    return result.rows
  })
  if (!rows || rows.length === 0) return undefined

  const map = new Map(rows.map((r) => [r.k, r.v]))
  const chain_id = map.get('chain_id')
  const chain_hash = map.get('chain_hash')
  const version = map.get('node_version')
  if (
    typeof chain_id !== 'string' ||
    typeof chain_hash !== 'string' ||
    typeof version !== 'string'
  ) {
    return undefined
  }
  return { chain_id, chain_hash, version }
}
