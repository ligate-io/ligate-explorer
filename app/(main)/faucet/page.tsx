import type { Metadata } from 'next'
import { getAddressTxs, getInfo, getStatsTotals } from '@/lib/api'
import { fmtLgtCompact } from '@/lib/format'
import { FaucetBgImage } from '@/components/faucet-bg-image'
import { Eyebrow } from '@/components/ui'
import { FaucetForm } from './faucet-form'

export const metadata: Metadata = { title: 'Faucet' }
export const dynamic = 'force-dynamic'

// Window for the "drips today" count. Slightly looser than 24h
// because the api samples up to 100 recent txs and the faucet may
// drip more than that in a real day — extending the window past
// 24h doesn't help if we're already sample-bound, but at sparse
// devnet traffic 24h fits comfortably.
const DRIPS_WINDOW_MS = 24 * 60 * 60 * 1000

export default async function FaucetPage() {
  // Three parallel reads:
  //   - /v1/info             → block time for the Confirmation tile
  //   - /v1/stats/totals     → treasury balance + treasury address
  //   - /v1/addresses/{treasury}/txs (limit 100) → drip activity
  // Treasury address comes from totals, so the txs fetch is sequential
  // on totals — but both fail-soft so a totals 5xx still renders the
  // form + the Confirmation tile + the Discord callout.
  const [info, totals] = await Promise.all([
    getInfo().catch(() => null),
    getStatsTotals().catch(() => null),
  ])
  const treasury = totals?.treasury_address
  const treasuryTxs = treasury
    ? await getAddressTxs(treasury, undefined, 100).catch(() => ({
        items: [],
        nextCursor: null,
      }))
    : { items: [], nextCursor: null }
  const sampleTransfers = treasuryTxs.items.filter(
    (t) => t.type === 'Transfer',
  )
  const nowMs = Date.now()
  const dripsLast24h = sampleTransfers.filter(
    (t) => nowMs - t.timestamp < DRIPS_WINDOW_MS,
  ).length
  const sampleSaturated =
    treasuryTxs.items.length >= 100 && treasuryTxs.nextCursor != null
  const poolLabel = totals?.treasury_balance_nano
    ? fmtLgtCompact(totals.treasury_balance_nano) + ' AVOW'
    : '—'

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
          className="serif h-detail-lg"
          style={{
            marginTop: 24,
            lineHeight: 1,
            color: 'var(--color-ink)',
            fontWeight: 400,
          }}
        >
          Get test{' '}
          <em style={{ fontStyle: 'italic', color: 'var(--color-accent)' }}>
            AVOW
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
          Drip 100 AVOW into a devnet address. One drip per address every 24 hours. Funds are testnet-only and have no value.
        </p>

        <FaucetForm />

        <div
          className="grid-stats-3"
          style={{ marginTop: 56, gap: 24 }}
        >
          {[
            { k: 'Limit', v: '1 drip / address / 24h' },
            { k: 'Per drip', v: '100 AVOW' },
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

        {/* Live faucet activity. Pool = remaining treasury balance
            (= drippable supply). Drips today = transfer-kind txs from
            the treasury in the last 24h. Sample = total transfer txs
            in the 100-tx api window; flagged as `~` when there are
            more pages beyond it so the user reads it as a floor not
            an exact count. Whole strip renders only when totals
            resolved — otherwise the faucet form still works without
            stats. */}
        {totals ? (
          <div
            className="grid-stats-3"
            style={{ marginTop: 24, gap: 24 }}
          >
            {[
              {
                k: 'Faucet pool',
                v: poolLabel,
                sub: 'treasury wallet balance',
              },
              {
                k: 'Drips today',
                v: dripsLast24h.toLocaleString(),
                sub: 'transfers from treasury · last 24h',
              },
              {
                k: 'Drips in sample',
                v:
                  (sampleSaturated ? '~' : '') +
                  sampleTransfers.length.toLocaleString(),
                sub: sampleSaturated
                  ? 'last 100 treasury txs (floor)'
                  : 'all-time on devnet-1',
              },
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
                <div
                  className="serif"
                  style={{
                    color: 'var(--color-ink)',
                    fontSize: 24,
                    lineHeight: 1.1,
                  }}
                >
                  {it.v}
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 9,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: 'var(--color-subtle)',
                    marginTop: 6,
                  }}
                >
                  {it.sub}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Discord callout. The public faucet caps at 100 AVOW per
            address per 24h; anyone needing bulk drips for chain
            integration / load testing runs the `/faucet` slash
            command in our Discord, which the bot routes through the
            operator wallet. */}
        <a
          href="https://discord.gg/ZWUeJ8k3eP"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            marginTop: 32,
            padding: '20px 24px',
            border: '1px solid var(--color-line)',
            background: 'var(--color-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
            flexWrap: 'wrap',
            textDecoration: 'none',
            transition: 'border-color 0.15s ease',
          }}
          className="faucet-discord"
        >
          <div style={{ minWidth: 0 }}>
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--color-subtle)',
                marginBottom: 6,
              }}
            >
              Need more than 100 AVOW?
            </div>
            <div
              style={{
                color: 'var(--color-bone)',
                fontSize: 14,
                lineHeight: 1.5,
                maxWidth: 460,
              }}
            >
              Run the{' '}
              <span
                className="mono"
                style={{
                  color: 'var(--color-accent)',
                  fontSize: 13,
                  padding: '1px 6px',
                  border: '1px solid var(--color-line-2)',
                }}
              >
                /faucet
              </span>{' '}
              command in our Discord and the bot routes a larger drip for chain integration work.
            </div>
          </div>
          <span
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--color-accent)',
              whiteSpace: 'nowrap',
            }}
          >
            Join Discord →
          </span>
        </a>

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
