import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { getTx } from '@/lib/api'
import type { Tx } from '@/lib/api-types'
import { ago, fmtLgt, fmtLgtTrim, isoDate, trunc } from '@/lib/format'
import {
  readRegisterAttestorSet,
  readRegisterSchema,
  readSubmitAttestation,
  readTransfer,
} from '@/lib/tx-payload'
import { CopyButton } from '@/components/copy-button'
import { JsonViewer } from '@/components/json-viewer'
import { TxFlowSvg } from '@/components/svgs'
import { TxPending } from '@/components/tx-pending'
import { Eyebrow, FrameCard, LV, StatusPill } from '@/components/ui'

export const dynamic = 'force-dynamic'

// Bech32m tx hash: ltx1<58 chars> = 62 chars. Hex form: 0x + 64 chars.
// Both shapes get the "pending" treatment when not yet indexed; junk
// input falls through to a hard 404.
function isWellFormedTxHash(hash: string): boolean {
  if (/^ltx1[a-z0-9]{50,80}$/.test(hash)) return true
  const hex = hash.replace(/^0x/i, '')
  return /^[a-f0-9]{64}$/i.test(hex)
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ hash: string }>
}): Promise<Metadata> {
  const { hash } = await params
  return { title: `Tx ${trunc(hash, 6, 4)}` }
}

