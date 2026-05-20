import { SkelBlock } from '@/components/skeleton'
import { Eyebrow } from '@/components/ui'

// First-paint skeleton for /faucet. Fires only on hard navigation TO
// this route while the server component awaits `getInfo()`.
//
// Mirrors the silhouette of `app/faucet/page.tsx` + `faucet-form.tsx`
// exactly — same centered 720px column, same eyebrow, same `.frame`
// border on the form, same 3-column stats grid below, same monospace
// footer block. When the real page swaps in, nothing reflows.
//
// Was falling back to the root `app/loading.tsx` previously, which
// drew a six-tile stats strip plus four dashboard rows on top of the
// circuit-bg blur. Totally off-shape for a single-form route — that's
// the "weird loading skeletons" the user kept hitting.
export default function Loading() {
  return (
    <div style={{ position: 'relative' }}>
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

        {/* Form silhouette. Matches FaucetForm's outer .frame
            (padding 32, marginTop 48): recipient-address label +
            input row, then amount/button row at the bottom. */}
        <div className="frame" style={{ marginTop: 48, padding: 32 }}>
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
          <SkelBlock width="100%" height={52} style={{ display: 'block' }} />
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
                100 LGT
              </span>
            </div>
            <SkelBlock width={180} height={44} />
          </div>
        </div>

        {/* Stats grid. Labels are static (Limit / Amount / Confirmation),
            only the Confirmation value is async (it comes from getInfo)
            so it's the only field that gets a skel; the other two read
            their real fixed values immediately. */}
        <div className="grid-stats-3" style={{ marginTop: 56, gap: 24 }}>
          {[
            { k: 'Limit', v: '1 drip / address / 24h', skel: false },
            { k: 'Amount', v: '100 LGT', skel: false },
            { k: 'Confirmation', v: '', skel: true },
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
              {it.skel ? (
                <SkelBlock width={70} height={14} />
              ) : (
                <div
                  style={{ color: 'var(--color-bone)', fontSize: 14 }}
                >
                  {it.v}
                </div>
              )}
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
