import { getInfo } from '@/lib/api'
import { LiveBlockHeight } from './live-block-height'

// Partner-iframe widget: decorative big-serif block height.
//
// Sibling to /embed/chain-head, but visually inverted: where chain-head
// is an operational pill ("chain alive · #12345") meant for status
// strips and footers, this one is a centerpiece: the height number is
// the whole composition. Use case: a partner site's hero banner with a
// "powered by Ligate" feel, or a stat card on a portfolio dashboard.
//
// SSR initial snapshot from /v1/info so first paint shows a real number
// (no "0" flash). Client hands off to a 6s poll, same cadence as
// chain-head.

export const dynamic = 'force-dynamic'

export default async function BlockHeightEmbed() {
  const info = await getInfo().catch(() => null)
  return (
    <LiveBlockHeight
      initial={{
        chainId: info?.chain_id ?? 'ligate-devnet-2',
        latestBlock: info?.latest_block ?? 0,
      }}
    />
  )
}
