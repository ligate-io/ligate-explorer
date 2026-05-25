import type { Metadata } from 'next'
import Link from 'next/link'
import { getBlock, getInfo, getStatsTotals } from '@/lib/api'
import { fmtLgtCompact, isoDate, trunc } from '@/lib/format'
import { CopyButton } from '@/components/copy-button'
import { Eyebrow, FrameCard, LV } from '@/components/ui'

export const metadata: Metadata = { title: 'Genesis' }
export const dynamic = 'force-dynamic'

// `/genesis` — origin facts for ligate-devnet-2. Block #1's timestamp
// is the genesis time (the chain doesn't expose a dedicated genesis
// metadata endpoint, but block 1 carries the same data). Supply is
// the genesis pin (1B AVOW) which still matches today since devnet
// doesn't inflate.
//
// Surfaces: chain ID, genesis time, initial supply, chain hash,
// genesis block hash + proposer, DA layer, single-sequencer note.

export default async function GenesisPage() {
  const [info, totals, block1] = await Promise.all([
    getInfo(),
    getStatsTotals().catch(() => null),
    getBlock(1).catch(() => null),
  ])
  const genesisTimestampMs = block1?.timestamp ?? 0
  const genesisDateString = genesisTimestampMs
    ? isoDate(genesisTimestampMs)
    : '—'
  const initialSupplyNano = totals?.total_supply_nano ?? info.supply_nano

  return (
    <>
      <div style={{ paddingTop: 16 }}>
        <Eyebrow>Genesis</Eyebrow>
        <h1
          className="serif h-hero"
          style={{
            marginTop: 24,
            lineHeight: 0.95,
            color: 'var(--color-ink)',
            maxWidth: '22ch',
            fontWeight: 400,
          }}
        >
          Where the chain{' '}
          <em style={{ color: 'var(--color-accent)' }}>began</em>.
        </h1>
        <p
          style={{
            color: 'var(--color-muted)',
            maxWidth: 560,
            marginTop: 20,
          }}
        >
          ligate-devnet-2 was bootstrapped on {genesisDateString} with a
          single sequencer, 1B AVOW pinned in the bank module, and{' '}
          {info.da_layer} fronting data availability. The block #1 hash
          + proposer below are the canonical anchors any verifier
          re-derives from.
        </p>
      </div>

      <div
        className="grid-stats-3"
        style={{ marginTop: 40, gap: 0 }}
      >
        {[
          {
            label: 'Chain ID',
            value: info.chain_id,
            mono: true,
          },
          {
            label: 'Genesis time',
            value: genesisDateString,
            mono: true,
          },
          {
            label: 'Initial supply',
            value: fmtLgtCompact(initialSupplyNano) + ' AVOW',
            mono: true,
          },
        ].map((t, i) => (
          <FrameCard
            key={i}
            padding={20}
            style={{
              borderRight: i === 2 ? '1px solid var(--color-line)' : 0,
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
              className={t.mono ? 'mono' : 'serif'}
              style={{
                fontSize: t.mono ? 18 : 28,
                color: 'var(--color-ink)',
                lineHeight: 1.1,
                wordBreak: 'break-all',
              }}
            >
              {t.value}
            </div>
          </FrameCard>
        ))}
      </div>

      <div
        className="detail-grid-2"
        style={{
          marginTop: 56,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 40,
        }}
      >
        <div>
          <Eyebrow>Identity</Eyebrow>
          <div style={{ marginTop: 12 }}>
            <LV
              rows={[
                {
                  label: 'Chain hash',
                  value: (
                    <>
                      <span
                        className="h-mono"
                        title={info.chain_hash}
                      >
                        {trunc(info.chain_hash, 12, 10)}
                      </span>
                      <CopyButton value={info.chain_hash} />
                    </>
                  ),
                },
                {
                  label: 'Genesis block',
                  value: block1 ? (
                    <Link
                      href="/blocks/1"
                      className="h-mono link"
                      title={block1.hash}
                    >
                      {trunc(block1.hash, 12, 10)}
                    </Link>
                  ) : (
                    <span style={{ color: 'var(--color-subtle)' }}>—</span>
                  ),
                },
                {
                  label: 'Chain version',
                  value: info.version,
                },
                {
                  label: 'DA layer',
                  value: info.da_layer,
                },
              ]}
            />
          </div>
        </div>
        <div>
          <Eyebrow>Sequencer at genesis</Eyebrow>
          <div style={{ marginTop: 12 }}>
            <LV
              rows={[
                {
                  label: 'Proposer',
                  value: block1?.proposer ? (
                    <>
                      <span
                        className="h-mono"
                        title={block1.proposer}
                        style={{ fontSize: 13 }}
                      >
                        {trunc(block1.proposer, 14, 8)}
                      </span>
                      <CopyButton value={block1.proposer} />
                      <span
                        className="mono"
                        style={{
                          fontSize: 9,
                          letterSpacing: '0.18em',
                          textTransform: 'uppercase',
                          color: 'var(--color-subtle)',
                          marginLeft: 8,
                        }}
                        title="Celestia DA wallet that posted the genesis blob."
                      >
                        celestia DA
                      </span>
                    </>
                  ) : (
                    <span style={{ color: 'var(--color-subtle)' }}>—</span>
                  ),
                },
                {
                  label: 'Finalised',
                  value: block1?.finalized_at_ms
                    ? isoDate(block1.finalized_at_ms)
                    : '—',
                },
                {
                  label: 'Tx count',
                  value: (block1?.tx_count ?? 0).toLocaleString(),
                },
              ]}
            />
          </div>
        </div>
      </div>

      <FrameCard padding={28} style={{ marginTop: 56 }}>
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
          What this means
        </div>
        <p
          style={{
            color: 'var(--color-bone)',
            fontSize: 14,
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          Devnet-1 has a single sequencer for the duration of the network.
          No slashing, no leader rotation, no validator set governance.
          The genesis allocation pins 1B AVOW in the bank module which
          drains as the operator funds the faucet, registers protocol
          schemas, and routes protocol fees through the treasury wallet.
          Mainnet replaces all of this with proper validator set
          governance + bonded sequencers + on-chain treasury ops.
        </p>
      </FrameCard>

      <p
        style={{
          marginTop: 48,
          color: 'var(--color-subtle)',
          fontSize: 13,
          maxWidth: 620,
        }}
      >
        Source: <span className="mono">/v1/info</span> + the api's
        block-1 endpoint. Re-derivable from any full node by replaying
        the genesis blob from {info.da_layer}.
      </p>
    </>
  )
}
