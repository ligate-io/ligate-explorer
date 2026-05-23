import { SkelBlock, SkelListTableCard } from '@/components/skeleton'
import { Eyebrow } from '@/components/ui'

// Mirrors /attestor-set/[id]: back link → eyebrow → 2-col title +
// threshold ring → Registry rows → Members table → Bound schemas
// table → Recent attestations table.
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
          ← Attestor sets
        </span>
      </div>
      <Eyebrow>Attestor set</Eyebrow>

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
          <SkelBlock width="55%" height={32} />
          <div style={{ marginTop: 16 }}>
            <SkelBlock width="80%" height={12} />
          </div>
        </div>
        <SkelBlock width={140} height={140} />
      </div>

      <div style={{ marginTop: 48, maxWidth: 480 }}>
        <Eyebrow>Registry</Eyebrow>
        <div style={{ marginTop: 12 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 1fr',
                gap: 16,
                padding: '14px 0',
                borderBottom: '1px solid var(--color-line)',
              }}
            >
              <SkelBlock width={70} height={10} />
              <SkelBlock width="60%" height={12} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 48 }}>
        <Eyebrow>Members</Eyebrow>
        <div style={{ marginTop: 12 }}>
          <SkelListTableCard headers={['#', 'Public key']} rows={3} />
        </div>
      </div>

      <div style={{ marginTop: 48 }}>
        <Eyebrow>Bound schemas</Eyebrow>
        <div style={{ marginTop: 12 }}>
          <SkelListTableCard
            headers={['Name', 'Schema ID', 'Version']}
            rows={2}
          />
        </div>
      </div>

      <div style={{ marginTop: 48 }}>
        <Eyebrow>Recent attestations</Eyebrow>
        <div style={{ marginTop: 12 }}>
          <SkelListTableCard
            headers={[
              'Submitter',
              'Schema',
              'Payload hash',
              'Sigs',
              'Block',
              'Time',
            ]}
            rows={5}
          />
        </div>
      </div>
    </>
  )
}
