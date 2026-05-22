import type { Metadata } from 'next'
import Link from 'next/link'
import { Eyebrow, FrameCard } from '@/components/ui'

// Root 404 page. Fires on any unknown URL, plus on any `notFound()`
// call from the typed-id detail routes (`/blocks/[height]`,
// `/tx/[hash]`, `/attestation/[id]`, `/schema/[id]`,
// `/attestor-set/[id]`) when the api doesn't have a row for the
// requested key. Without this file Next falls back to its stock 404,
// which is unbranded and reads as a generic "App router default".
//
// Server-rendered. The requested path isn't passed in by Next at this
// layer so we can't echo "we looked for X" — instead we educate on
// the bech32 prefix taxonomy + offer quick-nav anchors to the three
// most-trafficked routes.

export const metadata: Metadata = { title: 'Not found' }

// Bech32m prefix → human label. Mirrors the search-bar routing in
// `components/header.tsx` so users who hit 404 see the same taxonomy
// they'd use to recover via the search input.
const PREFIXES = [
  { prefix: 'lig1…', kind: 'Address' },
  { prefix: 'ltx1…', kind: 'Transaction' },
  { prefix: 'lblk1…', kind: 'Block hash' },
  { prefix: 'lsc1…', kind: 'Schema' },
  { prefix: 'las1…', kind: 'Attestor set' },
  { prefix: 'lat1…', kind: 'Attestation' },
] as const

const QUICK_NAV = [
  { label: 'Home', href: '/', sub: 'Chain dashboard' },
  { label: 'Blocks', href: '/blocks', sub: 'Tape, head to tail' },
  { label: 'Transactions', href: '/txs', sub: 'Every signed action' },
] as const

export default function NotFound() {
  return (
    <div style={{ paddingTop: 48 }}>
      <Eyebrow>404 · Not indexed</Eyebrow>
      <h1
        className="serif h-hero"
        style={{
          marginTop: 24,
          lineHeight: 0.95,
          color: 'var(--color-ink)',
          maxWidth: '22ch',
          fontWeight: 400,
        }}
      >
        Nothing{' '}
        <em style={{ color: 'var(--color-accent)' }}>indexed</em> at that
        path.
      </h1>
      <p
        style={{
          color: 'var(--color-muted)',
          maxWidth: 560,
          marginTop: 20,
          fontSize: 15,
          lineHeight: 1.55,
        }}
      >
        The URL you opened doesn&apos;t match a known block, transaction,
        attestation, schema, or address. Double-check the prefix or paste
        the value into the search bar in the header.
      </p>

      {/* Bech32m prefix reference. Same taxonomy the search bar uses
          for routing; surfacing it here lets users recognise which kind
          of id they meant to look up and reformat accordingly. */}
      <div style={{ marginTop: 40 }}>
        <Eyebrow>Recognised id prefixes</Eyebrow>
        <FrameCard padding={0} style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {PREFIXES.map((p, i) => (
              <div
                key={p.prefix}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 24,
                  padding: '14px 22px',
                  borderBottom:
                    i < PREFIXES.length - 1
                      ? '1px solid var(--color-line)'
                      : 0,
                }}
              >
                <span
                  className="mono"
                  style={{
                    fontSize: 13,
                    color: 'var(--color-accent)',
                    minWidth: 90,
                  }}
                >
                  {p.prefix}
                </span>
                <span
                  className="mono"
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'var(--color-muted)',
                  }}
                >
                  {p.kind}
                </span>
              </div>
            ))}
          </div>
        </FrameCard>
      </div>

      {/* Quick-nav grid. Same `.grid-stats-3` rhythm the rest of the
          explorer uses for KPI rows; here each cell is a route anchor
          rather than a stat. */}
      <div style={{ marginTop: 56 }}>
        <Eyebrow>Or jump to</Eyebrow>
        <div
          className="grid-stats-3"
          style={{ marginTop: 12, gap: 0 }}
        >
          {QUICK_NAV.map((it, i) => (
            <Link
              key={it.href}
              href={it.href}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <FrameCard
                padding={24}
                style={{
                  borderRight:
                    i === QUICK_NAV.length - 1
                      ? '1px solid var(--color-line)'
                      : 0,
                  height: '100%',
                }}
              >
                <div
                  className="mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: 'var(--color-subtle)',
                    marginBottom: 10,
                  }}
                >
                  {it.label}
                </div>
                <div
                  className="serif"
                  style={{
                    fontSize: 22,
                    color: 'var(--color-ink)',
                    lineHeight: 1.1,
                  }}
                >
                  {it.sub}
                </div>
              </FrameCard>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
