import {
  SkelBlock,
  SkelDetailGrid,
  SkelListTableCard,
} from '@/components/skeleton'
import { Eyebrow } from '@/components/ui'

// Mirrors /schema/[id]: back link → eyebrow → 2-col name+id + threshold
// ring → 2-col Definition + Routing grid → Recent attestations table.
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
          ← Schemas
        </span>
      </div>
      <Eyebrow>Schema</Eyebrow>

      <div
        style={{
          marginTop: 20,
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: 40,
          alignItems: 'flex-end',
        }}
      >
        <div>
          <SkelBlock width="60%" height={48} />
          <div style={{ marginTop: 16 }}>
            <SkelBlock width="80%" height={12} />
          </div>
          <div style={{ marginTop: 16 }}>
            <SkelBlock width="90%" height={12} />
          </div>
        </div>
        <SkelBlock width={140} height={140} />
      </div>

      <div style={{ marginTop: 48 }}>
        <SkelDetailGrid
          leftLabel="Definition"
          rightLabel="Routing & shape"
          rowsPerColumn={3}
        />
      </div>

      <div style={{ marginTop: 56 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <Eyebrow>Recent attestations</Eyebrow>
          <SkelBlock width={56} height={10} />
        </div>
        <SkelListTableCard
          headers={['Submitter', 'Payload hash', 'Sigs', 'Block', 'Time']}
          rows={6}
        />
      </div>
    </>
  )
}
