import { SkelBlock } from '@/components/skeleton'
import { Eyebrow, FrameCard } from '@/components/ui'

// First-paint skeleton for /info. Mirrors `app/info/page.tsx` —
// eyebrow + serif headline + body paragraph, then the 3-column /
// 2-row grid of 6 chain-fact cards, then placeholders for the
// finality breakdown + genesis/endpoints + resources sections.
// Without this file Next falls back to `app/loading.tsx` (the home
// dashboard silhouette) which is the wrong shape for this route.
export default function Loading() {
  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Eyebrow>Chain info</Eyebrow>
      </div>
      <div style={{ maxWidth: 600 }}>
        <SkelBlock width="80%" height={44} style={{ display: 'block' }} />
        <div style={{ marginTop: 20 }}>
          <SkelBlock width="100%" height={12} style={{ display: 'block' }} />
        </div>
        <div style={{ marginTop: 8 }}>
          <SkelBlock width="60%" height={12} style={{ display: 'block' }} />
        </div>
      </div>

      {/* 6 stat cards in a 3-wide grid (wraps to 2 rows of 3). Same
          chrome the real page uses; only the labels + values are
          replaced with skel placeholders. */}
      <div
        className="grid-stats-3"
        style={{ marginTop: 56, gap: 0 }}
      >
        {Array.from({ length: 6 }).map((_, idx) => (
          <FrameCard
            key={idx}
            padding={24}
            style={{
              borderRight: idx % 3 !== 2 ? 0 : '1px solid var(--color-line)',
              borderBottom: idx < 3 ? 0 : '1px solid var(--color-line)',
            }}
          >
            <SkelBlock width={90} height={10} />
            <div style={{ marginTop: 12 }}>
              <SkelBlock
                width={idx === 2 ? '40%' : '70%'}
                height={idx === 2 ? 32 : 18}
              />
            </div>
          </FrameCard>
        ))}
      </div>

      {/* Finality breakdown card placeholder. */}
      <div style={{ marginTop: 56 }}>
        <Eyebrow>Finality breakdown</Eyebrow>
        <FrameCard padding={28} style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                style={{ display: 'flex', justifyContent: 'space-between' }}
              >
                <SkelBlock width={80} height={11} />
                <SkelBlock width={60} height={11} />
              </div>
            ))}
          </div>
        </FrameCard>
      </div>

      {/* Genesis + Endpoints two-column section placeholder. */}
      <div
        className="detail-grid-2"
        style={{
          marginTop: 56,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 40,
        }}
      >
        {[0, 1].map((c) => (
          <div key={c}>
            <SkelBlock width={90} height={10} />
            <div style={{ marginTop: 14 }}>
              <SkelBlock width="90%" height={14} style={{ display: 'block' }} />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
