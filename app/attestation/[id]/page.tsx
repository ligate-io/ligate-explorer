import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAttestation } from '@/lib/api'
import { ago, isoDate, trunc } from '@/lib/format'
import { CopyButton } from '@/components/copy-button'
import { Eyebrow, LV } from '@/components/ui'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const a = await getAttestation(id)
  return { title: a ? `Attestation ${trunc(a.attestation_id, 8, 6)}` : 'Attestation' }
}

export default async function AttestationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const a = await getAttestation(id)
  if (!a) notFound()

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
            fontSize: 48,
            lineHeight: 1.05,
            color: 'var(--color-ink)',
            margin: 0,
            fontWeight: 400,
          }}
        >
          {a.schema_name}{' '}
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
              fontSize: 14,
              color: 'var(--color-bone)',
              wordBreak: 'break-all',
            }}
          >
            {a.attestation_id}
          </span>
          <CopyButton value={a.attestation_id} />
        </div>
      </div>

      <div
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
                      {a.schema_name}
                    </Link>
                  ),
                },
                {
                  label: 'Attestor set',
                  value: (
                    <Link
                      href={`/attestor-set/${a.attestor_set_id}`}
                      className="link"
                    >
                      {trunc(a.attestor_set_id, 12, 8)}
                    </Link>
                  ),
                },
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
                      {a.signature_count} collected{' '}
                      <span style={{ color: 'var(--color-subtle)' }}>
                        (threshold {a.threshold})
                      </span>
                    </span>
                  ),
                },
                {
                  label: 'Block',
                  value: (
                    <Link
                      href={`/blocks/${a.block_height}`}
                      className="link"
                    >
                      #{a.block_height}
                    </Link>
                  ),
                },
                {
                  label: 'Transaction',
                  value: (
                    <Link href={`/tx/${a.tx_hash}`} className="link">
                      {trunc(a.tx_hash, 12, 8)}
                    </Link>
                  ),
                },
                {
                  label: 'Submitted',
                  value: (
                    <>
                      {isoDate(a.timestamp)}{' '}
                      <span style={{ color: 'var(--color-subtle)' }}>
                        ({ago(Math.floor((Date.now() - a.timestamp) / 1000))})
                      </span>
                    </>
                  ),
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
        The payload itself never touches the chain — verification is done by
        re-hashing the off-chain payload and checking it against this record.
      </p>
    </>
  )
}
