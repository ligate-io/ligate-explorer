import { SkelBlock, SkelListTableCard } from '@/components/skeleton'
import { Eyebrow, FrameCard } from '@/components/ui'

// First-paint skeleton for /holders. Mirrors `app/holders/page.tsx`
// shape so the swap-in doesn't reflow.
export default function Loading() {
  return (
    <>
      <div style={{ paddingTop: 16 }}>
        <Eyebrow>LGT holders</Eyebrow>
        <div style={{ marginTop: 24, maxWidth: 540 }}>
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
              borderRight:
                i === 2 ? '1px solid var(--color-line)' : 0,
            }}
          >
            <SkelBlock width={90} height={10} />
            <div style={{ marginTop: 12 }}>
              <SkelBlock width="55%" height={32} />
            </div>
            <div style={{ marginTop: 12 }}>
              <SkelBlock width={120} height={9} />
            </div>
          </FrameCard>
        ))}
      </div>

      <div style={{ marginTop: 40 }}>
        <SkelListTableCard
          headers={['Rank', 'Address', 'Balance', '% of supply']}
          rows={20}
        />
      </div>
    </>
  )
}
