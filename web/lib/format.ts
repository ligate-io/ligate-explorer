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

export function formatLgt(nanos: bigint | string | number): string {
  const n = typeof nanos === 'bigint' ? nanos : BigInt(nanos)
  const whole = n / 1_000_000_000n
  const frac = n % 1_000_000_000n
  if (frac === 0n) return `${whole.toString()} LGT`
  const fracStr = frac.toString().padStart(9, '0').replace(/0+$/, '')
  return `${whole.toString()}.${fracStr} LGT`
}

export function shortHash(hash: string, head = 6, tail = 4): string {
  if (hash.length <= head + tail + 1) return hash
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`
}
