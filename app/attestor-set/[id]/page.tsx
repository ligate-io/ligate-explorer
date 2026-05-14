import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAttestorSet } from '@/lib/api'
import { trunc } from '@/lib/format'
import { CopyButton } from '@/components/copy-button'
import { ArrowRight, ThresholdRing } from '@/components/svgs'
import { Eyebrow, FrameCard, LV } from '@/components/ui'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const s = await getAttestorSet(id)
  return {
    title: s
      ? `Attestor set ${trunc(s.attestor_set_id, 8, 6)}`
      : 'Attestor set',
  }
}

export default async function AttestorSetPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const s = await getAttestorSet(id)
  if (!s) notFound()

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/attestor-sets"
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-subtle)',
          }}
        >
          ← Attestor sets
        </Link>
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
          <h1
            className="serif"
            style={{
              fontSize: 48,
              lineHeight: 1.05,
              color: 'var(--color-ink)',
              margin: 0,
              fontWeight: 400,
            }}
          >
            {s.threshold}-of-{s.members.length}{' '}
            <span style={{ color: 'var(--color-subtle)', fontStyle: 'italic' }}>
              quorum
            </span>
          </h1>
          <div
            style={{
              marginTop: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <span
              className="mono"
              style={{
                fontSize: 14,
                color: 'var(--color-bone)',
                wordBreak: 'break-all',
              }}
            >
              {s.attestor_set_id}
            </span>
            <CopyButton value={s.attestor_set_id} />
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <ThresholdRing
            have={s.threshold}
            total={s.members.length}
            size={140}
          />
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--color-subtle)',
              marginTop: 12,
            }}
          >
            Signing threshold
          </div>
        </div>
      </div>

      <div style={{ marginTop: 48 }}>
        <Eyebrow>Registry</Eyebrow>
        <div style={{ marginTop: 12, maxWidth: 480 }}>
          <LV
            rows={[
              {
                label: 'Threshold',
                value: (
                  <span style={{ color: 'var(--color-accent)' }}>
                    {s.threshold} of {s.members.length}
                  </span>
                ),
              },
              { label: 'Schemas bound', value: String(s.schema_count) },
              {
                label: 'Attestations',
                value: s.attestation_count.toLocaleString(),
              },
              {
                label: 'Registered',
                value: (
                  <Link
                    href={`/blocks/${s.registered_block}`}
                    className="link"
                  >
                    #{s.registered_block}
                  </Link>
                ),
              },
            ]}
          />
        </div>
      </div>

      <div style={{ marginTop: 48 }}>
        <Eyebrow>Members ({s.members.length})</Eyebrow>
        <FrameCard padding={0} style={{ marginTop: 12 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>Public key</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {s.members.map((pk, i) => (
                <tr key={pk}>
                  <td className="mono" style={{ color: 'var(--color-subtle)' }}>
                    {i + 1}
                  </td>
                  <td>
                    <span
                      className="mono"
                      style={{
                        color: 'var(--color-bone)',
                        wordBreak: 'break-all',
                      }}
                    >
                      {pk}
                    </span>
                  </td>
                  <td style={{ width: 24, textAlign: 'right' }}>
                    <CopyButton value={pk} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </FrameCard>
      </div>

      <div style={{ marginTop: 48 }}>
        <Eyebrow>Bound schemas</Eyebrow>
        <FrameCard padding={0} style={{ marginTop: 12 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Name</th>
                <th>Schema ID</th>
                <th>Version</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {s.bound_schemas.map((bs) => (
                <tr key={bs.schema_id}>
                  <td>
                    <Link
                      href={`/schema/${bs.schema_id}`}
                      className="serif"
                      style={{ fontSize: 16, color: 'var(--color-ink)' }}
                    >
                      {bs.name}
                    </Link>
                  </td>
                  <td>
                    <Link
                      href={`/schema/${bs.schema_id}`}
                      className="h-mono"
                    >
                      {trunc(bs.schema_id, 8, 6)}
                    </Link>
                  </td>
                  <td className="mono" style={{ color: 'var(--color-muted)' }}>
                    v{bs.version}
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
      </div>
    </>
  )
}
