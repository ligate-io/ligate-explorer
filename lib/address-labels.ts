// Address label registry. Maps known on-chain addresses to human
// labels so tx lists, address pages, and detail views can render a
// small badge next to `lig1zd9j…98ac` saying "Treasury · Faucet"
// instead of leaving the user to guess.
//
// Inputs:
// - `treasuryAddress`: from /v1/stats/totals.treasury_address. On
//   devnet-1 the treasury wallet IS the faucet sequencer's wallet
//   (they split at testnet), so this one address picks up both labels.
// - `staticLabels`: hard-coded entries that don't move with chain
//   config (e.g. burn address if/when one's defined). Currently
//   empty; reserved for future use.
//
// The map is built per-request from whatever the api currently
// reports rather than baked into the bundle, so a treasury rotation
// (rare but possible) doesn't require an explorer redeploy.

export interface AddressLabel {
  // 1-3 words, mono uppercase. Shown in the badge itself.
  label: string
  // Longer explanation, surfaced as the `title` attribute on hover.
  hint: string
  // Visual variant: 'accent' for system addresses, 'amber' for
  // operator-controlled, etc. Keeps the badge color encoding sparse.
  tone: 'accent' | 'amber' | 'subtle'
}

export type AddressLabelMap = Record<string, AddressLabel>

/**
 * Build the label map for the current chain config. Call once per
 * server-rendered page and pass the result down as a prop to any
 * table that renders addresses.
 *
 * Cheap to construct: it's just an object literal. The expensive bit
 * is the `getStatsTotals()` fetch that produces `treasuryAddress` —
 * that's already happening on the pages that need labels.
 */
export function buildAddressLabels(opts: {
  treasuryAddress?: string | null
}): AddressLabelMap {
  const map: AddressLabelMap = {}
  if (opts.treasuryAddress) {
    map[opts.treasuryAddress] = {
      label: 'TREASURY · FAUCET',
      hint:
        'On devnet-1 the treasury wallet is also the faucet sequencer wallet — they split at testnet. Every faucet drip and protocol fee routes through this address.',
      tone: 'accent',
    }
  }
  return map
}

/**
 * Lookup helper. Returns `null` when the address has no label.
 * Pass `null` / `undefined` addresses safely (returns null).
 */
export function getAddressLabel(
  addr: string | null | undefined,
  labels: AddressLabelMap | undefined,
): AddressLabel | null {
  if (!addr || !labels) return null
  return labels[addr] ?? null
}
