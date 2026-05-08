'use client'

import { useRouter } from 'next/navigation'
import { ago, fmtLgt, trunc } from '@/lib/format'
import type { Block, Tx } from '@/lib/api-types'
import { ArrowRight } from './svgs'
import { StatusPill, TypeTag } from './ui'

export function BlocksTable({ rows }: { rows: Block[] }) {
  const router = useRouter()
  return (
    <table className="tbl tab-num">
      <thead>
        <tr>
          <th>Height</th>
          <th>Hash</th>
          <th>Time</th>
          <th>Txs</th>
          <th>Proposer</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((b, i) => (
          <tr
            key={b.height}
            className={i === 0 ? 'fresh' : ''}
            onClick={() => router.push(`/blocks/${b.height}`)}
          >
            <td>
              <span className="mono" style={{ color: 'var(--color-ink)' }}>
                #{b.height}
              </span>
            </td>
            <td>
              <span className="h-mono">{trunc(b.hash, 8, 6)}</span>
            </td>
            <td>
              <span className="mono" style={{ color: 'var(--color-muted)' }}>
                {ago(Math.floor((Date.now() - b.timestamp) / 1000))}
              </span>
            </td>
            <td>
              <span className="mono">{b.tx_count}</span>
            </td>
            <td>
              <span className="h-mono">{trunc(b.proposer, 6, 4)}</span>
            </td>
            <td style={{ width: 24, textAlign: 'right' }}>
              <span className="row-arrow">
                <ArrowRight />
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function TxsTable({
  rows,
  showBlock = true,
}: {
  rows: Tx[]
  showBlock?: boolean
}) {
  const router = useRouter()
  return (
    <table className="tbl tab-num">
      <thead>
        <tr>
          <th>Hash</th>
          {showBlock ? <th>Block</th> : null}
          <th>Sender</th>
          <th>Type</th>
          <th>Status</th>
          <th>Fee</th>
          <th>Time</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((t, i) => (
          <tr
            key={t.hash}
            className={i === 0 ? 'fresh' : ''}
            onClick={() => router.push(`/tx/${t.hash}`)}
          >
            <td>
              <span className="h-mono">{trunc(t.hash, 8, 6)}</span>
            </td>
            {showBlock ? (
              <td>
                <span
                  className="mono"
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/blocks/${t.height}`)
                  }}
                  style={{ color: 'var(--color-muted)', cursor: 'pointer' }}
                >
                  #{t.height}
                </span>
              </td>
            ) : null}
            <td>
              <span
                className="h-mono"
                onClick={(e) => {
                  e.stopPropagation()
                  router.push(`/address/${t.sender}`)
                }}
                style={{ cursor: 'pointer' }}
              >
                {trunc(t.sender, 6, 4)}
              </span>
            </td>
            <td>
              <TypeTag type={t.type} />
            </td>
            <td>
              <StatusPill status={t.status} />
            </td>
            <td>
              <span className="mono" style={{ color: 'var(--color-bone)' }}>
                {fmtLgt(t.fee_nano)}{' '}
                <span style={{ color: 'var(--color-subtle)' }}>LGT</span>
              </span>
            </td>
            <td>
              <span className="mono" style={{ color: 'var(--color-muted)' }}>
                {ago(Math.floor((Date.now() - t.timestamp) / 1000))}
              </span>
            </td>
            <td style={{ width: 24, textAlign: 'right' }}>
              <span className="row-arrow">
                <ArrowRight />
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
