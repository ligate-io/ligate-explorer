import { SkelBlock, SkelListTableCard } from '@/components/skeleton'
import { Eyebrow, FrameCard } from '@/components/ui'

// Mirrors /address/[addr]: back link → eyebrow → full address →
// 3 stat tiles (balance / tx count / first seen) → Recent transactions.
export default function Loading() {
  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-subtle)',
          }}
        >
          ← Home
        </span>
      </div>
      <Eyebrow>Address</Eyebrow>
      <div
        style={{
          marginTop: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <SkelBlock width="60%" height={20} />
        <SkelBlock width={56} height={20} />
      </div>

      <div
        style={{
          marginTop: 32,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 0,
        }}
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <FrameCard
            key={i}
            padding={24}
            style={{ borderRight: i === 2 ? '1px solid var(--color-line)' : 0 }}
          >
            <SkelBlock width={90} height={10} />
            <div style={{ marginTop: 12 }}>
              <SkelBlock width="55%" height={36} />
            </div>
            <div style={{ marginTop: 8 }}>
              <SkelBlock width="40%" height={11} />
            </div>
          </FrameCard>
        ))}
      </div>

      <div style={{ marginTop: 56 }}>
        <Eyebrow>Recent transactions</Eyebrow>
        <div style={{ marginTop: 12 }}>
          <SkelListTableCard
            headers={['Hash', 'Block', 'Sender', 'Type', 'Status', 'Gas fee', 'Time']}
            rows={8}
          />
        </div>
      </div>
    </>
  )
}