export default async function TxPage({
  params,
}: {
  params: Promise<{ hash: string }>
}) {
  const { hash } = await params
  const tx = await getTx(hash)
  if (!tx) {
    // Indexer race: the faucet just submitted this tx but the indexer
    // hasn't seen it yet. Show a polling "pending" view rather than a
    // hard 404. Junk hashes still 404.
    if (isWellFormedTxHash(hash)) return <TxPending hash={hash} />
    notFound()
  }

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/txs"
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-subtle)',
          }}
        >
          ← Transactions
        </Link>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 12,
          flexWrap: 'wrap',
        }}
      >
        <Eyebrow>Transaction</Eyebrow>
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--color-accent)',
          }}
        >
          {tx.type}
        </span>
        <StatusPill status={tx.status} />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
          marginBottom: 8,
        }}
      >
        <span
          className="mono"
          style={{
            fontSize: 18,
            color: 'var(--color-bone)',
            wordBreak: 'break-all',
            maxWidth: 760,
          }}
        >
          {tx.hash}
        </span>
        <CopyButton value={tx.hash} />
      </div>

      <div
        className="mono"
        style={{
          fontSize: 11,
          color: 'var(--color-muted)',
          letterSpacing: '0.04em',
          marginBottom: 36,
        }}
      >
        in{' '}
        <Link href={`/blocks/${tx.height}`} className="link">
          block #{tx.height}
        </Link>
        <span style={{ color: 'var(--color-subtle)' }}> · </span>
        <span suppressHydrationWarning>
          {ago(Math.floor((Date.now() - tx.timestamp) / 1000))}
        </span>
        <span style={{ color: 'var(--color-subtle)' }}> · </span>
        {isoDate(tx.timestamp)}
      </div>

      {/* Action card: type-aware summary of what the tx actually did.
          Sits above the boilerplate header/execution/payload grid so
          the reader sees "100 AVOW moved A → B" before "nonce 4". */}
      <div style={{ marginBottom: 36 }}>
        <ActionCard tx={tx} />
      </div>

      <div style={{ marginBottom: 36 }}>
        <Eyebrow>Lifecycle</Eyebrow>
        <FrameCard padding={20} style={{ marginTop: 12 }}>
          <TxFlowSvg status={tx.status} />
        </FrameCard>
      </div>

      <div
        className="detail-grid-2"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 40,
        }}
      >
        <div>
          <Eyebrow>Header</Eyebrow>
          <div style={{ marginTop: 12 }}>
            <LV
              rows={[
                {
                  label: 'Block',
                  value: (
                    <Link href={`/blocks/${tx.height}`} className="link">
                      #{tx.height}
                    </Link>
                  ),
                },
                {
                  label: 'Sender',
                  value: tx.sender ? (
                    // flex space-between so the copy chip pins to the
                    // right edge of the value column instead of sitting
                    // 8px after a 50+ char address. Compact copy
                    // variant (icon-only) cuts width by ~70%.
                    <span
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 16,
                        minWidth: 0,
                      }}
                    >
                      <Link
                        href={`/address/${tx.sender}`}
                        className="link"
                        style={{ wordBreak: 'break-all', minWidth: 0 }}
                      >
                        {tx.sender}
                      </Link>
                      <CopyButton value={tx.sender} compact />
                    </span>
                  ) : (
                    <span style={{ color: 'var(--color-subtle)' }}>
                      not exposed
                    </span>
                  ),
                },
                {
                  label: 'Type',
                  value: (
                    <span style={{ color: 'var(--color-accent)' }}>
                      {tx.type}
                    </span>
                  ),
                },
                {
                  label: 'Block hash',
                  value: tx.block_hash ? (
                    // Same flex layout as Sender for visual rhythm.
                    // Block hash routes to /blocks/[height] (the
                    // explorer keys blocks by height, not hash —
                    // matches the prev_hash link on the block detail
                    // page). title attr keeps the full hash visible
                    // on hover.
                    <span
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 16,
                        minWidth: 0,
                      }}
                    >
                      <Link
                        href={`/blocks/${tx.height}`}
                        className="h-mono link"
                        title={tx.block_hash}
                        style={{ minWidth: 0 }}
                      >
                        {trunc(tx.block_hash, 14, 12)}
                      </Link>
                      <CopyButton value={tx.block_hash} compact />
                    </span>
                  ) : (
                    <span style={{ color: 'var(--color-subtle)' }}>—</span>
                  ),
                },
              ]}
            />
          </div>
        </div>
        <div>
          <Eyebrow>Fees & execution</Eyebrow>
          <div style={{ marginTop: 12 }}>
            <LV
              rows={[
                {
                  // Gas fee. api now ships fee_paid_nano as a real
                  // "0" string (ligate-api PR #45 Tier 3.1) — was null
                  // before, which forced the "not exposed yet"
                  // placeholder. Devnet runs gas_price = 0 so the
                  // displayed value is "0 AVOW" everywhere; that's
                  // honest, not a stub.
                  label: 'Gas fee',
                  value: <FeeValue nano={tx.fee_nano} fallback="0" />,
                },
                {
                  label: 'Protocol fee',
                  value: (
                    <FeeValue
                      nano={tx.protocol_fee_nano}
                      fallback="0"
                      colorOverride={
                        tx.protocol_fee_nano !== '0'
                          ? 'var(--color-amber)'
                          : undefined
                      }
                    />
                  ),
                },
                {
                  label: 'Gas used',
                  value: tx.gas_used ? (
                    <>
                      {tx.gas_used.toLocaleString()}{' '}
                      <span style={{ color: 'var(--color-subtle)' }}>
                        units
                      </span>
                    </>
                  ) : (
                    <span style={{ color: 'var(--color-subtle)' }}>
                      not exposed
                    </span>
                  ),
                },
                { label: 'Nonce', value: tx.nonce },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Dev affordance. Two snippets devs can paste-and-run to
          fetch this tx outside the explorer: the high-level CLI
          (ligate-cli, assumed `tx replay` subcommand — if the binary
          ships a different verb, the snippet here is the canonical
          place to update it once); and the raw curl that hits the api
          directly, which always works regardless of CLI shape. */}
      <div style={{ marginTop: 56 }}>
        <Eyebrow>Replay locally</Eyebrow>
        <FrameCard padding={20} style={{ marginTop: 12 }}>
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--color-subtle)',
              marginBottom: 8,
            }}
          >
            via ligate-cli
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <code
              className="mono"
              style={{
                fontSize: 13,
                color: 'var(--color-bone)',
                wordBreak: 'break-all',
                background: 'transparent',
              }}
            >
              $ ligate-cli tx replay {tx.hash}
            </code>
            <CopyButton value={`ligate-cli tx replay ${tx.hash}`} />
          </div>
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--color-subtle)',
              marginTop: 18,
              marginBottom: 8,
            }}
          >
            via curl (api direct)
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <code
              className="mono"
              style={{
                fontSize: 13,
                color: 'var(--color-bone)',
                wordBreak: 'break-all',
                background: 'transparent',
              }}
            >
              $ curl -sS https://api.ligate.io/v1/txs/{tx.hash}
            </code>
            <CopyButton
              value={`curl -sS https://api.ligate.io/v1/txs/${tx.hash}`}
            />
          </div>
        </FrameCard>
      </div>

      <div style={{ marginTop: 56 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 12,
          }}
        >
          <Eyebrow>Raw transaction</Eyebrow>
          <span
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--color-subtle)',
            }}
            title="The unmodified response from GET /v1/txs/{hash} — every field the api ships."
          >
            /v1/txs/{trunc(tx.hash, 8, 4)}
          </span>
        </div>
        <FrameCard padding={0}>
          <div className="json-block" style={{ border: 0 }}>
            <JsonViewer data={tx.raw_response} />
          </div>
        </FrameCard>
      </div>

      {tx.events.length > 0 ? (
        <div style={{ marginTop: 56 }}>
          <Eyebrow>Events</Eyebrow>
          <FrameCard padding={0} style={{ marginTop: 12 }} scrollX>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Index</th>
                  <th>Module</th>
                  <th>Type</th>
                  <th>Payload preview</th>
                </tr>
              </thead>
              <tbody>
                {tx.events.map((ev) => (
                  <tr key={ev.index}>
                    <td className="mono" style={{ color: 'var(--color-subtle)' }}>
                      {String(ev.index).padStart(2, '0')}
                    </td>
                    <td className="mono" style={{ color: 'var(--color-accent)' }}>
                      {ev.module}
                    </td>
                    <td className="mono" style={{ color: 'var(--color-bone)' }}>
                      {ev.type}
                    </td>
                    <td
                      className="mono"
                      style={{ color: 'var(--color-muted)', fontSize: 12 }}
                    >
                      {ev.preview}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FrameCard>
        </div>
      ) : null}
    </>
  )
}

// Renders an AVOW amount with `"0 AVOW"` for zero values and a coloured
// real number when non-zero. `fallback` was the old "not exposed yet"
// placeholder used while the api shipped null for gas — that path is
// gone (ligate-api PR #45 Tier 3.1 ships fee_paid_nano as a real "0").
// `colorOverride` is used on the protocol-fee row to make the amber
// tag visually match the same color used in the table FeeCell.
function FeeValue({
  nano,
  colorOverride,
}: {
  nano: string
  /** Retained for source-compat with old call sites that passed
   *  "not exposed"; no longer affects rendering. */
  fallback?: string
  colorOverride?: string
}) {
  if (nano === '0' || nano === '' || nano == null) {
    return (
      <>
        0 <span style={{ color: 'var(--color-subtle)' }}>AVOW</span>
      </>
    )
  }
  return (
    <span style={{ color: colorOverride }}>
      {fmtLgt(nano)}{' '}
      <span style={{ color: 'var(--color-subtle)' }}>AVOW</span>
    </span>
  )
}

// Type-aware summary of the tx's effect. Picks the right narrower for
// the kind, falls through to a generic "see raw payload below" empty
// state when the kind isn't one we render specially.
function ActionCard({ tx }: { tx: Tx }) {
  let body: ReactNode = null

  if (tx.type === 'Transfer') {
    const t = readTransfer(tx.payload)
    if (t) body = <TransferAction details={t} />
  } else if (tx.type === 'SubmitAttestation') {
    const a = readSubmitAttestation(tx.payload)
    if (a)
      body = (
        <AttestationAction
          schemaId={a.schema_id}
          payloadHash={a.payload_hash}
          sigs={a.signature_count}
          // `id` is the chain-derived bech32m `lat1…` attestation id
          // (ligate-chain v0.2.0+). Undefined on legacy indexers — the
          // AttestationAction card then skips the "view attestation"
          // link wrapping the payload hash and renders plain text.
          attestationId={a.id}
        />
      )
  } else if (tx.type === 'RegisterSchema') {
    const s = readRegisterSchema(tx.payload)
    if (s)
      body = (
        <RegisterSchemaAction
          schemaId={s.schema_id}
          name={s.name}
          version={s.version}
        />
      )
  } else if (tx.type === 'RegisterAttestorSet') {
    const s = readRegisterAttestorSet(tx.payload)
    if (s)
      body = (
        <RegisterSetAction
          setId={s.attestor_set_id}
          members={s.members}
          threshold={s.threshold}
        />
      )
  }

  return (
    <FrameCard padding={24}>
      <div
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--color-subtle)',
          marginBottom: 18,
        }}
      >
        Action
      </div>
      {body ?? (
        <div style={{ color: 'var(--color-muted)', fontSize: 13 }}>
          No type-specific summary for{' '}
          <span className="mono" style={{ color: 'var(--color-bone)' }}>
            {tx.type}
          </span>
          . See raw payload below.
        </div>
      )}
    </FrameCard>
  )
}

