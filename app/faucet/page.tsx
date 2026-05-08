import type { Metadata } from 'next'
import { CircuitDrop } from '@/components/svgs'
import { Eyebrow } from '@/components/ui'
import { FaucetForm } from './faucet-form'

export const metadata: Metadata = { title: 'Faucet' }

export default function FaucetPage() {
  return (
    <div style={{ position: 'relative' }}>
      <div className="circuit-bg">
        <CircuitDrop />
      </div>

      <div
        style={{
          position: 'relative',
          maxWidth: 720,
          margin: '0 auto',
          paddingTop: 24,
        }}
      >
        <Eyebrow>Devnet faucet</Eyebrow>
        <h1
          className="serif"
          style={{
            marginTop: 24,
            fontSize: 88,
            lineHeight: 1,
            color: 'var(--color-ink)',
            fontWeight: 400,
          }}
        >
          Get test{' '}
          <em style={{ fontStyle: 'italic', color: 'var(--color-accent)' }}>
            $LGT
          </em>
        </h1>
        <p
          style={{
            color: 'var(--color-muted)',
            fontSize: 15,
            marginTop: 16,
            maxWidth: 540,
          }}
        >
          Drip 100 $LGT into a devnet address. One drip per address per hour. Funds are testnet-only and have no value.
        </p>

        <FaucetForm />

        <div
          style={{
            marginTop: 56,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 24,
          }}
        >
          {[
            { k: 'Limit', v: '1 drip / address / hour' },
            { k: 'Amount', v: '100.000000000 LGT' },
            { k: 'Confirmation', v: '~12 seconds' },
          ].map((it) => (
            <div key={it.k}>
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: 'var(--color-subtle)',
                  marginBottom: 8,
                }}
              >
                {it.k}
              </div>
              <div style={{ color: 'var(--color-bone)', fontSize: 14 }}>{it.v}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 40,
            paddingTop: 24,
            borderTop: '1px solid var(--color-line)',
          }}
        >
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--color-subtle)',
              lineHeight: 1.8,
            }}
          >
            // devnet only — funds have no value
            <br />
            // drip emits a Transfer tx signed by the faucet sequencer
            <br />
            // rate-limited per address; abusers get blacklisted from drip
          </div>
        </div>
      </div>
    </div>
  )
}
