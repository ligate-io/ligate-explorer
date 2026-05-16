// Typed accessors for the per-kind `details` blob the api ships on
// `/v1/txs[*]`. The wire shape is kept untyped on `Tx.payload` so the
// json viewer can render arbitrary unknown kinds without the adapter
// having to learn every variant. UI surfaces that want a typed read
// (the tx detail Action card, table-row receiver, attestation fee
// cross-fetch) call these narrowers instead of indexing into
// `Record<string, unknown>` ad-hoc.
//
// Each narrower returns `null` when the field is missing or the wrong
// shape — render sites should fall back to the JSON viewer in that
// case rather than rendering `undefined`. The wire is documented in
// ligate-api `src/handlers.rs::TxKindDetails`.

export interface TransferDetails {
  from: string
  to: string
  amount_nano: string
  token_id: string
}

export interface SubmitAttestationDetails {
  schema_id: string
  payload_hash: string
  signature_count: number
}

export interface RegisterSchemaDetails {
  schema_id: string
  name: string
  version: number
}

export interface RegisterAttestorSetDetails {
  attestor_set_id: string
  members: string[]
  threshold: number
}

function isStr(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0
}
function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

export function readTransfer(
  details: Record<string, unknown>,
): TransferDetails | null {
  const { from, to, amount_nano, token_id } = details
  if (!isStr(from) || !isStr(to) || !isStr(amount_nano)) return null
  return {
    from,
    to,
    amount_nano,
    token_id: isStr(token_id) ? token_id : '',
  }
}

export function readSubmitAttestation(
  details: Record<string, unknown>,
): SubmitAttestationDetails | null {
  const { schema_id, payload_hash, signature_count } = details
  if (!isStr(schema_id) || !isStr(payload_hash)) return null
  return {
    schema_id,
    payload_hash,
    signature_count: isNum(signature_count) ? signature_count : 0,
  }
}

export function readRegisterSchema(
  details: Record<string, unknown>,
): RegisterSchemaDetails | null {
  const { schema_id, name, version } = details
  if (!isStr(schema_id) || !isStr(name)) return null
  return {
    schema_id,
    name,
    version: isNum(version) ? version : 1,
  }
}

export function readRegisterAttestorSet(
  details: Record<string, unknown>,
): RegisterAttestorSetDetails | null {
  const { attestor_set_id, members, threshold } = details
  if (!isStr(attestor_set_id) || !Array.isArray(members)) return null
  return {
    attestor_set_id,
    members: members.filter(isStr),
    threshold: isNum(threshold) ? threshold : 0,
  }
}
