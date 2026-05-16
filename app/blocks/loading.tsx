import { SkelBlock, SkelListTableCard } from '@/components/skeleton'
import { Eyebrow, FrameCard } from '@/components/ui'

// /blocks list page silhouette: hero (eyebrow + serif H1 + 1-line
// blurb) → 4-tile stats strip → tx-density sparkline → blocks table.
export default function Loading() {
  return (
    <>
      <div style={{ paddingTop: 16 }}>
        <Eyebrow>Blocks</Eyebrow>
        <div style={{ marginTop: 24 }}>
          <SkelBlock width="60%" height={56} />
          <div style={{ marginTop: 16 }}>
            <SkelBlock width="55%" height={12} />
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 40,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 0,
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <FrameCard
            key={i}
            padding={20}
            style={{ borderRight: i === 3 ? '1px solid var(--color-line)' : 0 }}
          >
            <SkelBlock width={90} height={10} />
            <div style={{ marginTop: 12 }}>
              <SkelBlock width="55%" height={36} />
            </div>
          </FrameCard>
        ))}
      </div>

      <div style={{ marginTop: 32, marginBottom: 8 }}>
        <SkelBlock width={140} height={10} />
        <div style={{ marginTop: 8 }}>
          <SkelBlock width="100%" height={48} />
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <SkelListTableCard
          headers={['Height', 'Hash', 'Time', 'Txs']}
          rows={12}
        />
      </div>
    </>
  )
}
