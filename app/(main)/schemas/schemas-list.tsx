'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { Schema } from '@/lib/api-types'
import { trunc } from '@/lib/format'
import { ArrowRight } from '@/components/svgs'
import { FrameCard } from '@/components/ui'

// Client wrapper for the /schemas table. Owns a name-search input
// above the table that filters the rows in-memory (case-insensitive
// substring match against the schema name; falls back to a substring
// match on the schema_id when the user pastes one). The full set is
// only ~10s of rows on devnet, so the filter is synchronous + cheap.
//
// Server keeps fetching the full sorted list once on each navigation
// (attestation-count DESC); this component just shadows that with
// the search state. Resetting the input clears the filter — there's
// no URL param sync (intentional: search is ephemeral, not shareable).

export function SchemasList({ initial }: { initial: Schema[] }) {
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!needle) return initial
    return initial.filter(
      (s) =>
        s.name.toLowerCase().includes(needle) ||
        s.schema_id.toLowerCase().includes(needle),
    )
  }, [initial, needle])

  return (
    <>
      {/* Search input. Mono caps placeholder so it reads as chrome,
          not a content field. Border accents on focus to mirror the
          header search bar. */}
      <div
        style={{
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <input
          type="search"
          placeholder="Filter by name or id…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
          spellCheck="false"
          style={{
            flex: 1,
            minWidth: 240,
            background: 'transparent',
            border: '1px solid var(--color-line-2)',
            color: 'var(--color-ink)',
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            padding: '10px 14px',
            outline: 'none',
          }}
        />
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--color-subtle)',
          }}
        >
          {filtered.length} of {initial.length}
        </span>
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
            {filtered.length === 0 ? (
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
                    No schema matches that filter
                  </span>
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
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
              ))
            )}
          </tbody>
        </table>
      </FrameCard>
    </>
  )
}
