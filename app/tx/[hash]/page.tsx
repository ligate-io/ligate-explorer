import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTx } from '@/lib/api'
import { ago, fmtLgt, isoDate, trunc } from '@/lib/format'
import { CopyButton } from '@/components/copy-button'
import { JsonViewer } from '@/components/json-viewer'
import { TxFlowSvg } from '@/components/svgs'
import { Eyebrow, FrameCard, LV, StatusPill } from '@/components/ui'

export const dynamic = 'force-dynamic'

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
  if (!tx) notFound()

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/"
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-subtle)',
          }}
        >
          ← Home
        </Link>
      </div>
      <Eyebrow>Transaction</Eyebrow>

      <div
        style={{
          marginTop: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: 22,
            color: 'var(--color-ink)',
            wordBreak: 'break-all',
            maxWidth: 800,
          }}
        >
          {tx.hash}
        </div>
        <CopyButton value={tx.hash} />
        <StatusPill status={tx.status} />
      </div>

      <div style={{ marginTop: 36, marginBottom: 36 }}>
        <Eyebrow>Lifecycle</Eyebrow>
        <FrameCard padding={20} style={{ marginTop: 12 }}>
          <TxFlowSvg status={tx.status} />
        </FrameCard>
      </div>

      <div
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
                  label: 'Time',
                  value: (
                    <>
                      {ago(Math.floor((Date.now() - tx.timestamp) / 1000))}{' '}
                      <span style={{ color: 'var(--color-subtle)', marginLeft: 12 }}>
                        {isoDate(tx.timestamp)}
                      </span>
                    </>
                  ),
                },
                {
                  label: 'Sender',
                  value: (
                    <>
                      <Link href={`/address/${tx.sender}`} className="link">
                        {tx.sender}
                      </Link>
                      <CopyButton value={tx.sender} />
                    </>
                  ),
                },
                {
                  label: 'Type',
                  value: (
                    <span>
                      <span style={{ color: 'var(--color-subtle)' }}>
                        attestation/
                      </span>
                      <span style={{ color: 'var(--color-accent)' }}>{tx.type}</span>
                    </span>
                  ),
                },
              ]}
            />
          </div>
        </div>
        <div>
          <Eyebrow>Execution</Eyebrow>
          <div style={{ marginTop: 12 }}>
            <LV
              rows={[
                {
                  label: 'Fee',
                  value: (
                    <>
                      {fmtLgt(tx.fee_nano)}{' '}
                      <span style={{ color: 'var(--color-subtle)' }}>LGT</span>
                    </>
                  ),
                },
                {
                  label: 'Gas used',
                  value: (
                    <>
                      {tx.gas_used.toLocaleString()}{' '}
                      <span style={{ color: 'var(--color-subtle)' }}>units</span>
                    </>
                  ),
                },
                { label: 'Nonce', value: tx.nonce },
                {
                  label: 'Block hash',
                  value: (
                    <span className="h-mono">
                      {trunc(tx.block_hash, 12, 12)}
                    </span>
                  ),
                },
              ]}
            />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 56 }}>
        <Eyebrow>Payload</Eyebrow>
        <FrameCard padding={0} style={{ marginTop: 12 }}>
          <div className="json-block" style={{ border: 0 }}>
            <JsonViewer data={tx.payload} />
          </div>
        </FrameCard>
      </div>

      <div style={{ marginTop: 56 }}>
        <Eyebrow>Events</Eyebrow>
        <FrameCard padding={0} style={{ marginTop: 12 }}>
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
    </>
  )
}
