import { SkelBlock, SkelListTableCard } from '@/components/skeleton'
import { Eyebrow } from '@/components/ui'

// /attestor-sets list silhouette: hero + paginated table.
export default function Loading() {
  return (
    <>
      <div style={{ padding: '48px 0 32px' }}>
        <Eyebrow>Attestor sets</Eyebrow>
        <div style={{ marginTop: 24 }}>
          <SkelBlock width="50%" height={48} />
          <div style={{ marginTop: 20 }}>
            <SkelBlock width="60%" height={12} />
          </div>
        </div>
      </div>
      <SkelListTableCard
        headers={['Attestor set ID', 'Threshold', 'Members', 'Schemas', 'Registered']}
        rows={8}
      />
    </>
  )
}
