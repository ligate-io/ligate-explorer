import type { Metadata } from 'next'
import Link from 'next/link'
import { getInfo, getLatestBlocks } from '@/lib/api'
import { ago, isoDate, trunc } from '@/lib/format'
import { CopyButton } from '@/components/copy-button'
import { ArrowRight } from '@/components/svgs'
import { Eyebrow, FrameCard } from '@/components/ui'

export const metadata: Metadata = { title: 'Sequencer' }
export const dynamic = 'force-dynamic'

// Single-sequencer surface for ligate-devnet-1. The chain has one
// operator producing every block; this page reads the proposer field
// off the most-recent slot, falls back through the recent-slots
// sample for the first non-null entry (legacy pre-PR-#44 slots ship
// null), then shows total slots produced + block time + a list of
// the last 10 slots. Multi-sequencer would mean splitting this into
// `/sequencer/[address]` later; the routing is intentionally a single
// page for now so it can't go stale against the chain config.

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

  const slotsProduced = info.latest_block
  const blockTime = info.finality
  const latestSlot = recent[0]
  const latestSlotAge =
    latestSlot != null
      ? ago(Math.floor((Date.now() - latestSlot.timestamp) / 1000))
      : '—'

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

      {/* Operator address strip. Mono + copy button, mirrors the
          address-detail page's header for consistency. */}
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

      {/* Stats strip. Same shape as /holders + /blocks list headers
          so the chain-primitive routes feel like one family. */}
      <div
        className="grid-stats-3"
        style={{ marginTop: 40, gap: 0 }}
      >
        {[
          {
            label: 'Slots produced',
            value: '#' + slotsProduced.toLocaleString(),
            sub: 'all-time on devnet-1',
          },
          {
            label: 'Block time',
            value: blockTime,
            sub: 'measured slot interval',
          },
          {
            label: 'Latest slot',
            value: latestSlot ? '#' + latestSlot.height.toLocaleString() : '—',
            sub: latestSlot ? `${latestSlotAge}` : 'no slots indexed yet',
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
              className="serif"
              style={{
                fontSize: 36,
                lineHeight: 1,
                color: 'var(--color-ink)',
              }}
            >
              {t.value}
            </div>
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
          </FrameCard>
        ))}
      </div>

      {/* Recent slots table. Each row is a block this operator proposed;
          on a single-sequencer chain that's just the recent-blocks
          sample, with the proposer column dropped (it would be the
          same address on every row). */}
      <div style={{ marginTop: 56 }}>
        <Eyebrow>Recent slots produced</Eyebrow>
        <FrameCard padding={0} style={{ marginTop: 12 }} scrollX>
          <table className="tbl tab-num">
            <thead>
              <tr>
                <th>Slot</th>
                <th>Hash</th>
                <th>Txs</th>
                <th>Finality</th>
                <th>Time</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
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
                      No slots indexed yet
                    </span>
                  </td>
                </tr>
              ) : (
                recent.slice(0, 10).map((b) => {
                  const finalized = b.finality_status === 'finalized'
                  const pending = b.finality_status === 'pending'
                  const finalityLabel = finalized
                    ? 'finalized'
                    : pending
                      ? 'pending DA'
                      : '—'
                  const finalityColor = finalized
                    ? 'var(--color-accent)'
                    : pending
                      ? 'var(--color-amber)'
                      : 'var(--color-subtle)'
                  return (
                    <tr key={b.height}>
                      <td>
                        <Link
                          href={`/blocks/${b.height}`}
                          className="mono link"
                          style={{ color: 'var(--color-ink)' }}
                        >
                          #{b.height}
                        </Link>
                      </td>
                      <td>
                        <span className="h-mono" title={b.hash}>
                          {trunc(b.hash, 10, 6)}
                        </span>
                      </td>
                      <td>
                        <span className="mono">{b.tx_count}</span>
                      </td>
                      <td>
                        <span
                          className="mono"
                          style={{
                            fontSize: 10,
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                            color: finalityColor,
                          }}
                        >
                          {finalityLabel}
                        </span>
                      </td>
                      <td>
                        <span
                          className="mono"
                          style={{ color: 'var(--color-muted)' }}
                          title={isoDate(b.timestamp)}
                        >
                          {ago(Math.floor((Date.now() - b.timestamp) / 1000))}
                        </span>
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
        <div
          style={{
            marginTop: 12,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <Link
            href="/blocks"
            className="mono link"
            style={{
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            All slots →
          </Link>
        </div>
      </div>

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
