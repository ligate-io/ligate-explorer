import {
  SkelBlock,
  SkelCard,
  SkelDetailGrid,
  SkelLine,
} from '@/components/skeleton'
import { Eyebrow, FrameCard } from '@/components/ui'

// Mirrors the real /tx/[hash] silhouette:
// back link → eyebrow + type/status chips → big hash + copy →
// "in block #N · time" → Action card → Lifecycle card →
// 2-col Header + Fees grid → Raw transaction card.
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
          ← Transactions
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 12,
        }}
      >
        <Eyebrow>Transaction</Eyebrow>
        <SkelBlock width={120} height={14} />
        <SkelBlock width={80} height={20} />
      </div>

      <div style={{ marginBottom: 8 }}>
        <SkelBlock width="70%" height={18} />
      </div>
      <div style={{ marginBottom: 36 }}>
        <SkelBlock width="40%" height={11} />
      </div>

      {/* Action card */}
      <div style={{ marginBottom: 36 }}>
        <SkelCard height={140} />
      </div>

      {/* Lifecycle card */}
      <div style={{ marginBottom: 36 }}>
        <Eyebrow>Lifecycle</Eyebrow>
        <FrameCard padding={20} style={{ marginTop: 12 }}>
          <SkelBlock width="100%" height={48} />
        </FrameCard>
      </div>

      {/* Header + Fees grid */}
      <SkelDetailGrid leftLabel="Header" rightLabel="Fees & execution" />

      {/* Raw transaction */}
      <div style={{ marginTop: 56 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <Eyebrow>Raw transaction</Eyebrow>
          <SkelBlock width={120} height={10} />
        </div>
        <FrameCard padding={20}>
          <SkelLine width="100%" height={10} style={{ marginBottom: 8 }} />
          <SkelLine width="85%" height={10} style={{ marginBottom: 8 }} />
          <SkelLine width="92%" height={10} style={{ marginBottom: 8 }} />
          <SkelLine width="70%" height={10} style={{ marginBottom: 8 }} />
          <SkelLine width="80%" height={10} />
        </FrameCard>
      </div>
    </>
  )
}
