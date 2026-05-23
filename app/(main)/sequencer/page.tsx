import type { Metadata } from 'next'
import { getInfo, getLatestBlocks } from '@/lib/api'
import { CopyButton } from '@/components/copy-button'
import { LiveSequencerSurface } from '@/components/live-cards'
import { Eyebrow } from '@/components/ui'

export const metadata: Metadata = { title: 'Sequencer' }
export const dynamic = 'force-dynamic'

// Single-sequencer surface for ligate-devnet-1. The chain has one
// operator producing every block; this page reads the proposer field
// off the most-recent slot, falls back through the recent-slots
// sample for the first non-null entry (legacy pre-PR-#44 slots ship
// null), then hands the stats + table off to <LiveSequencerSurface />
// which polls /v1/info + /v1/blocks every 6s so new slots appear
// without the user reloading.
//
// What stays server-rendered: the operator address header + body
// paragraph + footer note. Those don't change between slots (single
// sequencer for the duration of devnet) so polling them would burn
// cycles for no value.
//
// Multi-sequencer later would split this into `/sequencer/[address]`
// plus a list page.

const RECENT_SAMPLE = 20

export default async function SequencerPage() {
  const [info, recent] = await Promise.all([
    getInfo(),
    getLatestBlocks(RECENT_SAMPLE),
  ])

  // First non-null proposer wins. Legacy slots (pre ligate-api PR #44)
  // omit the field entirely; we don't want a transient null leaking
  // into the headline just because the latest block happens to be old.
  const operator =
    recent.find((b) => b.proposer != null)?.proposer ?? null

  return (
    <>
      <div style={{ paddingTop: 16 }}>
        <Eyebrow>Operator</Eyebrow>
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
          The single{' '}
          <em style={{ color: 'var(--color-accent)' }}>sequencer</em> behind
          devnet-1.
        </h1>
        <p
          style={{
            color: 'var(--color-muted)',
            maxWidth: 560,
            marginTop: 20,
          }}
        >
          ligate-devnet-1 runs with one sequencer for the full devnet
          window. Every slot below was proposed by the operator wallet
          and posted to {info.da_layer} for data availability. Multi-sequencer
          ships at testnet.
        </p>
      </div>

      {/* Operator address strip — static SSR. The operator wallet
          doesn't change between slots on single-sequencer, so this
          stays out of the live polling loop. */}
      <div style={{ marginTop: 40 }}>
        <Eyebrow>Celestia DA address</Eyebrow>
        <div
          style={{
            marginTop: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <span
            className="mono"
            style={{
              fontSize: 18,
              color: 'var(--color-ink)',
              wordBreak: 'break-all',
            }}
          >
            {operator ?? 'Operator not yet attested in the recent sample'}
          </span>
          {operator ? <CopyButton value={operator} /> : null}
        </div>
      </div>

      {/* Live stats + recent slots table. Polls /v1/info + /v1/blocks
          on a 6s cadence; new slots stream in without a manual reload.
          Hands the SSR snapshot in as `initial` so first paint is fully
          populated (no skeleton flicker on hydration). */}
      <LiveSequencerSurface
        initial={{
          chainHead: info.latest_block,
          blockTime: info.finality,
          blocks: recent.slice(0, 10),
        }}
      />

      <p
        style={{
          marginTop: 48,
          color: 'var(--color-subtle)',
          fontSize: 13,
          maxWidth: 620,
        }}
      >
        Devnet-1 has no sequencer bond, no slashing, no leader rotation.
        Multi-sequencer with DbElected leader election ships at testnet;
        until then this page tracks the single operator.
      </p>
    </>
  )
}
