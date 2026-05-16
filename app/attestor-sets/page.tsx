import type { Metadata } from 'next'
import Link from 'next/link'
import { getAttestorSetItems } from '@/lib/api'
import { ago, trunc } from '@/lib/format'
import { ArrowRight } from '@/components/svgs'
import { Pagination } from '@/components/pagination'
import { Eyebrow, FrameCard } from '@/components/ui'

export const metadata: Metadata = { title: 'Attestor sets' }
export const dynamic = 'force-dynamic'

const PER_PAGE = 25

export default async function AttestorSetsPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>
}) {
  const { cursor } = await searchParams
  // Cursor-paginated list per ligate-api#39. The new wire shape doesn't
  // carry attestation_count (that lives on the detail endpoint to avoid
  // a count(*) on every list row), so the list table drops that column.
  const page = await getAttestorSetItems(cursor, PER_PAGE)

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
              <th>Registered</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {page.items.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
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
                    No attestor sets registered yet
                  </span>
                </td>
              </tr>
            ) : (
              page.items.map((s) => {
                const tMs = Date.parse(s.registered_at.timestamp)
                return (
                  <tr key={s.id}>
                    <td>
                      <Link
                        href={`/attestor-set/${s.id}`}
                        className="h-mono"
                        title={s.id}
                      >
                        {trunc(s.id, 10, 6)}
                      </Link>
                    </td>
                    <td>
                      <span
                        className="mono"
                        style={{ color: 'var(--color-accent)' }}
                      >
                        {s.threshold} of {s.members.length}
                      </span>
                    </td>
                    <td className="mono tab-num">{s.members.length}</td>
                    <td className="mono tab-num">{s.schema_count}</td>
                    <td className="mono" style={{ color: 'var(--color-muted)' }}>
                      {Number.isFinite(tMs) ? (
                        <Link
                          href={`/blocks/${s.registered_at.block_height}`}
                          className="mono"
                          style={{ color: 'var(--color-muted)' }}
                          title={`Block #${s.registered_at.block_height}`}
                        >
                          {ago(Math.floor((Date.now() - tMs) / 1000))}
                        </Link>
                      ) : (
                        <Link
                          href={`/blocks/${s.registered_at.block_height}`}
                          className="mono"
                          style={{ color: 'var(--color-muted)' }}
                        >
                          #{s.registered_at.block_height}
                        </Link>
                      )}
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
        basePath="/attestor-sets"
        cursor={cursor}
        nextCursor={page.nextCursor}
        itemsOnPage={page.items.length}
      />
    </>
  )
}
