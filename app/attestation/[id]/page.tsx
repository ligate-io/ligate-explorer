import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAttestationItem, getSchema, getTx } from '@/lib/api'
import { ago, fmtLgt, fmtLgtTrim, isoDate, trunc } from '@/lib/format'
import { AttestationPending } from '@/components/attestation-pending'
import { CopyButton } from '@/components/copy-button'
import { Eyebrow, LV } from '@/components/ui'

export const dynamic = 'force-dynamic'

// Bech32m attestation id: `lat1<58 chars>` per ligate-chain v0.2.0+
// (`impl_hash32_type!(AttestationId, …, "lat")`). The HRP is fixed at
// `lat1`; the payload is bech32-encoded 32 raw bytes + 6-char checksum.
// Range tolerant: 50-80 chars after the HRP to absorb future encoding
// tweaks without regressing this check.
function isWellFormedAttestationId(id: string): boolean {
  return /^lat1[a-z0-9]{50,80}$/.test(id)
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const a = await getAttestationItem(id)
  return {
    title: a ? `Attestation ${trunc(a.payload_hash, 8, 6)}` : 'Attestation',
  }
}

// Detail page consumes the new `AttestationItem` shape (id, schema_id,
// payload_hash, submitter, signature_count, submitted_at). Schema name +
// threshold + attestor_set_id aren't carried on the attestation row, so
// we cross-fetch /v1/schemas/{id} in parallel for the rich rendering.
// Schema fetch is best-effort: the page still renders if it 404s
// (schema id is always present on the attestation).
export default async function AttestationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const a = await getAttestationItem(id)
  if (!a) {
    // Indexer race: a product like Themisra has soft-verified the
    // attestation and linked here, but the chain → indexer ingest
    // hasn't caught up yet. Render the polling "pending" view rather
    // than a hard 404. Junk ids that don't even match `lat1…` still
    // 404 through to the branded not-found.tsx.
    if (isWellFormedAttestationId(id)) return <AttestationPending id={id} />
    notFound()
  }
  // Schema gives us the human name + threshold; tx gives us the
  // gas + protocol fee burned to land this attestation on chain.
  // Both are best-effort — the page still renders if either 5xx's.
  const [schema, tx] = await Promise.all([
    getSchema(a.schema_id).catch(() => null),
    getTx(a.submitted_at.tx_hash).catch(() => null),
  ])
  const tMs = Date.parse(a.submitted_at.timestamp)
  const tValid = Number.isFinite(tMs)
  const gasNano = tx?.fee_nano ?? null
  const protoNano = tx?.protocol_fee_nano ?? null

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/attestations"
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-subtle)',
          }}
        >
          ← Attestations
        </Link>
      </div>
      <Eyebrow>Attestation</Eyebrow>

      <div style={{ marginTop: 20 }}>
        <h1
          className="serif"
          style={{
            fontSize: 'clamp(32px, 6vw, 48px)',
            lineHeight: 1.05,
            color: 'var(--color-ink)',
            margin: 0,
            fontWeight: 400,
          }}
        >
          {schema?.name ?? 'Schema'}{' '}
          <span style={{ color: 'var(--color-subtle)', fontStyle: 'italic' }}>
            attestation
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
              fontSize: 13,
              color: 'var(--color-bone)',
              wordBreak: 'break-all',
            }}
          >
            {a.id}
          </span>
          <CopyButton value={a.id} />
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
          <Eyebrow>Binding</Eyebrow>
          <div style={{ marginTop: 12 }}>
            <LV
              rows={[
                {
                  label: 'Schema',
                  value: (
                    <Link href={`/schema/${a.schema_id}`} className="link">
                      {schema?.name ?? trunc(a.schema_id, 12, 8)}
                    </Link>
                  ),
                },
                ...(schema?.attestor_set_id
                  ? [
                      {
                        label: 'Attestor set',
                        value: (
                          <Link
                            href={`/attestor-set/${schema.attestor_set_id}`}
                            className="link"
                          >
                            {trunc(schema.attestor_set_id, 12, 8)}
                          </Link>
                        ),
                      },
                    ]
                  : []),
                {
                  label: 'Submitter',
                  value: (
                    <Link href={`/address/${a.submitter}`} className="link">
                      {a.submitter}
                    </Link>
                  ),
                },
                {
                  label: 'Payload hash',
                  value: (
                    <span className="h-mono">
                      {trunc(a.payload_hash, 14, 12)}
                    </span>
                  ),
                },
              ]}
            />
          </div>
        </div>
        <div>
          <Eyebrow>Quorum & inclusion</Eyebrow>
          <div style={{ marginTop: 12 }}>
            <LV
              rows={[
                {
                  label: 'Signatures',
                  value: (
                    <span style={{ color: 'var(--color-accent)' }}>
                      {a.signature_count} collected
                      {schema?.threshold ? (
                        <span style={{ color: 'var(--color-subtle)' }}>
                          {' '}
                          (threshold {schema.threshold})
                        </span>
                      ) : null}
                    </span>
                  ),
                },
                {
                  label: 'Block',
                  value: (
                    <Link
                      href={`/blocks/${a.submitted_at.block_height}`}
                      className="link"
                    >
                      #{a.submitted_at.block_height}
                    </Link>
                  ),
                },
                {
                  label: 'Transaction',
                  value: (
                    <Link
                      href={`/tx/${a.submitted_at.tx_hash}`}
                      className="link"
                    >
                      {trunc(a.submitted_at.tx_hash, 12, 8)}
                    </Link>
                  ),
                },
                {
                  label: 'Submitted',
                  value: tValid ? (
                    <>
                      {isoDate(tMs)}{' '}
                      <span style={{ color: 'var(--color-subtle)' }}>
                        ({ago(Math.floor((Date.now() - tMs) / 1000))})
                      </span>
                    </>
                  ) : (
                    <span style={{ color: 'var(--color-subtle)' }}>—</span>
                  ),
                },
                {
                  label: 'Fee paid',
                  value: <FeeBreakdown gas={gasNano} proto={protoNano} />,
                },
              ]}
            />
          </div>
        </div>
      </div>

      <p
        style={{
          marginTop: 48,
          color: 'var(--color-subtle)',
          fontSize: 13,
          maxWidth: 620,
        }}
      >
        The chain stores only the payload hash and the attestor signatures.
        The payload itself never touches the chain. Verification is done by
        re-hashing the off-chain payload and checking it against this record.
      </p>
    </>
  )
}

// Two-line fee breakdown: gas fee paid by submitter (top, often "not
// exposed yet" while indexer doesn't surface fee_paid_nano) + protocol
// fee burned at execution (amber, when non-zero). Mirrors the table
// FeeCell so attestation detail and tx list use the same vocabulary.
function FeeBreakdown({
  gas,
  proto,
}: {
  gas: string | null
  proto: string | null
}) {
  const hasGas = gas != null && gas !== '0' && gas !== ''
  const hasProto = proto != null && proto !== '0' && proto !== ''
  if (!hasGas && !hasProto) {
    return (
      <span style={{ color: 'var(--color-subtle)' }}>not exposed yet</span>
    )
  }
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 2 }}>
      <span>
        {hasGas ? (
          <>
            {fmtLgt(gas)}{' '}
            <span style={{ color: 'var(--color-subtle)' }}>LGT gas</span>
          </>
        ) : (
          <span style={{ color: 'var(--color-subtle)' }}>0 LGT gas</span>
        )}
      </span>
      {hasProto ? (
        <span style={{ color: 'var(--color-amber)', fontSize: 12 }}>
          + {fmtLgtTrim(proto)} LGT protocol
        </span>
      ) : null}
    </span>
  )
}
