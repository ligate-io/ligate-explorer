import { SkelBlock } from '@/components/skeleton'
import { Eyebrow, FrameCard } from '@/components/ui'

export default function Loading() {
  return (
    <>
      <div style={{ paddingTop: 16 }}>
        <Eyebrow>Chain stats</Eyebrow>
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
        style={{
          marginTop: 40,
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <FrameCard key={i} padding={28}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 18,
              }}
            >
              <div>
                <SkelBlock width={120} height={10} />
                <div style={{ marginTop: 8 }}>
                  <SkelBlock width={140} height={38} />
                </div>
              </div>
              <SkelBlock width={40} height={10} />
            </div>
            <SkelBlock width="100%" height={180} style={{ display: 'block' }} />
          </FrameCard>
        ))}
      </div>
    </>
  )
}
