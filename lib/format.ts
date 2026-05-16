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

// Human-readable LGT amount with thousands separators on the integer
// part and trailing zeros trimmed off the fractional part. Use for
// supply tiles or anywhere a round integer should read as a number,
// not as a 9-decimal token amount.
export function fmtLgtCompact(nano: bigint | string | number): string {
  const n = typeof nano === 'bigint' ? nano : BigInt(nano)
  const big = n / 1_000_000_000n
  const small = n % 1_000_000_000n
  const wholeFmt = big.toLocaleString('en-US')
  if (small === 0n) return wholeFmt
  const fracStr = small.toString().padStart(9, '0').replace(/0+$/, '')
  return fracStr ? `${wholeFmt}.${fracStr}` : wholeFmt
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

/**
 * Future-tense relative time. Inverse of `ago()`. Used by the faucet
 * cooldown ("come back in 18h"), tx-pending elapsed counter, etc.
 *
 * Accepts an RFC3339 string (the api emits these), a Date, or a Unix
 * ms number. Returns "now" if the time is in the past or unparseable;
 * the caller is expected to show that as "you can drip now" rather
 * than rendering nothing.
 */
export function untilHuman(target: Date | string | number | null): string {
  if (target == null) return 'now'
  const t = target instanceof Date ? target.getTime() : typeof target === 'number' ? target : Date.parse(target)
  if (!Number.isFinite(t)) return 'now'
  const seconds = Math.max(0, Math.floor((t - Date.now()) / 1000))
  if (seconds < 5) return 'now'
  if (seconds < 60) return `in ${seconds}s`
  if (seconds < 3600) return `in ${Math.floor(seconds / 60)}m`
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return m === 0 ? `in ${h}h` : `in ${h}h ${m}m`
  }
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  return h === 0 ? `in ${d}d` : `in ${d}d ${h}h`
}
