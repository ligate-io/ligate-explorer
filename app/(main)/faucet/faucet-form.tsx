'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, useTransition } from 'react'
import { ArrowRight } from '@/components/svgs'
import { fmtLgt, fmtLgtTrim, untilHuman } from '@/lib/format'
import { readTransfer } from '@/lib/tx-payload'
import { dripAction, type DripActionResult } from './actions'

// Browser-side base for polling the tx after a drip. lib/api.ts is
// server-only; api responds with `access-control-allow-origin: *` so a
// direct `fetch` from the form works.
const apiBase = (
  process.env.NEXT_PUBLIC_API_URL ?? 'https://api.ligate.io'
).replace(/\/+$/, '')

interface ApiTx {
  hash: string
  block_height: number
  fee_paid_nano: string | null
  protocol_fee_nano: string | null
  outcome: string
  details: Record<string, unknown>
}

export function FaucetForm() {
  const [addr, setAddr] = useState('')
  const [result, setResult] = useState<DripActionResult | null>(null)
  const [pending, startTransition] = useTransition()
  const isError = result?.kind === 'invalid'
  const isCooldown = result?.kind === 'cooldown'

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      setResult(null)
      const res = await dripAction(fd)
      setResult(res)
    })
  }

  return (
    <>
      <div
        className="frame"
        style={{ marginTop: 48, padding: 32 }}
      >
        <form onSubmit={onSubmit}>
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--color-subtle)',
              marginBottom: 12,
            }}
          >
            Recipient address
          </div>
          <input
            type="text"
            name="address"
            placeholder="lig1..."
            value={addr}
            onChange={(e) => {
              setAddr(e.target.value)
              if (result) setResult(null)
            }}
            style={{ paddingLeft: 16, fontSize: 16, padding: '14px 16px' }}
            disabled={pending}
            autoComplete="off"
            spellCheck="false"
          />
          {isError ? (
            <div
              style={{
                color: 'var(--color-coral)',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                marginTop: 10,
              }}
            >
              {result.message}
            </div>
          ) : null}

          <div
            className="faucet-actions"
            style={{
              marginTop: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--color-subtle)',
              }}
            >
              Amount
              <br />
              <span
                style={{
                  color: 'var(--color-bone)',
                  fontSize: 22,
                  letterSpacing: '0',
                  textTransform: 'none',
                  fontFamily: 'var(--font-serif)',
                }}
              >
                100 AVOW
              </span>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={pending || isCooldown}
              style={{ padding: '14px 24px', fontSize: 12 }}
            >
              {pending ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 14 14">
                    <circle
                      cx="7"
                      cy="7"
                      r="5"
                      stroke="#0a0a0b"
                      strokeWidth="1.5"
                      fill="none"
                      strokeDasharray="8 8"
                    >
                      <animateTransform
                        attributeName="transform"
                        type="rotate"
                        from="0 7 7"
                        to="360 7 7"
                        dur="0.9s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  </svg>
                  Dripping…
                </>
              ) : isCooldown ? (
                'Cool down'
              ) : (
                <>
                  Request 100 AVOW <ArrowRight />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {isCooldown ? (
        <div
          style={{
            marginTop: 24,
            padding: '16px 20px',
            border: '1px solid var(--color-amber)',
            color: 'var(--color-amber)',
          }}
        >
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            Cooldown active
          </div>
          <div style={{ color: 'var(--color-bone)', fontSize: 14 }}>
            This address recently dripped. Try again{' '}
            <span className="mono" style={{ color: 'var(--color-amber)' }}>
              {untilHuman(result.next_drip_at)}
            </span>
            {result.next_drip_at ? (
              <>
                {' '}
                <span style={{ color: 'var(--color-subtle)' }}>
                  ({new Date(result.next_drip_at).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })})
                </span>
              </>
            ) : (
              '.'
            )}
          </div>
        </div>
      ) : null}

      {result?.kind === 'success' ? (
        <SuccessToast hash={result.tx_hash} addr={result.address} />
      ) : null}
    </>
  )
}

