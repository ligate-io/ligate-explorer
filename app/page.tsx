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
import { BlockTickerCard } from '@/components/block-ticker-card'
import {
  AttestorSetsCard,
  DailyAttestationsCard,
  FeeTrackerCard,
  SupplyCard,
  Tx24hCard,
} from '@/components/dashboard'
import { HeroBackdrop } from '@/components/hero-backdrop'
import {
  LiveAttestationsCard,
  LiveLatestBlocks,
  LiveLatestTxs,
  LiveSchemasCard,
  LiveStatsStrip,
} from '@/components/live-cards'
import { Eyebrow } from '@/components/ui'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Home page. Renders as a single async function. All five data
// fetches resolve at the TOP via Promise.all (parallel + Next-deduped
// for shared URLs). Each row's render is its own async helper, but
// we pre-await them here too so they enter the JSX tree as already-
// resolved React elements — no suspending children inside the page.
//
// Why this matters:
//   The home page used to ride on a route-wide `router.refresh()` tick
//   (AutoRefresh component, now deleted). That re-ran every server
//   component on every cycle and made the page feel like it was
//   refreshing as a whole on each new block. Now the live cards are
//   their own client components (see components/live-cards.tsx), each
//   polling its own endpoint on a 6s cadence. The server pass renders
//   the initial data — so first paint is fully populated, no skeleton
//   flicker — and from then on only the live cards re-render. Static
//   cards (Hero, Supply, 24h tx, Daily attestations, Attestor sets,
//   Fee tracker) stay mounted and never re-paint.
//
// First-paint skeleton lives in `app/loading.tsx` and shows only on
// hard navigation TO this route (where HomePage hasn't resolved yet),
// not on tab return / poll cycles.
export default async function HomePage() {
  const [stats, row1, row2, row3, row4] = await Promise.all([
    StatsStripData(),
    Row1(),
    Row2(),
    Row3(),
    Row4(),
  ])
  return (
    <>
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

        <div style={{ position: 'relative', zIndex: 1, marginBottom: 24 }}>
          {stats}
        </div>

        {row1}
      </div>

      {row2}
      {row3}
      {row4}
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
// Server-side row helpers — each does its own Promise.all (Next dedupes
// duplicate fetch URLs across rows). They hand initial data to the
// live client components, which take over polling from there.
// ---------------------------------------------------------------------

async function StatsStripData() {
  const [info, totals] = await Promise.all([
    getInfo(),
    getStatsTotals().catch(() => null),
  ])
  // LiveStatsStrip's first paint is whatever we hand it; from then on
  // it polls /v1/info + /v1/stats/totals itself and splices the same
  // supply field in client-side. Mirror that splice here so the SSR
  // render and the first client-poll render produce identical output.
  return (
    <LiveStatsStrip
      initial={{
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
      {/* Live: BlockTickerCard self-polls /v1/stats/next-block-eta
          and uses eta.last_block_height for display. `initialBlock` is
          only the SSR seed; once the first eta hit lands it's replaced. */}
      <BlockTickerCard initialBlock={info.latest_block} />
      {/* Static: supply changes only on treasury movements, no need
          to poll. SSR value is good until the next route navigation. */}
      <SupplyCard
        totalNano={totals?.total_supply_nano ?? info.supply_nano}
        treasuryNano={totals?.treasury_balance_nano}
        treasuryAddress={totals?.treasury_address}
      />
      {/* Static: 7-day rollup, refreshes once per day worth of data.
          Don't burn polling cycles on it. */}
      <Tx24hCard bars={txBars7d} />
    </div>
  )
}

async function Row2() {
  const [attestationsDaily, attestorSetsPage] = await Promise.all([
    getAttestationsDaily(30),
    getAttestorSetItems(undefined, 5),
  ])
  // All three cards here are static (heatmap is 30-day, attestor sets
  // change rarely, fee tracker is stub-only). No live wrappers needed.
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
    getSchemas(),
    getAttestationItems(undefined, 5),
  ])
  return (
    <section
      className="grid-2"
      style={{ gap: 24, alignItems: 'stretch', marginBottom: 24 }}
    >
      <LiveSchemasCard initial={schemas.slice(0, 5)} />
      <LiveAttestationsCard initial={attestationsPage.items} />
    </section>
  )
}

async function Row4() {
  const [blocks, txs] = await Promise.all([
    getLatestBlocks(10),
    getLatestTxs(10),
  ])
  return (
    <section
      className="grid-2"
      style={{ gap: 24, alignItems: 'stretch' }}
    >
      <LiveLatestBlocks initial={blocks} />
      <LiveLatestTxs initial={txs} />
    </section>
  )
}
