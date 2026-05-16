import type { Metadata } from 'next'
import Link from 'next/link'
import { getSchemas } from '@/lib/api'
import { trunc } from '@/lib/format'
import { ArrowRight } from '@/components/svgs'
import { Eyebrow, FrameCard } from '@/components/ui'

export const metadata: Metadata = { title: 'Schemas' }
export const dynamic = 'force-dynamic'

export default async function SchemasPage() {
  const schemas = await getSchemas()
  return (
    <>
      <div style={{ padding: '48px 0 32px' }}>
        <Eyebrow>Schemas registry</Eyebrow>
        <h1
          className="serif h-hero"
          style={{
            marginTop: 24,
            lineHeight: 1,
            color: 'var(--color-ink)',
            maxWidth: '18ch',
            fontWeight: 400,
          }}
        >
          Every <em style={{ color: 'var(--color-accent)' }}>shape</em> the chain knows.
        </h1>
        <p
          style={{
            color: 'var(--color-muted)',
            maxWidth: 520,
            marginTop: 20,
          }}
        >
          Schemas declare the canonical structure of an attestation payload and the attestor set authorized to sign it.
        </p>
      </div>
      <FrameCard padding={0} scrollX>
        <table className="tbl">
          <thead>
            <tr>
              <th>Name</th>
              <th>Schema ID</th>
              <th>Version</th>
              <th>Owner</th>
              <th>Threshold</th>
              <th>Attestations</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {schemas.map((s) => (
              <tr key={s.schema_id}>
                <td>
                  <Link href={`/schema/${s.schema_id}`} style={{ display: 'block' }}>
                    <div
                      className="serif"
                      style={{ fontSize: 18, color: 'var(--color-ink)' }}
                    >
                      {s.name}
                    </div>
                    <div
                      className="mono"
                      style={{
                        fontSize: 10,
                        color: 'var(--color-subtle)',
                        letterSpacing: '0.1em',
                        marginTop: 2,
                      }}
                    >
                      {s.description}
                    </div>
                  </Link>
                </td>
                <td>
                  <Link href={`/schema/${s.schema_id}`} className="h-mono">
                    {trunc(s.schema_id, 8, 6)}
                  </Link>
                </td>
                <td>
                  <span className="mono" style={{ color: 'var(--color-muted)' }}>
                    v{s.version}
                  </span>
                </td>
                <td>
                  <Link href={`/address/${s.owner}`} className="h-mono">
                    {trunc(s.owner, 6, 4)}
                  </Link>
                </td>
                <td>
                  <span className="mono" style={{ color: 'var(--color-accent)' }}>
                    {s.threshold}
                  </span>
                </td>
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