// Two-phase confirmation:
//   phase=submitted → tx broadcast, indexer hasn't surfaced it yet.
//                     Spinner + amount the api promised + hash.
//   phase=confirmed → indexer caught up. Replace spinner with block
//                     height + actual amount transferred (read off the
//                     tx details, not the dripAction return) + fees.
//   phase=timeout   → ~45s elapsed and still no inclusion. The user
//                     gets a soft warning + a link to the tx page where
//                     TxPending will keep polling.
//
// Polling cadence: 2s for the first 10s (indexer usually catches up
// inside a single block ~12s), then 5s up to ~45s total. The api is
// CORS-open so the browser fetches directly.
function SuccessToast({ hash, addr }: { hash: string; addr: string }) {
  const [phase, setPhase] = useState<'submitted' | 'confirmed' | 'timeout'>(
    'submitted',
  )
  const [tx, setTx] = useState<ApiTx | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const startedAt = useRef(Date.now())

  useEffect(() => {
    let cancelled = false
    const poll = async () => {
      try {
        const res = await fetch(
          `${apiBase}/v1/txs/${encodeURIComponent(hash)}`,
          { cache: 'no-store' },
        )
        if (cancelled) return
        if (res.ok) {
          const body = (await res.json()) as ApiTx
          setTx(body)
          setPhase('confirmed')
          return true
        }
      } catch {
        /* swallow; next tick will retry */
      }
      return false
    }

    const tick = setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)),
      1000,
    )

    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const schedule = (delay: number) => {
      timeoutId = setTimeout(async () => {
        const done = await poll()
        if (done || cancelled) return
        const since = Date.now() - startedAt.current
        if (since > 45_000) {
          setPhase('timeout')
          return
        }
        // Tighter loop early (within 1 block), looser after.
        schedule(since < 10_000 ? 2000 : 5000)
      }, delay)
    }
    // First fire after 1.5s — the chain rarely commits faster than a
    // block, no point hammering before then.
    schedule(1500)

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
      clearInterval(tick)
    }
  }, [hash])

  const transfer = tx ? readTransfer(tx.details) : null
  const reverted = tx?.outcome === 'reverted'
  const accent = reverted
    ? 'var(--color-coral)'
    : phase === 'confirmed'
      ? 'var(--color-accent)'
      : 'var(--color-amber)'
  const label =
    phase === 'submitted'
      ? 'Submitted · indexing'
      : phase === 'timeout'
        ? 'Submitted · still indexing'
        : reverted
          ? 'Reverted'
          : 'Confirmed on chain'

  return (
    <div className="toast" style={{ borderColor: accent }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: accent,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {phase === 'submitted' ? (
            <Spinner color={accent} />
          ) : (
            <span
              aria-hidden
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: accent,
              }}
            />
          )}
          {label}
        </div>
        {phase === 'submitted' ? (
          <span
            className="mono"
            style={{ fontSize: 10, color: 'var(--color-subtle)' }}
          >
            {elapsed}s
          </span>
        ) : null}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: 12,
          alignItems: 'baseline',
          marginBottom: 14,
        }}
      >
        <div>
          <div
            className="mono"
            style={{
              fontSize: 9,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--color-subtle)',
              marginBottom: 4,
            }}
          >
            Recipient
          </div>
          <Link
            href={`/address/${addr}`}
            className="h-mono"
            style={{ fontSize: 12, wordBreak: 'break-all' }}
          >
            {addr.slice(0, 14)}…{addr.slice(-8)}
          </Link>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            className="mono"
            style={{
              fontSize: 9,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--color-subtle)',
              marginBottom: 4,
            }}
          >
            Amount
          </div>
          <div
            className="serif"
            style={{ fontSize: 22, color: 'var(--color-ink)', lineHeight: 1 }}
          >
            {transfer ? fmtLgtTrim(transfer.amount_nano) : '100'}{' '}
            <span
              className="mono"
              style={{ fontSize: 11, color: 'var(--color-subtle)' }}
            >
              AVOW
            </span>
          </div>
        </div>
      </div>

      {phase === 'confirmed' && tx ? (
        <div
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.04em',
            color: 'var(--color-muted)',
            marginBottom: 12,
            display: 'flex',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          <span>
            <span style={{ color: 'var(--color-subtle)' }}>Block</span>{' '}
            <Link href={`/blocks/${tx.block_height}`} className="link">
              #{tx.block_height}
            </Link>
          </span>
          <span>
            <span style={{ color: 'var(--color-subtle)' }}>Gas fee</span>{' '}
            {tx.fee_paid_nano && tx.fee_paid_nano !== '0' ? (
              <>
                {fmtLgt(tx.fee_paid_nano)}{' '}
                <span style={{ color: 'var(--color-subtle)' }}>AVOW</span>
              </>
            ) : (
              <span style={{ color: 'var(--color-subtle)' }}>not exposed</span>
            )}
          </span>
          {tx.protocol_fee_nano && tx.protocol_fee_nano !== '0' ? (
            <span style={{ color: 'var(--color-amber)' }}>
              + {fmtLgtTrim(tx.protocol_fee_nano)} AVOW proto
            </span>
          ) : null}
        </div>
      ) : phase === 'timeout' ? (
        <div
          style={{
            fontSize: 12,
            color: 'var(--color-muted)',
            marginBottom: 12,
            lineHeight: 1.5,
          }}
        >
          The chain accepted the tx but the indexer is taking longer than
          usual. Open the tx page to keep watching.
        </div>
      ) : null}

      <Link
        href={`/tx/${hash}`}
        className="link mono"
        style={{ fontSize: 11 }}
      >
        View tx {hash.slice(0, 10)}…{hash.slice(-6)} →
      </Link>
    </div>
  )
}

function Spinner({ color }: { color: string }) {
  return (
    <svg width="10" height="10" viewBox="0 0 14 14" aria-hidden>
      <circle
        cx="7"
        cy="7"
        r="5"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        strokeDasharray="8 8"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 7 7"
          to="360 7 7"
          dur="0.9s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  )
}
