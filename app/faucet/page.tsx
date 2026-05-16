import type { Metadata } from 'next'
import { getInfo } from '@/lib/api'
import { FaucetBgImage } from '@/components/faucet-bg-image'
import { Eyebrow } from '@/components/ui'
import { FaucetForm } from './faucet-form'

export const metadata: Metadata = { title: 'Faucet' }
export const dynamic = 'force-dynamic'

export default async function FaucetPage() {
  // Real block time for the "Confirmation" stat. info.finality is now
  // the measured rollup slot interval (~6s on devnet) sourced from
  // /v1/stats/next-block-eta — same number the dashboard's Block time
  // tile + the BlockTickerCard show. Falls back to "~12s" if the eta
  // endpoint is unreachable (matches the OLD hardcoded value).
  const info = await getInfo().catch(() => null)
  const confirmation = info?.finality ?? '~12s'
  return (
    <div style={{ position: 'relative' }}>
      {/* Backdrop: parametric curve field, blurred. The mask in
          .circuit-bg fades the edges into obsidian so the form
          never has to contend with the full-strength image. */}
      <div className="circuit-bg" style={{ opacity: 0.7 }}>
        <FaucetBgImage />
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
            LGT
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
          Drip 100 LGT into a devnet address. One drip per address every 24 hours. Funds are testnet-only and have no value.
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
            { k: 'Limit', v: '1 drip / address / 24h' },
            { k: 'Amount', v: '100 LGT' },
            { k: 'Confirmation', v: confirmation },
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
            // devnet only. Funds have no value.
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
