// Address label badge. Tiny mono pill that renders next to a
// truncated address when the registry has a label for it (treasury,
// faucet, sequencer, future system addresses). Hover surfaces the
// longer explanation.
//
// Used in:
//   - TxsTable sender column (passed via the `labels` prop)
//   - /address/[addr] headline (when the visited address has a label)
//   - any future surface that needs to call out a system address

import { getAddressLabel, type AddressLabelMap } from '@/lib/address-labels'

export function AddressBadge({
  addr,
  labels,
}: {
  addr: string
  labels?: AddressLabelMap
}) {
  const hit = getAddressLabel(addr, labels)
  if (!hit) return null
  const color =
    hit.tone === 'accent'
      ? 'var(--color-accent)'
      : hit.tone === 'amber'
        ? 'var(--color-amber)'
        : 'var(--color-subtle)'
  return (
    <span
      className="mono"
      title={hit.hint}
      style={{
        marginLeft: 8,
        padding: '2px 6px',
        fontSize: 9,
        letterSpacing: '0.16em',
        color,
        border: `1px solid ${color}`,
        whiteSpace: 'nowrap',
        verticalAlign: 'middle',
      }}
    >
      {hit.label}
    </span>
  )
}
