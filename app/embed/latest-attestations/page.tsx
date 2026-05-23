import { getAttestationItems } from '@/lib/api'
import { LiveLatestAttestations } from './live-latest-attestations'

// Partner-iframe widget: live feed of the last N attestations on chain.
//
// Use case for partners running aggregators / dashboards / status pages:
// drop in a "what's landing on Ligate right now" feed without rolling
// their own pollers. Different shape from the per-schema attestation
// count card (single big number); this is multi-row, more "ticker"
// less "stat".
//
// SSR'd initial 5 rows from /v1/attestations?limit=5 so first paint
// shows real activity. Client polls every 15s (slower than chain-head
// because a multi-row feed of changing data is noisier to look at than
// a single-number update).

export const dynamic = 'force-dynamic'

const FEED_LIMIT = 5

export default async function LatestAttestationsEmbed() {
  const page = await getAttestationItems(undefined, FEED_LIMIT).catch(
    () => ({ items: [], nextCursor: null }),
  )
  return (
    <LiveLatestAttestations
      limit={FEED_LIMIT}
      initial={page.items.map((a) => ({
        id: a.id,
        schemaId: a.schema_id,
        submitter: a.submitter,
        timestamp: a.submitted_at.timestamp,
      }))}
    />
  )
}
