import type { Metadata } from 'next'
import Link from 'next/link'
import { getAttestations } from '@/lib/api'
import { ago, trunc } from '@/lib/format'
import { ArrowRight } from '@/components/svgs'
import { Eyebrow, FrameCard } from '@/components/ui'

export const metadata: Metadata = { title: 'Attestations' }
export const dynamic = 'force-dynamic'

export default async function AttestationsPage() {
  const attestations = await getAttestations()
  return (
    <>
      <div style={{ padding: '48px 0 32px' }}>
        <Eyebrow>Attestation feed</Eyebrow>
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
          Every <em style={{ color: 'var(--color-accent)' }}>record</em> the
          chain has signed.
        </h1>
        <p
          style={{
            color: 'var(--color-muted)',
            maxWidth: 540,
            marginTop: 20,
          }}
        >
          An attestation binds a payload hash to the schema it was submitted
          under and the attestor set whose threshold signed it. The chain
          stores the hash and the signatures, never the payload itself.
        </p>
      </div>
      <FrameCard padding={0}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Attestation ID</th>
              <th>Schema</th>
              <th>Submitter</th>
              <th>Signatures</th>
              <th>Block</th>
              <th>Time</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {attestations.map((a) => (
              <tr key={a.attestation_id}>
                <td>
                  <Link
                    href={`/attestation/${a.attestation_id}`}
                    className="h-mono"
                  >
                    {trunc(a.attestation_id, 10, 6)}
                  </Link>
                </td>
                <td>
                  <Link
                    href={`/schema/${a.schema_id}`}
                    style={{ display: 'block' }}
                  >
                    <div
                      className="serif"
                      style={{ fontSize: 16, color: 'var(--color-ink)' }}
                    >
                      {a.schema_name}
                    </div>
                  </Link>
                </td>
                <td>
                  <Link href={`/address/${a.submitter}`} className="h-mono">
                    {trunc(a.submitter, 6, 4)}
                  </Link>
                </td>
                <td>
                  <span className="mono" style={{ color: 'var(--color-accent)' }}>
                    {a.signature_count} sigs
                  </span>
                </td>
                <td>
                  <Link
                    href={`/blocks/${a.block_height}`}
                    className="mono"
                    style={{ color: 'var(--color-muted)' }}
                  >
                    #{a.block_height}
                  </Link>
                </td>
                <td className="mono" style={{ color: 'var(--color-muted)' }}>
                  {ago(Math.floor((Date.now() - a.timestamp) / 1000))}
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
