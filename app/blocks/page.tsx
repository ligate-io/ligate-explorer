import type { Metadata } from 'next'
import { getAllBlocks } from '@/lib/api'
import { fmtLgt } from '@/lib/format'
import { BlocksTable } from '@/components/tables'
import { BlockSpark } from '@/components/svgs'
import { Eyebrow, FrameCard } from '@/components/ui'
import { Pagination } from '@/components/pagination'

export const metadata: Metadata = { title: 'Blocks' }
export const dynamic = 'force-dynamic'

const PER_PAGE = 20

export default async function BlocksPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)

  const all = await getAllBlocks()
  const totalTxs = all.reduce((acc, b) => acc + b.tx_count, 0)
  const avgTxs = (totalTxs / all.length).toFixed(2)
  const totalFees = all.reduce(
    (acc, b) => acc + BigInt(b.fees_total_nano),
    0n
  )

  const rows = all.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const stats = [
    { label: 'Latest block', value: '#' + all[0].height },
    { label: 'Indexed blocks', value: all.length, serif: true },
    { label: 'Avg txs / block', value: avgTxs, serif: true },
    {
      label: 'Fees collected',
      value: fmtLgt(totalFees).split('.')[0],
      serif: true,
      suffix: 'LGT',
    },
  ]

  return (
    <>
      <div style={{ paddingTop: 16 }}>
        <Eyebrow>Blocks</Eyebrow>
        <h1
          className="serif"
          style={{
            marginTop: 24,
            fontSize: 72,
            lineHeight: 0.95,
            color: 'var(--color-ink)',
            maxWidth: '20ch',
            fontWeight: 400,
          }}
        >
          The <em style={{ color: 'var(--color-accent)' }}>tape</em>, head to tail.
        </h1>
        <p
          style={{
            color: 'var(--color-muted)',
            maxWidth: 540,
            marginTop: 16,
          }}
        >
          {all.length} blocks indexed. Each row is a sealed batch of attestations and transfers, posted to Celestia for data availability.
        </p>
      </div>

      <div
        style={{
          marginTop: 40,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 0,
        }}
      >
        {stats.map((t, i) => (
          <FrameCard
            key={i}
            padding={20}
            style={{ borderRight: i === stats.length - 1 ? '1px solid var(--color-line)' : 0 }}
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
              {t.label}
            </div>
            <div
              className={t.serif ? 'serif' : 'mono'}
              style={{
                fontSize: t.serif ? 36 : 18,
                lineHeight: 1,
                color: 'var(--color-ink)',
              }}
            >
              {t.value}
              {t.suffix ? (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 14,
                    color: 'var(--color-subtle)',
                    marginLeft: 8,
                  }}
                >
                  {t.suffix}
                </span>
              ) : null}
            </div>
          </FrameCard>
        ))}
      </div>

      <div style={{ marginTop: 32, marginBottom: 8 }}>
        <div
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-subtle)',
            marginBottom: 8,
          }}
        >
          tx density · {all.length} blocks
        </div>
        <BlockSpark blocks={all.map((b) => ({ tx_count: b.tx_count }))} />
      </div>

      <FrameCard padding={0} style={{ marginTop: 24 }}>
        <BlocksTable rows={rows} />
      </FrameCard>

      <Pagination
        basePath="/blocks"
        page={page}
        perPage={PER_PAGE}
        total={all.length}
      />
    </>
  )
}