function TransferAction({
  details,
}: {
  details: { from: string; to: string; amount_nano: string }
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 32,
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <ParticipantRow label="From" address={details.from} />
        <div
          aria-hidden
          style={{
            width: 1,
            height: 16,
            background: 'var(--color-line-2)',
            marginLeft: 11,
          }}
        />
        <ParticipantRow label="To" address={details.to} accent />
      </div>
      <div style={{ textAlign: 'right' }}>
        <div
          className="mono"
          style={{
            fontSize: 9,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-subtle)',
            marginBottom: 6,
          }}
        >
          Amount
        </div>
        <div
          className="serif"
          style={{
            fontSize: 36,
            lineHeight: 1,
            color: 'var(--color-ink)',
          }}
        >
          {fmtLgtTrim(details.amount_nano)}{' '}
          <span
            className="mono"
            style={{ fontSize: 14, color: 'var(--color-subtle)' }}
          >
            AVOW
          </span>
        </div>
      </div>
    </div>
  )
}

function ParticipantRow({
  label,
  address,
  accent,
}: {
  label: string
  address: string
  accent?: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: accent ? 'var(--color-accent)' : 'var(--color-muted)',
          flexShrink: 0,
        }}
      />
      <span
        className="mono"
        style={{
          fontSize: 9,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--color-subtle)',
          width: 36,
        }}
      >
        {label}
      </span>
      <Link
        href={`/address/${address}`}
        className="h-mono"
        style={{
          fontSize: 13,
          color: accent ? 'var(--color-accent)' : 'var(--color-bone)',
          wordBreak: 'break-all',
        }}
      >
        {address}
      </Link>
      <CopyButton value={address} />
    </div>
  )
}

