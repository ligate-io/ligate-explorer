import { notFound } from 'next/navigation'
import { getSchema } from '@/lib/api'
import { LiveSchemaAttestationCount } from './live-count'

// Partner-iframe widget: live attestation count for one schema.
//
// Themisra's use case: drop into their dashboard to show "X
// attestations landed on Ligate Chain" without re-implementing the
// chain query. Mneme attestor pilots / Iris / any partner integrating
// against a schema can do the same.
//
// SSR-renders the initial count + schema name from `getSchema(id)`,
// then hands off to the client wrapper which polls every 6s for
// fresh data. Bech32m id validation is loose — anything matching the
// `lsc1…` HRP shape gets through; a real 404 from the api 404s the
// widget itself (the iframe shows the branded "schema not found"
// state instead of a stack trace).
//
// Iframe sizing: target around 320×120. The widget renders content-
// first sizing — partners are expected to size their iframe to match.

export const dynamic = 'force-dynamic'

function isWellFormedSchemaId(id: string): boolean {
  return /^lsc1[a-z0-9]{50,80}$/.test(id)
}

export default async function AttestationCountEmbed({
  params,
}: {
  params: Promise<{ schemaId: string }>
}) {
  const { schemaId } = await params
  if (!isWellFormedSchemaId(schemaId)) notFound()
  const schema = await getSchema(schemaId).catch(() => null)
  if (!schema) notFound()

  return (
    <LiveSchemaAttestationCount
      schemaId={schemaId}
      initial={{
        name: schema.name,
        version: schema.version,
        count: schema.attestation_count,
      }}
    />
  )
}
