'use client'

import { useState } from 'react'

export function HeroVisual({ size = 480 }: { size?: number }) {
  const [state, setState] = useState<'loading' | 'loaded' | 'missing'>(
    'loading'
  )

  return (
    <div
      className="frame frame-bare"
      style={{
        width: size,
        height: size,
        marginLeft: 'auto',
        position: 'relative',
        background:
          'radial-gradient(ellipse at center, rgba(167,210,140,0.06) 0%, transparent 70%)',
        overflow: 'hidden',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hero-graphic.png"
        alt=""
        onLoad={() => setState('loaded')}
        onError={() => setState('missing')}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: state === 'loaded' ? 'block' : 'none',
        }}
      />
      {state === 'missing' ? (
        <div
          className="mono"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            color: 'var(--color-subtle)',
            fontSize: 10,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          <span>Drop hero image at</span>
          <span style={{ color: 'var(--color-accent)' }}>
            /public/hero-graphic.png
          </span>
          <span style={{ color: 'var(--color-line-2)', marginTop: 4 }}>
            {size} × {size}
          </span>
        </div>
      ) : null}
    </div>
  )
}
