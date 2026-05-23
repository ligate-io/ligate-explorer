import { SkelBlock, SkelDetailGrid } from '@/components/skeleton'
import { Eyebrow, FrameCard } from '@/components/ui'

export default function Loading() {
  return (
    <>
      <div style={{ paddingTop: 16 }}>
        <Eyebrow>Genesis</Eyebrow>
        <div style={{ marginTop: 24, maxWidth: 560 }}>
          <SkelBlock width="80%" height={44} style={{ display: 'block' }} />
          <div style={{ marginTop: 20 }}>
            <SkelBlock width="100%" height={12} style={{ display: 'block' }} />
          </div>
          <div style={{ marginTop: 8 }}>
            <SkelBlock width="70%" height={12} style={{ display: 'block' }} />
          </div>
        </div>
      </div>

      <div
        className="grid-stats-3"
        style={{ marginTop: 40, gap: 0 }}
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <FrameCard
            key={i}
            padding={20}
            style={{
              borderRight: i === 2 ? '1px solid var(--color-line)' : 0,
            }}
          >
            <SkelBlock width={90} height={10} />
            <div style={{ marginTop: 12 }}>
              <SkelBlock width="70%" height={18} />
            </div>
          </FrameCard>
        ))}
      </div>

      <div style={{ marginTop: 56 }}>
        <SkelDetailGrid
          leftLabel="Identity"
          rightLabel="Sequencer at genesis"
          rowsPerColumn={4}
        />
      </div>
    </>
  )
}
