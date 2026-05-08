import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getBlock, getTxsForBlock } from '@/lib/api'
import { ago, fmtLgt, isoDate, trunc } from '@/lib/format'
import { CopyButton } from '@/components/copy-button'
import { TxsTable } from '@/components/tables'
import { Eyebrow, FrameCard, LV } from '@/components/ui'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ height: string }>
}): Promise<Metadata> {
  const { height } = await params
  return { title: `Block #${height}` }
}

export default async function BlockPage({
  params,
}: {
  params: Promise<{ height: string }>
}) {
  const { height: heightStr } = await params
  const height = parseInt(heightStr, 10)
  if (!Number.isFinite(height)) notFound()

  const block = await getBlock(height)
  if (!block) notFound()
  const blockTxs = await getTxsForBlock(height)

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/blocks"
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-subtle)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          ← Blocks
        </Link>
      </div>
      <Eyebrow>Block</Eyebrow>

      <div
        style={{
          marginTop: 20,
          display: 'flex',
          alignItems: 'baseline',
          gap: 24,
          flexWrap: 'wrap',
        }}
      >
        <h1
          className="serif"
          style={{
            fontSize: 96,
            lineHeight: 0.9,
            color: 'var(--color-ink)',
            margin: 0,
            fontWeight: 400,
          }}
        >
          <span style={{ color: 'var(--color-subtle)' }}>#</span>
          {block.height}
        </h1>
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginLeft: 'auto',
            alignItems: 'center',
          }}
        >
          <Link
            href={`/blocks/${block.height - 1}`}
            className="btn"
          >
            ← prev
          </Link>
          <Link
            href={`/blocks/${block.height + 1}`}
            className="btn"
          >
            next →
          </Link>
        </div>
      </div>

      <div
        style={{
          marginTop: 32,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 40,
        }}
      >
        <div>
          <Eyebrow>Identity</Eyebrow>
          <div style={{ marginTop: 12 }}>
            <LV
              rows={[
                {
                  label: 'Hash',
                  value: (
                    <>
                      <span className="h-mono">{trunc(block.hash, 14, 12)}</span>
                      <CopyButton value={block.hash} />
                    </>
                  ),
                },
                {
                  label: 'Prev hash',
                  value: (
                    <span className="h-mono">{trunc(block.prev_hash, 14, 12)}</span>
                  ),
                },
                {
                  label: 'Time',
                  value: (
                    <>
                      {ago(Math.floor((Date.now() - block.timestamp) / 1000))}{' '}
                      <span style={{ color: 'var(--color-subtle)', marginLeft: 12 }}>
                        {isoDate(block.timestamp)}
                      </span>
                    </>
                  ),
                },
              ]}
            />
          </div>
        </div>
        <div>
          <Eyebrow>Production</Eyebrow>
          <div style={{ marginTop: 12 }}>
            <LV
              rows={[
                {
                  label: 'Proposer',
                  value: (
                    <Link href={`/address/${block.proposer}`} className="link">
                      {block.proposer}
                    </Link>
                  ),
                },
                { label: 'Tx count', value: block.tx_count },
                {
                  label: 'Fees total',
                  value: (
                    <>
                      {fmtLgt(block.fees_total_nano)}{' '}
                      <span style={{ color: 'var(--color-subtle)' }}>LGT</span>
                    </>
                  ),
                },
              ]}
            />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 56 }}>
        <Eyebrow>Transactions in this block</Eyebrow>
        <FrameCard padding={0} style={{ marginTop: 12 }}>
          {blockTxs.length ? (
            <TxsTable rows={blockTxs} showBlock={false} />
          ) : (
            <div
              style={{ padding: 40, textAlign: 'center', color: 'var(--color-muted)' }}
            >
              <span className="mono" style={{ fontSize: 11, letterSpacing: '0.18em' }}>
                NO TRANSACTIONS IN THIS BLOCK
              </span>
            </div>
          )}
        </FrameCard>
      </div>
    </>
  )
}
