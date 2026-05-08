'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { ArrowRight } from '@/components/svgs'
import { dripAction, type DripActionResult } from './actions'

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
        <span className="fc-bl" />
        <span className="fc-br" />
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
                100.000000000 LGT
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
                  Request 100 LGT <ArrowRight />
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
            This address recently dripped. Come back later
            {result.next_drip_at ? (
              <>
                {' '}(eligible at{' '}
                <span className="mono">{result.next_drip_at}</span>).
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

function SuccessToast({ hash, addr }: { hash: string; addr: string }) {
  return (
    <div className="toast">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-accent)',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: 999,
              background: 'var(--color-accent)',
              marginRight: 8,
              verticalAlign: 'middle',
            }}
          />
          Drip submitted
        </div>
      </div>
      <div
        style={{ color: 'var(--color-bone)', fontSize: 13, marginBottom: 12 }}
      >
        100 LGT on the way to{' '}
        <span className="mono">
          {addr.slice(0, 10)}…{addr.slice(-6)}
        </span>
      </div>
      <Link
        href={`/tx/${hash}`}
        className="link mono"
        style={{ fontSize: 12 }}
      >
        View tx {hash.slice(0, 10)}…{hash.slice(-6)} →
      </Link>
    </div>
  )
}
