import { Suspense } from 'react'
import Link from 'next/link'
import {
  getAttestationItems,
  getAttestationsDaily,
  getAttestorSetItems,
  getInfo,
  getLatestBlocks,
  getLatestTxs,
  getSchemas,
  getStatsTotals,
  getTxRateDaily,
} from '@/lib/api'
import { trunc } from '@/lib/format'
import { BlockTickerCard } from '@/components/block-ticker-card'
import {
  AttestorSetsCard,
  DailyAttestationsCard,
  FeeTrackerCard,
  StatsStrip,
  SupplyCard,
  Tx24hCard,
} from '@/components/dashboard'
import { AutoRefresh } from '@/components/auto-refresh'
import { HeroBackdrop } from '@/components/hero-backdrop'
import { SkelBlock, SkelCard, SkelHomeTableCard } from '@/components/skeleton'
import { Eyebrow, FrameCard } from '@/components/ui'
import { BlocksTable, TxsTable } from '@/components/tables'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Streaming home page. The shell (AutoRefresh + hero text +
// backdrop) renders synchronously — there are no awaits at this
// scope, so the user gets first paint in <100ms even on a cold
// server. Each downstream row is an async component wrapped in
// <Suspense>; rows arrive independently as their data resolves.
//
// Next.js dedupes identical fetches within a single render, so
// getInfo() / getStatsTotals() called from multiple rows hit the
// api once per render even though each row declares its own awaits.
//
// Caching:
//   - Server fetches honour the api's Cache-Control TTLs (set in
//     ligate-api PR #49), except where rows pass `live: true` to
//     getSchemas / getAttestationItems / getAttestorSetItems —
//     those override the longer 30-60s TTLs down to 6s so the
//     polling-driven re-renders see fresh data each cycle.
//   - AutoRefresh's router.refresh() invalidates the route cache
//     so the streaming kicks off again from scratch every 6s.
export default function HomePage() {
  return (
    <>
      {/* Polls /v1/info indirectly via router.refresh() so the block
          number, latest blocks, and latest txs advance without a
          manual reload. Pauses on hidden tabs. */}
      <AutoRefresh intervalMs={6000} />

      {/*
        Hero atmosphere band. The hero text + the stats strip + the
        first dashboard widget row sit on top of a blurred spirograph
        backdrop that bleeds under everything in this wrapper. The
        radial mask in HeroBackdrop fades the edges so the cards don't
        sit on a hard rectangle.
      */}
      <div style={{ position: 'relative' }}>
        <HeroBackdrop />
        <HeroText />

        {/* Stats strip — its own Suspense so it streams in
            independently of Row 1 below. */}
        <div style={{ position: 'relative', zIndex: 1, marginBottom: 24 }}>
          <Suspense fallback={<StatsStripSkeleton />}>
            <StatsStripData />
          </Suspense>
        </div>

        {/* Row 1: block ticker / supply / 24h txs */}
        <Suspense fallback={<Row1Skeleton />}>
          <Row1 />
        </Suspense>
      </div>

      {/* Row 2: attestations heatmap / sequencers / fees. */}
      <Suspense fallback={<Row2Skeleton />}>
        <Row2 />
      </Suspense>

      {/* Row 3: schemas + latest attestations. */}
      <Suspense fallback={<Row3Skeleton />}>
        <Row3 />
      </Suspense>

      {/* Row 4: blocks + txs. */}
      <Suspense fallback={<Row4Skeleton />}>
        <Row4 />
      </Suspense>
    </>
  )
}

// ---------------------------------------------------------------------
// Static shell — renders instantly with no awaits.
// ---------------------------------------------------------------------

function HeroText() {
  return (
    <section
      style={{
        position: 'relative',
        zIndex: 1,
        padding: '40px 0 28px',
        overflow: 'hidden',
      }}
    >
      <div className="dot-grid" style={{ opacity: 0.5 }} />
      <div style={{ position: 'relative' }}>
        <Eyebrow>Ligate Chain · devnet 1</Eyebrow>
        <h1
          className="h-hero"
          style={{
            marginTop: 18,
            fontFamily: 'var(--font-serif)',
            lineHeight: 0.96,
            letterSpacing: '-0.02em',
            color: 'var(--color-ink)',
            maxWidth: '22ch',
            fontWeight: 400,
            margin: '18px 0 0',
          }}
        >
          The receipt layer for AI,{' '}
          <em style={{ fontStyle: 'italic', color: 'var(--color-accent)' }}>
            observed
          </em>{' '}
          in real time.
        </h1>
        <p
          style={{
            marginTop: 18,
            maxWidth: 600,
            color: 'var(--color-muted)',
            fontSize: 14,
            lineHeight: 1.55,
          }}
        >
          ligate-devnet-1 went live 2026-05-15. Activity grows as Themisra
          integrations, Mneme attestor pilots, and partner SDK builds come
          online. Numbers below are real-time from the chain; if a card reads
          zero, the chain hasn&apos;t seen that event yet.
        </p>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------
// Streaming rows — each does its own Promise.all; Next dedupes
// duplicate fetch URLs across rows.
// ---------------------------------------------------------------------

async function StatsStripData() {
  const [info, totals] = await Promise.all([
    getInfo(),
    getStatsTotals().catch(() => null),
  ])
  // StatsStrip's "LGT supply" tile prefers the live totals supply
  // over the env-fallback that getInfo defaults to. Splice it in.
  return (
    <StatsStrip
      info={{
        ...info,
        supply_nano: totals?.total_supply_nano ?? info.supply_nano,
      }}
    />
  )
}

async function Row1() {
  const [info, totals, txRate7d] = await Promise.all([
    getInfo(),
    getStatsTotals().catch(() => null),
    getTxRateDaily(7),
  ])
  // Daily tx counts → bars[]: oldest first, summed across kind+outcome.
  const dailyByDate = new Map<string, number>()
  for (const p of txRate7d) {
    dailyByDate.set(p.date, (dailyByDate.get(p.date) ?? 0) + p.count)
  }
  const txBars7d = [...dailyByDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, c]) => c)
  return (
    <div
      className="grid-3"
      style={{
        position: 'relative',
        zIndex: 1,
        gap: 24,
        marginBottom: 24,
      }}
    >
      <BlockTickerCard latestBlock={info.latest_block} />
      <SupplyCard
        totalNano={totals?.total_supply_nano ?? info.supply_nano}
        treasuryNano={totals?.treasury_balance_nano}
        treasuryAddress={totals?.treasury_address}
      />
      <Tx24hCard bars={txBars7d} />
    </div>
  )
}

async function Row2() {
  const [attestationsDaily, attestorSetsPage] = await Promise.all([
    getAttestationsDaily(30),
    getAttestorSetItems(undefined, 5, { live: true }),
  ])
  return (
    <div
      className="grid-3"
      style={{ gap: 24, marginBottom: 24 }}
    >
      <DailyAttestationsCard points={attestationsDaily} days={30} />
      <AttestorSetsCard sets={attestorSetsPage.items} />
      <FeeTrackerCard />
    </div>
  )
}

async function Row3() {
  const [schemas, attestationsPage] = await Promise.all([
    getSchemas({ live: true }),
    getAttestationItems(undefined, 5, { live: true }),
  ])
  const schemaList = schemas.slice(0, 5)
  const attestationItems = attestationsPage.items
  return (
    <section
      className="grid-2"
      style={{ gap: 24, alignItems: 'stretch', marginBottom: 24 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <Eyebrow>Schemas</Eyebrow>
          <Link
            href="/schemas"
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
        <FrameCard padding={0} style={{ flex: 1 }} scrollX>
          <table className="tbl tab-num tbl-compact">
            <thead>
              <tr>
                <th>Name</th>
                <th>Threshold</th>
                <th>Attestations</th>
              </tr>
            </thead>
            <tbody>
              {schemaList.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    style={{
                      padding: '32px 22px',
                      textAlign: 'center',
                      color: 'var(--color-subtle)',
                    }}
                  >
                    <span
                      className="mono"
                      style={{ fontSize: 11, letterSpacing: '0.18em' }}
                    >
                      No schemas indexed yet
                    </span>
                  </td>
                </tr>
              ) : (
                schemaList.map((s) => (
                  <tr key={s.schema_id}>
                    <td>
                      <Link
                        href={`/schema/${s.schema_id}`}
                        style={{ display: 'block' }}
                      >
                        <div
                          className="serif"
                          style={{
                            fontSize: 14,
                            color: 'var(--color-ink)',
                            lineHeight: 1.1,
                          }}
                        >
                          {s.name}
                        </div>
                        <div
                          className="mono"
                          style={{
                            fontSize: 9,
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
                      <span
                        className="mono"
                        style={{ color: 'var(--color-accent)' }}
                      >
                        {s.threshold}
                      </span>
                    </td>
                    <td className="mono tab-num">
                      {s.attestation_count.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </FrameCard>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <Eyebrow>Latest attestations</Eyebrow>
          <Link
            href="/attestations"
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
        <FrameCard padding={0} style={{ flex: 1 }} scrollX>
          <table className="tbl tab-num tbl-compact">
            <thead>
              <tr>
                <th>Payload</th>
                <th>Block</th>
                <th>Submitter</th>
                <th>Sigs</th>
              </tr>
            </thead>
            <tbody>
              {attestationItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      padding: '32px 22px',
                      textAlign: 'center',
                      color: 'var(--color-subtle)',
                    }}
                  >
                    <span
                      className="mono"
                      style={{ fontSize: 11, letterSpacing: '0.18em' }}
                    >
                      No attestations indexed yet
                    </span>
                  </td>
                </tr>
              ) : (
                attestationItems.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Link
                        href={`/attestation/${a.id}`}
                        className="h-mono"
                        style={{ display: 'block' }}
                        title={a.payload_hash}
                      >
                        {trunc(a.payload_hash, 6, 4)}
                      </Link>
                    </td>
                    <td>
                      <Link
                        href={`/blocks/${a.submitted_at.block_height}`}
                        className="mono"
                        style={{ color: 'var(--color-muted)' }}
                      >
                        #{a.submitted_at.block_height}
                      </Link>
                    </td>
                    <td>
                      <Link
                        href={`/address/${a.submitter}`}
                        className="h-mono"
                      >
                        {trunc(a.submitter, 6, 4)}
                      </Link>
                    </td>
                    <td>
                      <span
                        className="mono tab-num"
                        style={{ color: 'var(--color-accent)' }}
                      >
                        {a.signature_count}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </FrameCard>
      </div>
    </section>
  )
}

async function Row4() {
  const [allBlocks, allTxs] = await Promise.all([
    getLatestBlocks(20),
    getLatestTxs(20),
  ])
  const blocks = allBlocks.slice(0, 10)
  const txs = allTxs.slice(0, 10)
  return (
    <section
      className="grid-2"
      style={{ gap: 24, alignItems: 'stretch' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
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
        <FrameCard padding={0} style={{ flex: 1 }} scrollX>
          <BlocksTable rows={blocks} compact />
        </FrameCard>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
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
        <FrameCard padding={0} style={{ flex: 1 }} scrollX>
          <TxsTable rows={txs} showBlock={false} compact />
        </FrameCard>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------
// Suspense fallback skeletons. Each mirrors the EXACT silhouette of
// the row it replaces — same grid columns, same eyebrow placement,
// same FrameCard chrome, same table-row count — so swap-in doesn't
// shift layout.
// ---------------------------------------------------------------------

// StatsStrip: full-width FrameCard holding 6 tiles in a flex row.
// The real strip is ~80px tall (label + value per tile, padding 14).
function StatsStripSkeleton() {
  return (
    <FrameCard padding={0} style={{ background: 'var(--color-surface)' }}>
      <div style={{ display: 'flex' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              padding: '18px 22px',
              borderRight:
                i < 5 ? '1px solid var(--color-line)' : 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <SkelBlock width={70} height={9} />
            <SkelBlock width="60%" height={18} />
          </div>
        ))}
      </div>
    </FrameCard>
  )
}

// Row 1: block ticker / supply / 24h txs — three FrameCards at
// roughly the same height the real cards settle into.
function Row1Skeleton() {
  return (
    <div
      className="grid-3"
      style={{
        position: 'relative',
        zIndex: 1,
        gap: 24,
        marginBottom: 24,
      }}
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <SkelCard key={i} height={200}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <SkelBlock width={90} height={10} />
            <SkelBlock width="50%" height={24} />
            <div style={{ marginTop: 12 }}>
              <SkelBlock width="100%" height={36} />
            </div>
          </div>
        </SkelCard>
      ))}
    </div>
  )
}

// Row 2: daily attestations heatmap / attestor sets / fee tracker.
// Heatmap silhouette = 5×6 grid of cells matching the real
// DailyAttestationsCard. Others get list-style skeletons.
function Row2Skeleton() {
  return (
    <div
      className="grid-3"
      style={{ gap: 24, marginBottom: 24 }}
    >
      <SkelCard height={220}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <SkelBlock width={100} height={10} />
          <SkelBlock width={50} height={10} />
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
            gap: 3,
          }}
        >
          {Array.from({ length: 30 }).map((_, i) => (
            <SkelBlock key={i} height={18} />
          ))}
        </div>
      </SkelCard>
      <SkelCard height={220}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <SkelBlock width={90} height={10} />
          <SkelBlock width={50} height={10} />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 0',
              borderBottom: i < 3 ? '1px solid var(--color-line)' : 0,
            }}
          >
            <SkelBlock width="55%" height={11} />
            <SkelBlock width={40} height={11} />
          </div>
        ))}
      </SkelCard>
      <SkelCard height={220}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <SkelBlock width={70} height={10} />
          <SkelBlock width="80%" height={26} />
          <SkelBlock width="100%" height={6} />
          <div style={{ display: 'flex', gap: 14 }}>
            <SkelBlock width="33%" height={28} />
            <SkelBlock width="33%" height={28} />
            <SkelBlock width="33%" height={28} />
          </div>
        </div>
      </SkelCard>
    </div>
  )
}

// Row 3: schemas + latest attestations. Real layout puts eyebrow +
// "View all →" ABOVE the FrameCard, with a 5-row compact table
// inside. SkelHomeTableCard mirrors that exactly.
function Row3Skeleton() {
  return (
    <section
      className="grid-2"
      style={{ gap: 24, alignItems: 'stretch', marginBottom: 24 }}
    >
      <SkelHomeTableCard
        eyebrowWidth={70}
        headers={['Name', 'Threshold', 'Attestations']}
        rows={5}
      />
      <SkelHomeTableCard
        eyebrowWidth={130}
        headers={['Payload', 'Block', 'Submitter', 'Sigs']}
        rows={5}
      />
    </section>
  )
}

// Row 4: latest blocks + latest transactions. Same eyebrow-above
// pattern, 10 compact rows each so heights match Row 3 visually via
// alignItems:stretch on the parent grid.
function Row4Skeleton() {
  return (
    <section
      className="grid-2"
      style={{ gap: 24, alignItems: 'stretch' }}
    >
      <SkelHomeTableCard
        eyebrowWidth={110}
        headers={['Height', 'Hash', 'Time', 'Txs']}
        rows={10}
      />
      <SkelHomeTableCard
        eyebrowWidth={150}
        headers={['Hash', 'Sender', 'Type', 'Fee', 'Time']}
        rows={10}
      />
    </section>
  )
}
