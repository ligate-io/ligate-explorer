'use client'

import { useRouter } from 'next/navigation'
import { ago, fmtLgt, fmtLgtTrim, trunc } from '@/lib/format'
import type { Block, Tx, TxStatus } from '@/lib/api-types'
import type { AddressLabelMap } from '@/lib/address-labels'
import { readTransfer } from '@/lib/tx-payload'
import { AddressBadge } from './address-badge'
import { ArrowRight } from './svgs'
import { StatusPill, TypeTag } from './ui'

// Compact-mode combiner: status dot + type label in one cell. Saves
// the vertical room a separate Status column + the multi-line Action
// subtitle take. Used by the homepage's Latest transactions side so
// it can fit ~7 rows in the same height the blocks column gets.
function TypeDotCombined({
  type,
  status,
}: {
  type: string
  status: TxStatus
}) {
  const dot =
    status === 'SUCCESS'
      ? 'var(--color-accent)'
      : status === 'REVERTED'
        ? 'var(--color-coral)'
        : 'var(--color-amber)'
  return (
    <span
      className="mono"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 11,
        color: 'var(--color-bone)',
        letterSpacing: '0.04em',
      }}
      title={`Status: ${status}`}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: dot,
          flexShrink: 0,
        }}
      />
      {type}
    </span>
  )
}

