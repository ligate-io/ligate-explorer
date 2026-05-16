import { SkelBlock, SkelListTableCard } from '@/components/skeleton'
import { Eyebrow } from '@/components/ui'

// /attestations list silhouette: hero (eyebrow + serif H1 + blurb)
// → paginated table.
export default function Loading() {
  return (
    <>
      <div style={{ padding: '48px 0 32px' }}>
        <Eyebrow>Attestation feed</Eyebrow>
        <div style={{ marginTop: 24 }}>
          <SkelBlock width="55%" height={48} />
          <div style={{ marginTop: 20 }}>
            <SkelBlock width="60%" height={12} />
          </div>
          <div style={{ marginTop: 8 }}>
            <SkelBlock width="40%" height={12} />
          </div>
        </div>
      </div>
      <SkelListTableCard
        headers={['Payload', 'Schema', 'Submitter', 'Sigs', 'Block', 'Time']}
        rows={12}
      />
    </>
  )
}
