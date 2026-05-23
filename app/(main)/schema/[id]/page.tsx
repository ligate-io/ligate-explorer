import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSchema, getSchemaAttestations } from '@/lib/api'
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
  const s = await getSchema(id)
  return { title: s ? `${s.name} v${s.version}` : 'Schema' }
}

export default async function SchemaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  // Schema metadata + the per-schema attestation feed in parallel. The
  // feed uses /v1/schemas/{id}/attestations (ligate-api#39) which
  // returns AttestationItem rows with the compound id we route on.
  // Both fetchers degrade gracefully: schema 404 → notFound, attestation
  // list 5xx → empty section rather than failing the whole detail page.
  const [s, attsPage] = await Promise.all([
    getSchema(id),
    getSchemaAttestations(id, undefined, 10),
  ])
  if (!s) notFound()
  const atts = attsPage.items

  const [haveStr, totalStr] = s.threshold.split(' of ')
  const have = parseInt(haveStr, 10)
  const total = parseInt(totalStr, 10)

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/schemas"
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-subtle)',
          }}
        >
          ← Schemas
        </Link>
      </div>
      <Eyebrow>Schema</Eyebrow>

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
            className="serif h-hero"
            style={{
              lineHeight: 1,
              color: 'var(--color-ink)',
              margin: 0,
              fontWeight: 400,
            }}
          >
            {s.name}{' '}
            <span style={{ color: 'var(--color-subtle)', fontStyle: 'italic' }}>
              v{s.version}
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
              {s.schema_id}
            </span>
            <CopyButton value={s.schema_id} />
          </div>
          <p
            style={{
              color: 'var(--color-muted)',
              fontSize: 14,
              maxWidth: 600,
              marginTop: 16,
            }}
          >
            {s.description}
          </p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <ThresholdRing have={have} total={total} size={140} />
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
            Attestor threshold
          </div>
        </div>
      </div>

      <div
        className="detail-grid-2"
        style={{
          marginTop: 48,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 40,
        }}
      >
        <div>
          <Eyebrow>Definition</Eyebrow>
          <div style={{ marginTop: 12 }}>
            <LV
              rows={[
                {
                  label: 'Owner',
                  value: (
                    <Link href={`/address/${s.owner}`} className="link">
                      {s.owner}
                    </Link>
                  ),
                },
                {
                  label: 'Attestor set',
                  value: (
                    <Link
                      href={`/attestor-set/${s.attestor_set_id}`}
                      className="link"
                    >
                      {s.attestor_set_id}
                    </Link>
                  ),
                },
                {
                  label: 'Threshold',
                  value: (
                    <span style={{ color: 'var(--color-accent)' }}>
                      {s.threshold}
                    </span>
                  ),
                },
              ]}
            />
          </div>
        </div>
        <div>
          <Eyebrow>Routing & shape</Eyebrow>
          <div style={{ marginTop: 12 }}>
            <LV
              rows={[
                {
                  label: 'Fee routing bps',
                  value: (
                    <>
                      {s.fee_routing_bps}{' '}
                      <span style={{ color: 'var(--color-subtle)' }}>
                        = {(s.fee_routing_bps / 100).toFixed(2)}%
                      </span>
                    </>
                  ),
                },
                {
                  label: 'Routing addr',
                  value:
                    s.fee_routing_addr === 'none' ? (
                      <span style={{ color: 'var(--color-subtle)' }}>none</span>
                    ) : (
                      <Link
                        href={`/address/${s.fee_routing_addr}`}
                        className="link"
                      >
                        {trunc(s.fee_routing_addr, 10, 8)}
                      </Link>
                    ),
                },
                {
                  label: 'Payload shape',
                  value: (
                    <span className="h-mono">
                      {trunc(s.payload_shape_hash, 14, 12)}
                    </span>
                  ),
                },
              ]}
            />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 56 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 12,
          }}
        >
          <Eyebrow>Recent attestations</Eyebrow>
          {atts.length > 0 ? (
            <Link
              href={`/attestations?schema=${s.schema_id}`}
              className="mono link"
              style={{
                fontSize: 10,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              View all →
            </Link>
          ) : null}
        </div>
        <FrameCard padding={0} scrollX>
          <table className="tbl">
            <thead>
              <tr>
                <th>Submitter</th>
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
                    colSpan={6}
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
                      No attestations under this schema yet
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
