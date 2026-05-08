import Link from 'next/link'
import {
  getInfo,
  getLatestBlocks,
  getLatestTxs,
  getSchemas,
} from '@/lib/api'
import { trunc, fmtLgt } from '@/lib/format'
import { BlockTickerCard } from '@/components/block-ticker-card'
import {
  DailyAttestationsCard,
  FeeTrackerCard,
  SequencersCard,
  StatsStrip,
  SupplyCard,
  Tx24hCard,
} from '@/components/dashboard'
import { NetworkOrb } from '@/components/svgs'
import { Eyebrow, FrameCard } from '@/components/ui'
import { BlocksTable, TxsTable } from '@/components/tables'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function HomePage() {
  const [info, allBlocks, allTxs, schemas] = await Promise.all([
    getInfo(),
    getLatestBlocks(20),
    getLatestTxs(20),
    getSchemas(),
  ])

  const blocks = allBlocks.slice(0, 8)
  const txs = allTxs.slice(0, 8)
  const attestationTxs = allTxs
    .filter((t) => t.type === 'SubmitAttestation')
    .slice(0, 6)
  const schemaList = schemas.slice(0, 5)

  return (
    <>
      {/* Hero */}
      <section
        style={{ position: 'relative', padding: '40px 0 28px', overflow: 'hidden' }}
      >
        <div className="dot-grid" style={{ opacity: 0.5 }} />
        <div
          style={{
            position: 'relative',
            display: 'grid',
            gridTemplateColumns: '1fr 280px',
            gap: 48,
            alignItems: 'center',
          }}
        >
          <div>
            <Eyebrow>Ligate Chain — devnet 1</Eyebrow>
            <h1
              style={{
                marginTop: 18,
                fontFamily: 'var(--font-serif)',
                fontSize: 64,
                lineHeight: 0.96,
                letterSpacing: '-0.02em',
                color: 'var(--color-ink)',
                maxWidth: '20ch',
                fontWeight: 400,
                margin: '18px 0 0',
              }}
            >
              The receipt layer for AI,{' '}
              <em
                style={{ fontStyle: 'italic', color: 'var(--color-accent)' }}
              >
                observed
              </em>{' '}
              in real time.
            </h1>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <NetworkOrb size={220} />
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <div style={{ marginBottom: 24 }}>
        <StatsStrip info={info} />
      </div>

      {/*
        Run-a-light-node strip. Hidden until light node ships
        (no shipped client today). Keep code in tree for revival.
      <div style={{ marginBottom: 20 }}>
        <RunNodeStrip />
      </div>
      */}

      {/* Row 1: block ticker / supply / 24h txs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.1fr 1fr 1.1fr',
          gap: 16,
          marginBottom: 16,
        }}
      >
        <BlockTickerCard latestBlock={info.latest_block} />
        <SupplyCard />
        <Tx24hCard />
      </div>

      {/* Row 2: attestations heatmap / sequencers / fees */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr 1.2fr',
          gap: 16,
          marginBottom: 48,
        }}
      >
        <DailyAttestationsCard />
        <SequencersCard />
        <FeeTrackerCard />
      </div>

      {/* Row 3: schemas + latest attestations */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 24,
          marginBottom: 48,
        }}
      >
        <FrameCard padding={0}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '18px 22px',
              borderBottom: '1px solid var(--color-line)',
            }}
          >
            <Eyebrow>Schemas</Eyebrow>
            <Link
              href="/schemas"
              className="mono link"
              style={{
                fontSize: 10,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              View all →
            </Link>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Name</th>
                <th>Threshold</th>
                <th>Attestations</th>
              </tr>
            </thead>
            <tbody>
              {schemaList.map((s) => (
                <tr key={s.schema_id}>
                  <td>
                    <Link
                      href={`/schema/${s.schema_id}`}
                      style={{ display: 'block' }}
                    >
                      <div
                        className="serif"
                        style={{
                          fontSize: 16,
                          color: 'var(--color-ink)',
                          lineHeight: 1.1,
                        }}
                      >
                        {s.name}
                      </div>
                      <div
                        className="mono"
                        style={{
                          fontSize: 10,
                          color: 'var(--color-subtle)',
                          marginTop: 2,
                          letterSpacing: '0.08em',
                        }}
                      >
                        v{s.version} · {trunc(s.schema_id, 6, 4)}
                      </div>
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
                </tr>
              ))}
            </tbody>
          </table>
        </FrameCard>

        <FrameCard padding={0}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '18px 22px',
              borderBottom: '1px solid var(--color-line)',
            }}
          >
            <Eyebrow>Latest attestations</Eyebrow>
            <Link
              href="/txs"
              className="mono link"
              style={{
                fontSize: 10,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              View all →
            </Link>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Hash</th>
                <th>Block</th>
                <th>Submitter</th>
                <th>Fee</th>
              </tr>
            </thead>
            <tbody>
              {attestationTxs.map((t) => (
                <tr key={t.hash}>
                  <td>
                    <Link
                      href={`/tx/${t.hash}`}
                      className="h-mono"
                      style={{ display: 'block' }}
                    >
                      {trunc(t.hash, 6, 4)}
                    </Link>
                  </td>
                  <td>
                    <Link
                      href={`/blocks/${t.height}`}
                      className="mono"
                      style={{ color: 'var(--color-muted)' }}
                    >
                      #{t.height}
                    </Link>
                  </td>
                  <td>
                    <Link
                      href={`/address/${t.sender}`}
                      className="h-mono"
                    >
                      {trunc(t.sender, 6, 4)}
                    </Link>
                  </td>
                  <td>
                    <span
                      className="mono"
                      style={{ color: 'var(--color-bone)', fontSize: 11 }}
                    >
                      {fmtLgt(t.fee_nano)}{' '}
                      <span style={{ color: 'var(--color-subtle)' }}>LGT</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </FrameCard>
      </div>

      {/* Row 4: blocks + txs */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 24,
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 14,
            }}
          >
            <Eyebrow>Latest blocks</Eyebrow>
            <Link
              href="/blocks"
              className="mono link"
              style={{
                fontSize: 11,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              View all →
            </Link>
          </div>
          <FrameCard padding={0}>
            <BlocksTable rows={blocks} />
          </FrameCard>
        </div>
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 14,
            }}
          >
            <Eyebrow>Latest transactions</Eyebrow>
            <Link
              href="/txs"
              className="mono link"
              style={{
                fontSize: 11,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              View all →
            </Link>
          </div>
          <FrameCard padding={0}>
            <TxsTable rows={txs} showBlock={false} />
          </FrameCard>
        </div>
      </section>
    </>
  )
}