function AttestationAction({
  schemaId,
  payloadHash,
  sigs,
  attestationId,
}: {
  schemaId: string
  payloadHash: string
  sigs: number
  /** Bech32m `lat1…` id from ligate-chain v0.2.0+. Optional so the
   *  card still renders against legacy indexers — when missing, the
   *  payload-hash cell is plain text instead of a link to the
   *  attestation detail page. */
  attestationId?: string
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr auto',
        gap: 24,
        alignItems: 'center',
      }}
    >
      <div>
        <div
          className="mono"
          style={{
            fontSize: 9,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-subtle)',
            marginBottom: 6,
          }}
        >
          Schema
        </div>
        <Link
          href={`/schema/${schemaId}`}
          className="h-mono"
          style={{ fontSize: 13, wordBreak: 'break-all' }}
        >
          {trunc(schemaId, 12, 8)}
        </Link>
      </div>
      <div>
        <div
          className="mono"
          style={{
            fontSize: 9,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-subtle)',
            marginBottom: 6,
          }}
        >
          Payload hash
        </div>
        {attestationId ? (
          <Link
            href={`/attestation/${attestationId}`}
            className="h-mono"
            style={{ fontSize: 13, wordBreak: 'break-all' }}
          >
            {trunc(payloadHash, 12, 8)}
          </Link>
        ) : (
          <span
            className="h-mono"
            style={{ fontSize: 13, wordBreak: 'break-all' }}
            title={payloadHash}
          >
            {trunc(payloadHash, 12, 8)}
          </span>
        )}
      </div>
      <div style={{ textAlign: 'right' }}>
        <div
          className="mono"
          style={{
            fontSize: 9,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-subtle)',
            marginBottom: 6,
          }}
        >
          Signatures
        </div>
        <div
          className="serif"
          style={{ fontSize: 32, color: 'var(--color-accent)', lineHeight: 1 }}
        >
          {sigs}
        </div>
      </div>
    </div>
  )
}

function RegisterSchemaAction({
  schemaId,
  name,
  version,
}: {
  schemaId: string
  name: string
  version: number
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        className="serif"
        style={{ fontSize: 28, color: 'var(--color-ink)', lineHeight: 1 }}
      >
        {name}{' '}
        <span style={{ color: 'var(--color-subtle)', fontStyle: 'italic' }}>
          v{version}
        </span>
      </div>
      <Link
        href={`/schema/${schemaId}`}
        className="h-mono"
        style={{ fontSize: 13, wordBreak: 'break-all' }}
      >
        {schemaId}
      </Link>
    </div>
  )
}

function RegisterSetAction({
  setId,
  members,
  threshold,
}: {
  setId: string
  members: string[]
  threshold: number
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 24,
        alignItems: 'center',
      }}
    >
      <div>
        <div
          className="mono"
          style={{
            fontSize: 9,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-subtle)',
            marginBottom: 6,
          }}
        >
          Attestor set
        </div>
        <Link
          href={`/attestor-set/${setId}`}
          className="h-mono"
          style={{ fontSize: 13, wordBreak: 'break-all' }}
        >
          {setId}
        </Link>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div
          className="mono"
          style={{
            fontSize: 9,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-subtle)',
            marginBottom: 6,
          }}
        >
          Threshold
        </div>
        <div
          className="serif"
          style={{ fontSize: 32, color: 'var(--color-accent)', lineHeight: 1 }}
        >
          {threshold}
          <span style={{ color: 'var(--color-subtle)', fontSize: 14 }}>
            {' '}
            of {members.length}
          </span>
        </div>
      </div>
    </div>
  )
}
