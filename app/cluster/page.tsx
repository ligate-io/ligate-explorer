import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { getClusterTopology } from '@/lib/api'
import type { ClusterHealth, ClusterTopology } from '@/lib/api-types'
import { Eyebrow, FrameCard, LV } from '@/components/ui'

export const metadata: Metadata = {
  title: 'Cluster',
  description:
    'Live DbElected sequencer cluster topology for ligate-devnet-1. Current leader, replicas, heartbeat ages, failover timing.',
}
export const dynamic = 'force-dynamic'

export default async function ClusterPage() {
  const topology = await getClusterTopology()

  return (
    <main className="container">
      <header style={{ marginBottom: 32 }}>
        <Eyebrow>devnet-1 sequencer cluster</Eyebrow>
        <h1 className="hero-h1" style={{ marginTop: 12 }}>
          Cluster <em>topology</em>
        </h1>
        <p
          className="lede"
          style={{ marginTop: 16, maxWidth: 640 }}
        >
          One node produces batches; the others stand by ready to take over.
          Failover is in-process: if the leader dies, a replica becomes the
          new leader with the same PID and the chain keeps producing without
          a restart. The most recent drill on 2026-05-21 measured 1.2 seconds
          from kill to first batch on the new leader.
        </p>
      </header>

      {topology === null ? (
        <FrameCard>
          <Eyebrow>status</Eyebrow>
          <p style={{ marginTop: 12 }}>
            The api is unreachable. Try again in a moment. If this persists,
            the chain&apos;s cluster endpoint may not be configured for this
            network (legacy single-sequencer mode).
          </p>
        </FrameCard>
      ) : (
        <ClusterContent topology={topology} />
      )}
    </main>
  )
}

function ClusterContent({ topology }: { topology: ClusterTopology }) {
  const leader = topology.nodes.find((n) => n.is_leader)
  const replicas = topology.nodes.filter((n) => !n.is_leader)

  return (
    <>
      {/* Cluster-wide health summary */}
      <FrameCard style={{ marginBottom: 28 }}>
        <Eyebrow>cluster health</Eyebrow>
        <div
          style={{
            marginTop: 18,
            display: 'flex',
            alignItems: 'baseline',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          <HealthDot health={topology.cluster_health} />
          <span
            className="hero-h1"
            style={{
              fontSize: 'clamp(28px, 5vw, 44px)',
              lineHeight: 1.1,
            }}
          >
            {healthLabel(topology.cluster_health)}
          </span>
        </div>
        <p style={{ marginTop: 12, opacity: 0.7, fontSize: 14 }}>
          {healthDescription(topology.cluster_health, topology)}
        </p>
      </FrameCard>

      {/* Leader card */}
      {leader && (
        <>
          <h2
            className="eyebrow"
            style={{ marginTop: 36, marginBottom: 16 }}
          >
            Leader (BatchProducer)
          </h2>
          <NodeCard
            node={leader}
            leaderAcquiredAtEpochMs={topology.leader_acquired_at_epoch_ms}
            generatedAtEpochMs={topology.generated_at_epoch_ms}
            emphasis
          />
        </>
      )}

      {/* Replicas */}
      {replicas.length > 0 && (
        <>
          <h2
            className="eyebrow"
            style={{ marginTop: 40, marginBottom: 16 }}
          >
            Replicas (PgSyncReplica)
          </h2>
          <div
            style={{
              display: 'grid',
              gap: 20,
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            }}
          >
            {replicas.map((node) => (
              <NodeCard
                key={node.node_id}
                node={node}
                leaderAcquiredAtEpochMs={null}
                generatedAtEpochMs={topology.generated_at_epoch_ms}
                emphasis={false}
              />
            ))}
          </div>
        </>
      )}

      {topology.nodes.length === 0 && (
        <FrameCard>
          <Eyebrow>no nodes</Eyebrow>
          <p style={{ marginTop: 12 }}>
            No nodes have heartbeated into the cluster Postgres yet. Either
            this is right after a re-genesis, or the api couldn&apos;t reach
            the chain (cluster_health =&nbsp;
            <code>{topology.cluster_health}</code>).
          </p>
        </FrameCard>
      )}

      <footer
        style={{
          marginTop: 56,
          opacity: 0.55,
          fontSize: 12,
        }}
      >
        Snapshot from{' '}
        <code>{new Date(topology.generated_at_epoch_ms).toISOString()}</code>.
        Refreshes every 5 seconds on navigation. The chain endpoint itself
        caches at 1 s; the api proxy caches at 5 s.
      </footer>
    </>
  )
}

function NodeCard({
  node,
  leaderAcquiredAtEpochMs,
  generatedAtEpochMs,
  emphasis,
}: {
  node: { node_id: string; is_leader: boolean; last_heartbeat_age_ms: number }
  leaderAcquiredAtEpochMs: number | null
  generatedAtEpochMs: number
  emphasis: boolean
}) {
  const heartbeatFresh = node.last_heartbeat_age_ms < 1000
  const heartbeatStale = node.last_heartbeat_age_ms > 2000

  const rows: { label: ReactNode; value: ReactNode }[] = [
    { label: 'Node ID', value: <code style={{ fontSize: 13 }}>{node.node_id}</code> },
    {
      label: 'Role',
      value: node.is_leader ? (
        <RolePill emphasis>BatchProducer</RolePill>
      ) : (
        <RolePill>PgSyncReplica</RolePill>
      ),
    },
    {
      label: 'Last heartbeat',
      value: (
        <HeartbeatBadge
          ageMs={node.last_heartbeat_age_ms}
          fresh={heartbeatFresh}
          stale={heartbeatStale}
        />
      ),
    },
  ]

  if (node.is_leader && leaderAcquiredAtEpochMs !== null) {
    const heldForMs = generatedAtEpochMs - leaderAcquiredAtEpochMs
    rows.push({
      label: 'Lock held for',
      value: formatDuration(heldForMs),
    })
    rows.push({
      label: 'Acquired at',
      value: (
        <code style={{ fontSize: 12 }}>
          {new Date(leaderAcquiredAtEpochMs).toISOString()}
        </code>
      ),
    })
  }

  return (
    <FrameCard
      style={
        emphasis
          ? { borderColor: 'var(--color-accent)' }
          : undefined
      }
    >
      <LV rows={rows} />
    </FrameCard>
  )
}

function HealthDot({ health }: { health: ClusterHealth }) {
  const color =
    health === 'healthy'
      ? 'var(--color-accent)'
      : health === 'degraded'
        ? '#e0c87a'
        : health === 'leaderless'
          ? '#d77a7a'
          : '#888'
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        width: 14,
        height: 14,
        borderRadius: '50%',
        backgroundColor: color,
      }}
    />
  )
}

