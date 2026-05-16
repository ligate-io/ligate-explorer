import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  getAttestorSet,
  getAttestorSetAttestationsList,
  getSchemasForSet,
} from '@/lib/api'
import { ago, trunc } from '@/lib/format'
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
    title: s ? `Attestor set ${trunc(s.id, 8, 6)}` : 'Attestor set',
  }
}

export default async function AttestorSetPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  // Set detail + recent attestations + bound schemas co-fetched.
  // `getSchemasForSet` uses /v1/schemas?attestor_set_id=X (ligate-api
  // PR #45 Tier 1.2) — server returns only the schemas bound to this
  // set, no client-side scan over the full schema list.
  const [s, attsPage, boundSchemas] = await Promise.all([
    getAttestorSet(id),
    getAttestorSetAttestationsList(id, undefined, 10),
    getSchemasForSet(id),
  ])
  if (!s) notFound()
  const atts = attsPage.items

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
        className="detail-grid-2"
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
              fontSize: 'clamp(32px, 7vw, 48px)',
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
              {s.id}
            </span>
            <CopyButton value={s.id} />
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
                label: 'Registered',
                value: (
                  <Link
                    href={`/blocks/${s.registered_at.block_height}`}
                    className="link"
                  >
                    #{s.registered_at.block_height}
                  </Link>
                ),
              },
            ]}
          />
        </div>
      </div>

      <div style={{ marginTop: 48 }}>
        <Eyebrow>Members ({s.members.length})</Eyebrow>
        <FrameCard padding={0} style={{ marginTop: 12 }} scrollX>
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
        <Eyebrow>Bound schemas ({boundSchemas.length})</Eyebrow>
        <FrameCard padding={0} style={{ marginTop: 12 }} scrollX>
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
              {boundSchemas.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      padding: '32px 22px',
                      textAlign: 'center',
                      color: 'var(--color-subtle)',
                    }}
                  >
                    <span
                      className="mono"
                      style={{ fontSize: 11, letterSpacing: '0.18em' }}
                    >
                      No schemas bound to this set
                    </span>
                  </td>
                </tr>
              ) : (
                boundSchemas.map((bs) => (
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
                    <td
                      className="mono"
                      style={{ color: 'var(--color-muted)' }}
                    >
                      v{bs.version}
                    </td>
                    <td style={{ width: 24, textAlign: 'right' }}>
                      <span className="row-arrow">
                        <ArrowRight />
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </FrameCard>
      </div>

      <div style={{ marginTop: 48 }}>
        <Eyebrow>Recent attestations</Eyebrow>
        <FrameCard padding={0} style={{ marginTop: 12 }} scrollX>
          <table className="tbl">
            <thead>
              <tr>
                <th>Submitter</th>
                <th>Schema</th>
                <th>Payload hash</th>
                <th>Sigs</th>
                <th>Block</th>
                <th>Time</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {atts.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: '32px 22px',
                      textAlign: 'center',
                      color: 'var(--color-subtle)',
                    }}
                  >
                    <span
                      className="mono"
                      style={{ fontSize: 11, letterSpacing: '0.18em' }}
                    >
                      No attestations from this set yet
                    </span>
                  </td>
                </tr>
              ) : (
                atts.map((a) => {
                  const tMs = Date.parse(a.submitted_at.timestamp)
                  return (
                    <tr key={a.id}>
                      <td>
                        <Link
                          href={`/address/${a.submitter}`}
                          className="h-mono"
                        >
                          {trunc(a.submitter, 6, 4)}
                        </Link>
                      </td>
                      <td>
                        <Link
                          href={`/schema/${a.schema_id}`}
                          className="h-mono"
                          title={a.schema_id}
                        >
                          {trunc(a.schema_id, 8, 4)}
                        </Link>
                      </td>
                      <td>
                        <Link
                          href={`/attestation/${a.id}`}
                          className="h-mono"
                          title={a.payload_hash}
                        >
                          {trunc(a.payload_hash, 10, 8)}
                        </Link>
                      </td>
                      <td>
                        <span
                          className="mono"
                          style={{ color: 'var(--color-accent)' }}
                        >
                          {a.signature_count}
                        </span>
                      </td>
                      <td>
                        <Link
                          href={`/blocks/${a.submitted_at.block_height}`}
                          className="mono"
                          style={{ color: 'var(--color-muted)' }}
                        >
                          #{a.submitted_at.block_height}
                        </Link>
                      </td>
                      <td>
                        <span
                          className="mono"
                          style={{ color: 'var(--color-muted)' }}
                        >
                          {Number.isFinite(tMs)
                            ? ago(Math.floor((Date.now() - tMs) / 1000))
                            : '—'}
                        </span>
                      </td>
                      <td style={{ width: 24, textAlign: 'right' }}>
                        <span className="row-arrow">
                          <ArrowRight />
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </FrameCard>
      </div>
    </>
  )
}
