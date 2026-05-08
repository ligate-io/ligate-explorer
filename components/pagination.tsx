// Server-rendered pagination using URL query params (?page=N).
// Each list page passes its own basePath plus any extra query params
// to preserve (e.g. filter type).

import Link from 'next/link'

export function Pagination({
  basePath,
  page,
  perPage,
  total,
  extraParams = {},
}: {
  basePath: string
  page: number
  perPage: number
  total: number
  extraParams?: Record<string, string | undefined>
}) {
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const prevDisabled = page <= 1
  const nextDisabled = page >= totalPages
  const start = (page - 1) * perPage + 1
  const end = Math.min(page * perPage, total)

  const buildHref = (p: number) => {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(extraParams)) {
      if (v) params.set(k, v)
    }
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    return qs ? `${basePath}?${qs}` : basePath
  }

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
        Showing {start}–{end} of {total}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {prevDisabled ? (
          <span
            className="btn"
            style={{ padding: '8px 14px', fontSize: 10, opacity: 0.4 }}
          >
            ← prev
          </span>
        ) : (
          <Link
            href={buildHref(page - 1)}
            className="btn"
            style={{ padding: '8px 14px', fontSize: 10 }}
          >
            ← prev
          </Link>
        )}
        <span
          className="mono"
          style={{
            padding: '8px 14px',
            fontSize: 11,
            letterSpacing: '0.18em',
            color: 'var(--color-bone)',
            border: '1px solid var(--color-line-2)',
          }}
        >
          {page} / {totalPages}
        </span>
        {nextDisabled ? (
          <span
            className="btn"
            style={{ padding: '8px 14px', fontSize: 10, opacity: 0.4 }}
          >
            next →
          </span>
        ) : (
          <Link
            href={buildHref(page + 1)}
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
