'use client'

import { useEffect, useState } from 'react'
import { FrameCard } from './ui'

const BLOCK_TIME = 12

export function BlockTickerCard({ latestBlock }: { latestBlock: number }) {
  const [progress, setProgress] = useState(0)
  const [eta, setEta] = useState(BLOCK_TIME)

  useEffect(() => {
    const start = Date.now()
    const id = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000
      const p = (elapsed % BLOCK_TIME) / BLOCK_TIME
      setProgress(p)
      setEta(Math.max(0, BLOCK_TIME - (elapsed % BLOCK_TIME)))
    }, 100)
    return () => clearInterval(id)
  }, [])

  const cells = 18
  const filled = Math.floor(progress * cells)

  return (
    <FrameCard padding={22}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 18,
        }}
      >
        <div>
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
            Block
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span
              className="serif"
              style={{ fontSize: 30, color: 'var(--color-ink)', lineHeight: 1 }}
            >
              #{latestBlock.toLocaleString()}
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
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
            Block time
          </div>
          <span
            className="serif"
            style={{ fontSize: 22, color: 'var(--color-accent)' }}
          >
            ~{BLOCK_TIME.toFixed(2)}s
          </span>
        </div>
      </div>
      <div
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--color-muted)',
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            borderRadius: 999,
            background: 'var(--color-accent)',
            boxShadow: '0 0 6px var(--color-accent)',
          }}
        />
        Awaiting new block
      </div>
      <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
        {Array.from({ length: cells }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 22,
              background:
                i < filled ? 'var(--color-accent)' : 'rgba(167,210,140,0.08)',
              borderTop:
                '1px solid ' + (i < filled ? 'var(--color-accent)' : 'transparent'),
              backgroundImage:
                i >= filled
                  ? 'repeating-linear-gradient(135deg, transparent, transparent 4px, rgba(255,255,255,0.04) 4px, rgba(255,255,255,0.04) 5px)'
                  : 'none',
            }}
          />
        ))}
        <span
          className="mono"
          style={{
            marginLeft: 10,
            fontSize: 12,
            color: 'var(--color-muted)',
            minWidth: 30,
            textAlign: 'right',
          }}
        >
          {eta.toFixed(0)}s
        </span>
      </div>
    </FrameCard>
  )
}
