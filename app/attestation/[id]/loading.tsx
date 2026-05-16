import { SkelBlock, SkelDetailGrid } from '@/components/skeleton'
import { Eyebrow } from '@/components/ui'

// Mirrors /attestation/[id]: back link → eyebrow → schema-name +
// "attestation" → compound id + copy → 2-col Binding + Quorum grid
// → caveat paragraph.
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
          ← Attestations
        </span>
      </div>
      <Eyebrow>Attestation</Eyebrow>
      <div style={{ marginTop: 20 }}>
        <SkelBlock width="55%" height={32} />
        <div style={{ marginTop: 16 }}>
          <SkelBlock width="80%" height={12} />
        </div>
      </div>
      <div style={{ marginTop: 48 }}>
        <SkelDetailGrid
          leftLabel="Binding"
          rightLabel="Quorum & inclusion"
          rowsPerColumn={4}
        />
      </div>
      <div style={{ marginTop: 48 }}>
        <SkelBlock width="60%" height={11} />
      </div>
    </>
  )
}
