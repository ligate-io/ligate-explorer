import type { Metadata } from 'next'
import Link from 'next/link'
import { getStatsTotals, getTopHolders } from '@/lib/api'
import { fmtLgtCompact, fmtLgtTrim, trunc } from '@/lib/format'
import { ArrowRight } from '@/components/svgs'
import { Eyebrow, FrameCard } from '@/components/ui'

export const metadata: Metadata = { title: 'Holders' }
export const dynamic = 'force-dynamic'

// Top-holders list, sourced from `/v1/stats/top-holders` (the fetcher
// has been in lib/api.ts since the early stats wiring but nothing
// rendered it before this route). Default sample size is 50 — the api
// caps server-side so anything higher silently returns whatever's
// available.
const SAMPLE_SIZE = 50

export default async function HoldersPage() {
  // Fetch holders + totals in parallel. `totals.total_supply_nano`
  // drives the "% of supply" column; degrade to no-percentage when
  // the stats endpoint flakes rather than printing wrong math.
  const [holders, totals] = await Promise.all([
    getTopHolders(SAMPLE_SIZE),
    getStatsTotals().catch(() => null),
  ])

  const totalSupplyNano = totals?.total_supply_nano
  const totalSupplyBig = totalSupplyNano ? BigInt(totalSupplyNano) : null
  // Sum of the displayed holders' balances. Used in the header strip
  // alongside "X holders" to communicate concentration ("top 50 hold
  // 99.4% of supply") without needing the full distribution.
  let displayedTotal = 0n
  for (const h of holders) {
    if (h.balance_nano) displayedTotal += BigInt(h.balance_nano)
  }
  const displayedShareBps =
    totalSupplyBig && totalSupplyBig > 0n
      ? Number((displayedTotal * 10000n) / totalSupplyBig)
      : null
  const displayedSharePct =
    displayedShareBps != null ? displayedShareBps / 100 : null

  const stats: { label: string; value: string; sub?: string }[] = [
    {
      label: 'Holders shown',
      value: holders.length.toLocaleString(),
      sub: `top ${SAMPLE_SIZE} by balance`,
    },
    {
      label: 'Aggregate balance',
      value: fmtLgtCompact(displayedTotal.toString()),
      sub: 'sum of rows below',
    },
    {
      label: 'Share of supply',
      value:
        displayedSharePct != null
          ? `${displayedSharePct.toFixed(2)}%`
          : '—',
      sub:
        totalSupplyBig != null
          ? `of ${fmtLgtCompact(totalSupplyBig.toString())} total`
          : 'supply unknown',
    },
  ]

  return (
    <>
      <div style={{ paddingTop: 16 }}>
        <Eyebrow>AVOW holders</Eyebrow>
        <h1
          className="serif h-hero"
          style={{
            marginTop: 24,
            lineHeight: 0.95,
            color: 'var(--color-ink)',
            maxWidth: '20ch',
            fontWeight: 400,
          }}
        >
          Where the <em style={{ color: 'var(--color-accent)' }}>supply</em>{' '}
          sits.
        </h1>
        <p
          style={{
            color: 'var(--color-muted)',
            maxWidth: 560,
            marginTop: 20,
          }}
        >
          The top {SAMPLE_SIZE} addresses by balance, ranked. Devnet
          balances are testnet-only and have no monetary value; treat
          the distribution as an operational signal, not a market one.
        </p>
      </div>

      <div
        className="grid-stats-3"
        style={{ marginTop: 40, gap: 0 }}
      >
        {stats.map((t, i) => (
          <FrameCard
            key={i}
            padding={20}
            style={{
              borderRight:
                i === stats.length - 1 ? '1px solid var(--color-line)' : 0,
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--color-subtle)',
                marginBottom: 10,
              }}
            >
              {t.label}
            </div>
            <div
              className="serif"
              style={{
                fontSize: 36,
                lineHeight: 1,
                color: 'var(--color-ink)',
              }}
            >
              {t.value}
            </div>
            {t.sub ? (
              <div
                className="mono"
                style={{
                  marginTop: 10,
                  fontSize: 9,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: 'var(--color-subtle)',
                }}
              >
                {t.sub}
              </div>
            ) : null}
          </FrameCard>
        ))}
      </div>

      <FrameCard padding={0} style={{ marginTop: 40 }} scrollX>
        <table className="tbl tab-num">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Address</th>
              <th>Balance</th>
              <th>% of supply</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {holders.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: '48px 22px',
                    textAlign: 'center',
                    color: 'var(--color-subtle)',
                  }}
                >
                  <span
                    className="mono"
                    style={{ fontSize: 11, letterSpacing: '0.18em' }}
                  >
                    No holders surfaced yet
                  </span>
                </td>
              </tr>
            ) : (
              holders.map((h) => {
                const bal = h.balance_nano ? BigInt(h.balance_nano) : 0n
                const pct =
                  totalSupplyBig && totalSupplyBig > 0n
                    ? Number((bal * 1000000n) / totalSupplyBig) / 10000
                    : null
                return (
                  <tr key={h.address}>
                    <td>
                      <span
                        className="mono"
                        style={{
                          color:
                            h.rank <= 3
                              ? 'var(--color-accent)'
                              : 'var(--color-bone)',
                        }}
                      >
                        #{h.rank}
                      </span>
                    </td>
                    <td>
                      <Link
                        href={`/address/${h.address}`}
                        className="h-mono link"
                        title={h.address}
                      >
                        {trunc(h.address, 12, 8)}
                      </Link>
                    </td>
                    <td>
                      <span
                        className="mono"
                        style={{ color: 'var(--color-bone)' }}
                      >
                        {fmtLgtTrim(h.balance_nano)}{' '}
                        <span style={{ color: 'var(--color-subtle)' }}>
                          AVOW
                        </span>
                      </span>
                    </td>
                    <td>
                      {pct != null ? (
                        <span
                          className="mono"
                          style={{
                            color:
                              pct >= 1
                                ? 'var(--color-accent)'
                                : 'var(--color-muted)',
                          }}
                        >
                          {pct >= 0.01
                            ? `${pct.toFixed(2)}%`
                            : '<0.01%'}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-subtle)' }}>—</span>
                      )}
                    </td>
                    <td style={{ width: 24, textAlign: 'right' }}>
                      <span className="row-arrow">
                        <ArrowRight />
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </FrameCard>

      <p
        style={{
          marginTop: 32,
          color: 'var(--color-subtle)',
          fontSize: 13,
          maxWidth: 620,
        }}
      >
        Source: <span className="mono">/v1/stats/top-holders</span>.
        Recomputed on each page load; chain bank module is the ground
        truth. Faucet and treasury wallets are listed alongside organic
        holders — distribution will skew until devnet-2 reseeds.
      </p>
    </>
  )
}
