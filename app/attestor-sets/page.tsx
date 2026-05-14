import type { Metadata } from 'next'
import Link from 'next/link'
import { getAttestorSets } from '@/lib/api'
import { trunc } from '@/lib/format'
import { ArrowRight } from '@/components/svgs'
import { Eyebrow, FrameCard } from '@/components/ui'

export const metadata: Metadata = { title: 'Attestor sets' }
export const dynamic = 'force-dynamic'

export default async function AttestorSetsPage() {
  const sets = await getAttestorSets()
  return (
    <>
      <div style={{ padding: '48px 0 32px' }}>
        <Eyebrow>Attestor sets</Eyebrow>
        <h1
          className="serif"
          style={{
            marginTop: 24,
            fontSize: 64,
            lineHeight: 1,
            color: 'var(--color-ink)',
            maxWidth: '18ch',
            fontWeight: 400,
          }}
        >
          Who the chain trusts to{' '}
          <em style={{ color: 'var(--color-accent)' }}>sign</em>.
        </h1>
        <p
          style={{
            color: 'var(--color-muted)',
            maxWidth: 540,
            marginTop: 20,
          }}
        >
          An attestor set is a quorum of public keys plus a threshold. Schemas
          bind to a set; an attestation is valid only if enough of the set
          signed it.
        </p>
      </div>
      <FrameCard padding={0}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Attestor set ID</th>
              <th>Threshold</th>
              <th>Members</th>
              <th>Schemas</th>
              <th>Attestations</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sets.map((s) => (
              <tr key={s.attestor_set_id}>
                <td>
                  <Link
                    href={`/attestor-set/${s.attestor_set_id}`}
                    className="h-mono"
                  >
                    {trunc(s.attestor_set_id, 10, 6)}
                  </Link>
                </td>
                <td>
                  <span className="mono" style={{ color: 'var(--color-accent)' }}>
                    {s.threshold} of {s.members.length}
                  </span>
                </td>
                <td className="mono tab-num">{s.members.length}</td>
                <td className="mono tab-num">{s.schema_count}</td>
                <td className="mono tab-num">
                  {s.attestation_count.toLocaleString()}
                </td>
                <td style={{ width: 24, textAlign: 'right' }}>
                  <span className="row-arrow">
                    <ArrowRight />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </FrameCard>
    </>
  )
}
