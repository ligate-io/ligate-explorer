import { getLatestBlocks, getChainInfo } from '@/lib/db'
import { formatRelativeTime } from '@/lib/format'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function HomePage() {
  const [blocks, info] = await Promise.all([
    getLatestBlocks(20),
    getChainInfo(),
  ])

  return (
    <main className="min-h-screen">
      <MonoStrip />

      <section className="mx-auto max-w-6xl px-6 pt-20 pb-12">
        <Eyebrow text={info?.chain_id ?? 'Ligate Chain devnet'} />
        <h1 className="mt-6 font-serif text-6xl leading-[1.05] tracking-tight md:text-7xl">
          Block <em className="text-[var(--color-accent)]">explorer</em>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-[var(--color-muted)]">
          Live state of Ligate Chain. Blocks, transactions, schemas, attestor
          sets, and attestations.
        </p>

        {info ? (
          <ChainBadges info={info} />
        ) : (
          <p className="mt-8 font-mono text-xs tracking-[0.18em] text-[var(--color-subtle)] uppercase">
            Indexer offline
          </p>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <SectionHeader text="Latest blocks" />

        <FrameCorners>
          {blocks.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="divide-y divide-[var(--color-line)]">
              {blocks.map((b) => (
                <li
                  key={b.height}
                  className="flex items-baseline justify-between px-6 py-4 hover:bg-[var(--color-surface)]"
                >
                  <div>
                    <span className="font-mono text-sm text-[var(--color-accent)]">
                      #{b.height.toString()}
                    </span>
                    <span className="ml-3 font-mono text-xs text-[var(--color-subtle)]">
                      {b.tx_count} tx
                    </span>
                  </div>
                  <span className="font-mono text-xs text-[var(--color-muted)]">
                    {formatRelativeTime(b.timestamp)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </FrameCorners>
      </section>

      <MonoStrip />
    </main>
  )
}

// ---- Inline brand chrome (will graduate to /components when there's >1 page)

function MonoStrip() {
  return (
    <div className="border-y border-[var(--color-line)] bg-[var(--color-surface)]">
      <div className="mx-auto flex max-w-6xl justify-between px-6 py-2 font-mono text-[10px] tracking-[0.2em] text-[var(--color-subtle)] uppercase">
        <span>Ligate Chain · explorer</span>
        <span>v0 devnet</span>
      </div>
    </div>
  )
}

function Eyebrow({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.22em] text-[var(--color-muted)] uppercase">
      <span className="block h-px w-8 bg-[var(--color-accent)]" />
      {text}
    </div>
  )
}

function SectionHeader({ text }: { text: string }) {
  return (
    <h2 className="mb-6 font-mono text-xs tracking-[0.22em] text-[var(--color-muted)] uppercase">
      {text}
    </h2>
  )
}

function ChainBadges({
  info,
}: {
  info: { chain_id: string; chain_hash: string; version: string }
}) {
  return (
    <dl className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-md border border-[var(--color-line)] bg-[var(--color-line)] sm:grid-cols-3">
      <Badge label="Chain id" value={info.chain_id} mono />
      <Badge
        label="Chain hash"
        value={`${info.chain_hash.slice(0, 8)}…${info.chain_hash.slice(-6)}`}
        mono
      />
      <Badge label="Node version" value={`v${info.version}`} mono />
    </dl>
  )
}

function Badge({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="bg-[var(--color-bg)] px-5 py-4">
      <dt className="font-mono text-[10px] tracking-[0.22em] text-[var(--color-subtle)] uppercase">
        {label}
      </dt>
      <dd
        className={`mt-1 text-sm text-[var(--color-ink)] ${mono ? 'font-mono' : ''}`}
      >
        {value}
      </dd>
    </div>
  )
}

function FrameCorners({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative rounded-md border border-[var(--color-line)]">
      <Corner className="-top-px -left-px border-t border-l" />
      <Corner className="-top-px -right-px border-t border-r" />
      <Corner className="-bottom-px -left-px border-b border-l" />
      <Corner className="-right-px -bottom-px border-r border-b" />
      {children}
    </div>
  )
}

function Corner({ className }: { className: string }) {
  return (
    <span
      className={`absolute h-3 w-3 border-[var(--color-accent)] ${className}`}
      aria-hidden="true"
    />
  )
}

function EmptyState() {
  return (
    <div className="px-6 py-16 text-center">
      <p className="font-mono text-xs tracking-[0.2em] text-[var(--color-subtle)] uppercase">
        No blocks indexed yet
      </p>
      <p className="mt-4 mx-auto max-w-md text-sm text-[var(--color-muted)]">
        Point <code className="font-mono text-[var(--color-accent)]">ligate-indexer</code>
        {' '}at a running Ligate Chain node to start populating this view.
      </p>
    </div>
  )
}