// Per-row fee cell. Two layouts:
//
//   default (`/txs`, `/blocks/[h]` tx list): two-line — gas paid on
//   top, protocol-fee burn in amber below. Spelt out so the reader
//   can see both components.
//
//   compact (homepage latest-txs card): one-line — gas + protocol
//   summed into a single AVOW amount. Colored amber when a protocol
//   portion exists (visual cue this row paid a burn) so the signal
//   isn't lost. Critical for the homepage because rows-with-protocol
//   vs rows-without must end up the same height — otherwise the
//   txs card stretches taller than the blocks card.
function FeeCell({
  feeNano,
  protoNano,
  compact = false,
}: {
  feeNano: string
  protoNano: string
  compact?: boolean
}) {
  const hasProtocol = protoNano !== '0' && protoNano !== ''
  if (compact) {
    const gas = feeNano && feeNano !== '0' ? BigInt(feeNano) : 0n
    const proto = hasProtocol ? BigInt(protoNano) : 0n
    const total = (gas + proto).toString()
    return (
      <span
        className="mono"
        style={{
          color: hasProtocol ? 'var(--color-amber)' : 'var(--color-bone)',
          fontSize: 11,
        }}
        title={
          hasProtocol
            ? `Gas + protocol burn: ${fmtLgt(feeNano)} + ${fmtLgtTrim(protoNano)} AVOW`
            : undefined
        }
      >
        {fmtLgtTrim(total)}{' '}
        <span style={{ color: 'var(--color-subtle)' }}>AVOW</span>
      </span>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span className="mono" style={{ color: 'var(--color-bone)', fontSize: 11 }}>
        {fmtLgt(feeNano)}{' '}
        <span style={{ color: 'var(--color-subtle)' }}>AVOW</span>
      </span>
      {hasProtocol ? (
        <span
          className="mono"
          style={{
            fontSize: 9,
            letterSpacing: '0.1em',
            color: 'var(--color-amber)',
          }}
          title="Protocol fee burned at execution."
        >
          + {fmtLgtTrim(protoNano)} AVOW proto
        </span>
      ) : null}
    </div>
  )
}

// Inline action summary rendered under the type tag. Transfer rows
// get "→ to · amount" so the table reads at a glance who got how
// much, instead of forcing every reader to drill into the tx.
function ActionInline({ tx }: { tx: Tx }) {
  if (tx.type !== 'Transfer') return null
  const t = readTransfer(tx.payload)
  if (!t) return null
  return (
    <div
      className="mono"
      style={{
        fontSize: 10,
        color: 'var(--color-muted)',
        marginTop: 4,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <span style={{ color: 'var(--color-subtle)' }}>→</span>
      <span className="h-mono" style={{ color: 'var(--color-bone)' }}>
        {trunc(t.to, 6, 4)}
      </span>
      <span style={{ color: 'var(--color-subtle)' }}>·</span>
      <span style={{ color: 'var(--color-accent)' }}>
        {fmtLgtTrim(t.amount_nano)} AVOW
      </span>
    </div>
  )
}

// PROPOSER column dropped: ligate-devnet-1 is single-sequencer so
// every row would say the same operator address. The api also returns
// `null` for `proposer` until the chain ships leader rotation
// (chain#82). When that lands, restore as a column or surface as a
// chrome-level "Sequencer:" chip on the page header.
//
// `compact` mirrors the TxsTable knob: tighter row padding via the
// `.tbl-compact` CSS class so the two homepage cards (latest blocks
// + latest txs) render at identical per-row heights and line up.
export function BlocksTable({
  rows,
  compact = false,
}: {
  rows: Block[]
  /** See TxsTable.compact. Same CSS class on both so heights match. */
  compact?: boolean
}) {
  const router = useRouter()
  // Callers wrap us in a FrameCard with `scrollX` to opt in to
  // horizontal-scroll behaviour on narrow viewports — see
  // components/ui.tsx FrameCard.scrollX. The `blocks-compact` marker
  // class lets globals.css hide the Hash column on phones so the
  // remaining 3 columns (Height / Time / Txs) fit without scroll.
  return (
    <table
      className={`tbl tab-num${compact ? ' tbl-compact blocks-compact' : ''}`}
    >
      <thead>
        <tr>
          <th>Height</th>
          <th>Hash</th>
          <th>Time</th>
          <th>Txs</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((b, i) => (
          <tr
            key={b.height}
            className={i === 0 ? 'fresh' : ''}
            onClick={() => router.push(`/blocks/${b.height}`)}
          >
            <td>
              <span className="mono" style={{ color: 'var(--color-ink)' }}>
                #{b.height}
              </span>
            </td>
            <td>
              <span className="h-mono">{trunc(b.hash, 8, 6)}</span>
            </td>
            <td>
              <span
                className="mono"
                style={{ color: 'var(--color-muted)' }}
                suppressHydrationWarning
              >
                {ago(Math.floor((Date.now() - b.timestamp) / 1000))}
              </span>
            </td>
            <td>
              <span className="mono">{b.tx_count}</span>
            </td>
            <td style={{ width: 24, textAlign: 'right' }}>
              <span className="row-arrow">
                <ArrowRight />
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function TxsTable({
  rows,
  showBlock = true,
  compact = false,
  labels,
  suppressLabelFor,
}: {
  rows: Tx[]
  showBlock?: boolean
  /** Compact mode: tighter row padding (via `.tbl-compact` CSS class)
   *  + status merged into the Type cell as a colored dot (drops the
   *  separate Status column) + no ActionInline subtitle. Keeps the
   *  Sender column so the row still carries the "who" alongside the
   *  "what". Used on the homepage so the latest-txs card sits at the
   *  same per-row height as the latest-blocks card. Detail / list
   *  pages stay in full mode. */
  compact?: boolean
  /** Optional address → label map (treasury / faucet / etc.). When
   *  supplied, the sender cell renders a small badge next to the
   *  truncated address. Built per-request by `buildAddressLabels()`
   *  in lib/address-labels.ts. Compact mode (homepage card) skips
   *  the badge to keep row height stable. */
  labels?: AddressLabelMap
  /** Address that's the *subject* of the surrounding page (typically
   *  the `addr` param on /address/[addr]). Sender cells where
   *  `sender === suppressLabelFor` skip the badge entirely — the
   *  page headline already labels that address once, so repeating it
   *  on every row of its own tx history is visual noise. Leave undef
   *  on the global /txs list (every sender deserves the badge). */
  suppressLabelFor?: string
}) {
  const router = useRouter()
  // See BlocksTable: callers wrap us in `<FrameCard scrollX>` to opt
  // in to mobile horizontal scrolling. The `txs-compact` marker
  // class lets globals.css hide Sender + Fee on phones so the
  // remaining 3 columns (Hash / Type / Time) fit without scroll.
  return (
    <table
      className={`tbl tab-num${compact ? ' tbl-compact txs-compact' : ''}`}
    >
      <thead>
        <tr>
          <th>Hash</th>
          {showBlock ? <th>Block</th> : null}
          <th>Sender</th>
          <th>Type</th>
          {compact ? null : <th>Status</th>}
          <th>{compact ? 'Fee' : 'Gas fee'}</th>
          <th>Time</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((t, i) => (
          <tr
            key={t.hash}
            className={i === 0 ? 'fresh' : ''}
            onClick={() => router.push(`/tx/${t.hash}`)}
          >
            <td>
              <span className="h-mono">{trunc(t.hash, 8, 6)}</span>
            </td>
            {showBlock ? (
              <td>
                <span
                  className="mono"
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/blocks/${t.height}`)
                  }}
                  style={{ color: 'var(--color-muted)', cursor: 'pointer' }}
                >
                  #{t.height}
                </span>
              </td>
            ) : null}
            <td>
              <span
                className="h-mono"
                onClick={(e) => {
                  e.stopPropagation()
                  router.push(`/address/${t.sender}`)
                }}
                style={{ cursor: 'pointer' }}
              >
                {trunc(t.sender, 6, 4)}
              </span>
              {/* Skip the badge in compact mode (homepage card) to keep
                  row heights aligned with BlocksTable. Also skip when
                  the sender IS the page subject — the headline above
                  the table has already labelled it once. Detail / list
                  pages with no subject (e.g. /txs) get the badge. */}
              {!compact && t.sender !== suppressLabelFor ? (
                <AddressBadge addr={t.sender} labels={labels} />
              ) : null}
            </td>
            <td>
              {compact ? (
                <TypeDotCombined type={t.type} status={t.status} />
              ) : (
                <>
                  <TypeTag type={t.type} />
                  <ActionInline tx={t} />
                </>
              )}
            </td>
            {compact ? null : (
              <td>
                <StatusPill status={t.status} />
              </td>
            )}
            <td>
              <FeeCell
                feeNano={t.fee_nano}
                protoNano={t.protocol_fee_nano}
                compact={compact}
              />
            </td>
            <td>
              <span
                className="mono"
                style={{ color: 'var(--color-muted)' }}
                suppressHydrationWarning
              >
                {ago(Math.floor((Date.now() - t.timestamp) / 1000))}
              </span>
            </td>
            <td style={{ width: 24, textAlign: 'right' }}>
              <span className="row-arrow">
                <ArrowRight />
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
