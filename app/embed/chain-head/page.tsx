import { getInfo } from '@/lib/api'
import { LiveChainHead } from './live-head'

// Partner-iframe widget: live chain head + status pill.
//
// Bare-minimum "the chain is alive" surface — partners drop this in
// a sidebar or footer to signal that the integration they advertise
// is talking to a live network. Polls /v1/info every 6s; widget shows
// chain id + latest block height + a small live dot.
//
// SSR-renders the initial snapshot so the iframe is fully painted
// on first contentful paint (no client-side hydration flash). Same
// polling pattern as the home page LiveStatsStrip, just stripped
// down to one number + an indicator.

export const dynamic = 'force-dynamic'

export default async function ChainHeadEmbed() {
  const info = await getInfo().catch(() => null)
  return (
    <LiveChainHead
      initial={{
        chainId: info?.chain_id ?? 'ligate-devnet-1',
        latestBlock: info?.latest_block ?? 0,
      }}
    />
  )
}
