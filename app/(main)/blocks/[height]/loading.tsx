import {
  SkelBlock,
  SkelDetailGrid,
  SkelListTableCard,
} from '@/components/skeleton'
import { Eyebrow } from '@/components/ui'

// Mirrors /blocks/[height]: back link → eyebrow + finality chip →
// big "#N" + prev/next buttons → 2-col Identity + Production →
// Transactions-in-this-block table.
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
          ← Blocks
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 16,
        }}
      >
        <Eyebrow>Block</Eyebrow>
        <SkelBlock width={90} height={20} />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 24,
          marginBottom: 32,
        }}
      >
        <SkelBlock width={220} height={88} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
          <SkelBlock width={80} height={36} />
          <SkelBlock width={80} height={36} />
        </div>
      </div>

      <SkelDetailGrid
        leftLabel="Identity"
        rightLabel="Production"
        rowsPerColumn={4}
      />

      <div style={{ marginTop: 56 }}>
        <Eyebrow>Transactions in this block</Eyebrow>
        <div style={{ marginTop: 12 }}>
          <SkelListTableCard
            headers={['Hash', 'Sender', 'Type', 'Status', 'Gas fee', 'Time']}
            rows={6}
          />
        </div>
      </div>
    </>
  )
}
