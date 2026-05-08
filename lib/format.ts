export function formatRelativeTime(date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date)
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000)

  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 86400 * 7) return `${Math.floor(seconds / 86400)}d ago`
  return d.toISOString().slice(0, 10)
}

export function ago(seconds: number): string {
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export function fmtLgt(nano: bigint | string | number): string {
  const n = typeof nano === 'bigint' ? nano : BigInt(nano)
  const big = n / 1_000_000_000n
  const small = (n % 1_000_000_000n).toString().padStart(9, '0')
  return `${big.toString()}.${small}`
}

export function fmtLgtTrim(nano: bigint | string | number): string {
  const n = typeof nano === 'bigint' ? nano : BigInt(nano)
  const big = n / 1_000_000_000n
  const small = (n % 1_000_000_000n).toString().padStart(9, '0').replace(/0+$/, '')
  return small ? `${big.toString()}.${small}` : big.toString()
}

export function trunc(s: string, head = 6, tail = 4): string {
  if (!s || s.length <= head + tail + 1) return s
  return s.slice(0, head) + '…' + s.slice(-tail)
}

export function shortHash(hash: string, head = 6, tail = 4): string {
  return trunc(hash, head, tail)
}

export function isoDate(timestamp: number): string {
  return new Date(timestamp).toISOString().replace('T', ' ').slice(0, 19) + 'Z'
}
