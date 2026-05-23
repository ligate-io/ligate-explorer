import type { Metadata } from 'next'
import { getSchemas } from '@/lib/api'
import { Eyebrow } from '@/components/ui'
import { SchemasList } from './schemas-list'

export const metadata: Metadata = { title: 'Schemas' }
export const dynamic = 'force-dynamic'

export default async function SchemasPage() {
  // Sort by attestation count DESC so the active schemas (Themisra,
  // Mneme, partner integrations) bubble to the top. Default api order
  // is `registered_at DESC`, which surfaces the most-recently-registered
  // schemas regardless of whether anyone's actually attesting against
  // them — fine for a feed, wrong for a "this is what's running on the
  // chain" list. Schemas with equal counts (typically zero) fall back
  // to the api's original order, which keeps the registration recency.
  const schemas = (await getSchemas())
    .slice()
    .sort((a, b) => b.attestation_count - a.attestation_count)
  return (
    <>
      <div style={{ padding: '48px 0 32px' }}>
        <Eyebrow>Schemas registry</Eyebrow>
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
          Every <em style={{ color: 'var(--color-accent)' }}>shape</em> the chain knows.
        </h1>
        <p
          style={{
            color: 'var(--color-muted)',
            maxWidth: 520,
            marginTop: 20,
          }}
        >
          Schemas declare what shape an attestation payload should take, and which attestor set is authorized to sign one. Ranked by attestation count so the active schemas stay on top; filter by name or id below.
        </p>
      </div>
      {/* Client-side filter + table render. Server already sorted by
          attestation count; the client just shadows that with the
          search term. Devnet schema count is small enough that no
          server-side filter is needed. */}
      <SchemasList initial={schemas} />
    </>
  )
}