function RolePill({
  children,
  emphasis = false,
}: {
  children: ReactNode
  emphasis?: boolean
}) {
  const style: React.CSSProperties = emphasis
    ? {
        background: 'var(--color-accent)',
        color: '#0a0a0b',
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: 0.2,
      }
    : {
        background: 'transparent',
        color: 'var(--color-fg-muted, #aaa)',
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: 12,
        border: '1px solid var(--color-border, #2a2a2a)',
      }
  return <span style={style}>{children}</span>
}

function HeartbeatBadge({
  ageMs,
  fresh,
  stale,
}: {
  ageMs: number
  fresh: boolean
  stale: boolean
}) {
  const dotColor = fresh
    ? 'var(--color-accent)'
    : stale
      ? '#d77a7a'
      : '#e0c87a'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: dotColor,
        }}
      />
      {ageMs} ms ago
    </span>
  )
}

function healthLabel(h: ClusterHealth): string {
  switch (h) {
    case 'healthy':
      return 'healthy'
    case 'degraded':
      return 'degraded'
    case 'leaderless':
      return 'leaderless'
    case 'unknown':
      return 'unknown'
  }
}

function healthDescription(h: ClusterHealth, t: ClusterTopology): string {
  switch (h) {
    case 'healthy':
      return `Leader is ${t.leader_node_id ?? 'unknown'}. All ${t.nodes.length} nodes are heartbeating within the last second.`
    case 'degraded':
      return `Leader is ${t.leader_node_id ?? 'unknown'}, but at least one replica's heartbeat is older than 2 seconds. The cluster keeps producing batches; check the laggard before the next failover drill.`
    case 'leaderless':
      return `No node currently holds the Postgres lock. Failover is in progress, or the cluster is bootstrapping. Should resolve within ~12 seconds in a healthy DbElected setup.`
    case 'unknown':
      return `The api couldn't reach the chain's cluster endpoint. Either the chain endpoint is not configured (legacy single-sequencer mode), or the Caddy auth gate is missing the api's Bearer token. Returns to "healthy" the moment the connection works again.`
  }
}

function formatDuration(ms: number): string {
  if (ms < 0) return '—'
  const secs = Math.floor(ms / 1000)
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ${secs % 60}s`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ${mins % 60}m`
  const days = Math.floor(hrs / 24)
  return `${days}d ${hrs % 24}h`
}
