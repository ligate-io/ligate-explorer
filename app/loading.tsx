import {
  SkelBlock,
  SkelCard,
  SkelHomeTableCard,
} from '@/components/skeleton'
import { FrameCard, Eyebrow } from '@/components/ui'

// Home page first-paint skeleton. Renders only on hard navigation TO
// `/` — router.refresh() (the polling cycle on this page) keeps the
// existing UI mounted, so this fallback does NOT appear every 6s.
//
// The silhouette mirrors `app/page.tsx`'s four rows:
//   - Hero text band (eyebrow + serif title + blurb)
//   - StatsStrip (6 KPI tiles)
//   - Row 1 (block ticker / supply / 24h txs)
//   - Row 2 (daily attestations heatmap / attestor sets / fee tracker)
//   - Row 3 (schemas + latest attestations)
//   - Row 4 (latest blocks + latest transactions)
// So when the real content swaps in, layout stays put.
export default function Loading() {
  return (
    <>
      <section
        style={{
          position: 'relative',
          padding: '40px 0 28px',
          overflow: 'hidden',
        }}
      >
        <Eyebrow>Ligate Chain · devnet 1</Eyebrow>
        <div style={{ marginTop: 18 }}>
          <SkelBlock width="70%" height={56} />
        </div>
        <div style={{ marginTop: 18 }}>
          <SkelBlock width="60%" height={12} />
        </div>
      </section>

      {/* Stats strip — 6 KPI tiles in a flex row. */}
      <div style={{ marginBottom: 24 }}>
        <FrameCard padding={0} style={{ background: 'var(--color-surface)' }}>
          <div className="stats-strip-inner" style={{ display: 'flex' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  padding: '18px 22px',
                  borderRight:
                    i < 5 ? '1px solid var(--color-line)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <SkelBlock width={70} height={9} />
                <SkelBlock width="60%" height={18} />
              </div>
            ))}
          </div>
        </FrameCard>
      </div>

      {/* Row 1: block ticker / supply / 24h txs */}
      <div className="grid-3" style={{ gap: 24, marginBottom: 24 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <SkelCard key={i} height={200}>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <SkelBlock width={90} height={10} />
              <SkelBlock width="50%" height={24} />
              <div style={{ marginTop: 12 }}>
                <SkelBlock width="100%" height={36} />
              </div>
            </div>
          </SkelCard>
        ))}
      </div>

      {/* Row 2: daily attestations / attestor sets / fee tracker */}
      <div className="grid-3" style={{ gap: 24, marginBottom: 24 }}>
        <SkelCard height={220}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <SkelBlock width={100} height={10} />
            <SkelBlock width={50} height={10} />
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
              gap: 3,
            }}
          >
            {Array.from({ length: 30 }).map((_, i) => (
              <SkelBlock key={i} height={18} />
            ))}
          </div>
        </SkelCard>
        <SkelCard height={220}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <SkelBlock width={90} height={10} />
            <SkelBlock width={50} height={10} />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 0',
                borderBottom: i < 3 ? '1px solid var(--color-line)' : 0,
              }}
            >
              <SkelBlock width="55%" height={11} />
              <SkelBlock width={40} height={11} />
            </div>
          ))}
        </SkelCard>
        <SkelCard height={220}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <SkelBlock width={70} height={10} />
            <SkelBlock width="80%" height={26} />
            <SkelBlock width="100%" height={6} />
            <div style={{ display: 'flex', gap: 14 }}>
              <SkelBlock width="33%" height={28} />
              <SkelBlock width="33%" height={28} />
              <SkelBlock width="33%" height={28} />
            </div>
          </div>
        </SkelCard>
      </div>

      {/* Row 3: schemas + latest attestations */}
      <section
        className="grid-2"
        style={{ gap: 24, alignItems: 'stretch', marginBottom: 24 }}
      >
        <SkelHomeTableCard
          eyebrowWidth={70}
          headers={['Name', 'Threshold', 'Attestations']}
          rows={5}
        />
        <SkelHomeTableCard
          eyebrowWidth={130}
          headers={['Payload', 'Block', 'Submitter', 'Sigs']}
          rows={5}
        />
      </section>

      {/* Row 4: latest blocks + latest transactions */}
      <section
        className="grid-2"
        style={{ gap: 24, alignItems: 'stretch' }}
      >
        <SkelHomeTableCard
          eyebrowWidth={110}
          headers={['Height', 'Hash', 'Time', 'Txs']}
          rows={10}
        />
        <SkelHomeTableCard
          eyebrowWidth={150}
          headers={['Hash', 'Sender', 'Type', 'Fee', 'Time']}
          rows={10}
        />
      </section>
    </>
  )
}
