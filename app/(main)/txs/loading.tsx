import { SkelBlock, SkelListTableCard } from '@/components/skeleton'
import { Eyebrow, FrameCard } from '@/components/ui'

// /txs list silhouette: hero + 4-tile stats strip + filter tabs
// (All / SubmitAttestation / RegisterSchema / Transfer / …) + table.
export default function Loading() {
  return (
    <>
      <div style={{ paddingTop: 16 }}>
        <Eyebrow>Transactions</Eyebrow>
        <div style={{ marginTop: 24 }}>
          <SkelBlock width="55%" height={56} />
          <div style={{ marginTop: 16 }}>
            <SkelBlock width="50%" height={12} />
          </div>
        </div>
      </div>

      <div
        className="grid-stats-4"
        style={{ marginTop: 40, gap: 0 }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <FrameCard
            key={i}
            padding={20}
            style={{ borderRight: i === 3 ? '1px solid var(--color-line)' : 0 }}
          >
            <SkelBlock width={70} height={10} />
            <div style={{ marginTop: 12 }}>
              <SkelBlock width="50%" height={36} />
            </div>
          </FrameCard>
        ))}
      </div>

      <div
        style={{
          marginTop: 40,
          display: 'flex',
          gap: 32,
          padding: '14px 0',
          borderBottom: '1px solid var(--color-line)',
        }}
      >
        {Array.from({ length: 7 }).map((_, i) => (
          <SkelBlock key={i} width={100} height={11} />
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        <SkelListTableCard
          headers={['Hash', 'Block', 'Sender', 'Type', 'Status', 'Gas fee', 'Time']}
          rows={12}
        />
      </div>
    </>
  )
}
