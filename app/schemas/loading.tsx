import { SkelBlock, SkelListTableCard } from '@/components/skeleton'
import { Eyebrow } from '@/components/ui'

// /schemas list silhouette: hero + paginated table.
export default function Loading() {
  return (
    <>
      <div style={{ padding: '48px 0 32px' }}>
        <Eyebrow>Schemas</Eyebrow>
        <div style={{ marginTop: 24 }}>
          <SkelBlock width="55%" height={48} />
          <div style={{ marginTop: 20 }}>
            <SkelBlock width="55%" height={12} />
          </div>
        </div>
      </div>
      <SkelListTableCard
        headers={['Name', 'Version', 'Owner', 'Threshold', 'Attestations', 'Registered']}
        rows={6}
      />
    </>
  )
}
