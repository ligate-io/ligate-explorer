import type { Metadata } from 'next'
import Link from 'next/link'
import { getAttestationItems } from '@/lib/api'
import { ago, trunc } from '@/lib/format'
import { ArrowRight } from '@/components/svgs'
import { Pagination } from '@/components/pagination'
import { Eyebrow, FrameCard } from '@/components/ui'

export const metadata: Metadata = { title: 'Attestations' }
export const dynamic = 'force-dynamic'

const PER_PAGE = 25

export default async function AttestationsPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>
}) {
  const { cursor } = await searchParams
  // /v1/attestations is cursor-paginated (RFC 0001). The fetcher hides
  // the `{data, pagination}` envelope and degrades to an empty page
  // when api 5xx's, so the empty-state copy stays accurate either way.
  const page = await getAttestationItems(cursor, PER_PAGE)

  return (
    <>
      <div style={{ padding: '48px 0 32px' }}>
        <Eyebrow>Attestation feed</Eyebrow>
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
          under and the attestor set whose threshold signed it. Only the
          hash and the signatures land on chain; the payload itself stays
          off.
        </p>
      </div>
      <FrameCard padding={0} scrollX>
        <table className="tbl">
          <thead>
            <tr>
              <th>Payload</th>
              <th>Schema</th>
              <th>Submitter</th>
              <th>Sigs</th>
              <th>Block</th>
              <th>Time</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {page.items.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: '48px 22px',
                    textAlign: 'center',
                    color: 'var(--color-subtle)',
                  }}
                >
                  <span
                    className="mono"
                    style={{ fontSize: 11, letterSpacing: '0.18em' }}
                  >
                    No attestations indexed yet
                  </span>
                </td>
              </tr>
            ) : (
              page.items.map((a) => {
                // submitted_at.timestamp is an ISO8601 string per the
                // new wire shape; coerce to ms once for `ago()`.
                const tMs = Date.parse(a.submitted_at.timestamp)
                return (
                  <tr key={a.id}>
                    <td>
                      <Link
                        href={`/attestation/${a.id}`}
                        className="h-mono"
                        title={a.payload_hash}
                      >
                        {trunc(a.payload_hash, 10, 6)}
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
                        href={`/address/${a.submitter}`}
                        className="h-mono"
                      >
                        {trunc(a.submitter, 6, 4)}
                      </Link>
                    </td>
                    <td>
                      <span
                        className="mono"
                        style={{ color: 'var(--color-accent)' }}
                      >
                        {a.signature_count} sigs
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
                    <td className="mono" style={{ color: 'var(--color-muted)' }}>
                      {Number.isFinite(tMs)
                        ? ago(Math.floor((Date.now() - tMs) / 1000))
                        : '—'}
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

      <Pagination
        basePath="/attestations"
        cursor={cursor}
        nextCursor={page.nextCursor}
        itemsOnPage={page.items.length}
      />
    </>
  )
}
