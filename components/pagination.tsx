'use client'

// Cursor-paginated nav for list pages. URL state is `?cursor=<opaque>`
// (omitted on page 1); `extraParams` is passed through so filters
// survive paging. Forward-only by design: "prev" uses browser back per
// RFC 0001 (cursors are opaque so we don't synthesise a previous one
// in the URL).

import Link from 'next/link'

export function Pagination({
  basePath,
  cursor,
  nextCursor,
  itemsOnPage,
  extraParams = {},
}: {
  basePath: string
  /** Current page's cursor; undefined / null on the first page. */
  cursor?: string | null
  /** Next page's cursor, or null when this is the last page. */
  nextCursor: string | null
  /** Items rendered on the current page, used in the "Showing N items" footer. */
  itemsOnPage: number
  extraParams?: Record<string, string | undefined>
}) {
  const buildHref = (c: string) => {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(extraParams)) {
      if (v) params.set(k, v)
    }
    params.set('cursor', c)
    return `${basePath}?${params.toString()}`
  }

  const onFirstPage = !cursor
  const noMorePages = nextCursor === null

  return (
    <div
      style={{
        marginTop: 24,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div
        className="mono"
        style={{
          fontSize: 11,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--color-subtle)',
        }}
      >
        Showing {itemsOnPage} {itemsOnPage === 1 ? 'item' : 'items'}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {onFirstPage ? (
          <span
            className="btn"
            style={{ padding: '8px 14px', fontSize: 10, opacity: 0.4 }}
          >
            ← prev
          </span>
        ) : (
          // Browser back rather than a server-routable URL: cursors are
          // opaque, so we don't synthesise a previous one. Users hitting
          // forward after back keep the new cursor in history.
          <button
            type="button"
            onClick={() => window.history.back()}
            className="btn"
            style={{
              padding: '8px 14px',
              fontSize: 10,
              cursor: 'pointer',
              background: 'transparent',
              border: '1px solid var(--color-line-2)',
              color: 'var(--color-ink)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            ← prev
          </button>
        )}
        {noMorePages ? (
          <span
            className="btn"
            style={{ padding: '8px 14px', fontSize: 10, opacity: 0.4 }}
          >
            next →
          </span>
        ) : (
          <Link
            href={buildHref(nextCursor!)}
            className="btn"
            style={{ padding: '8px 14px', fontSize: 10 }}
          >
            next →
          </Link>
        )}
      </div>
    </div>
  )
}
