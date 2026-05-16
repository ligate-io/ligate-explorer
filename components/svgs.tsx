// All SVGs (icons + animated visuals) used across the explorer.
// Pure presentational, server-safe, no state.

import { useMemo } from 'react'

export function SearchIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <circle cx="6" cy="6" r="4.5" stroke="#6a6a74" strokeWidth="1.2" />
      <line x1="9.5" y1="9.5" x2="13" y2="13" stroke="#6a6a74" strokeWidth="1.2" />
    </svg>
  )
}

export function CopyIcon({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <rect x="2" y="2" width="7" height="7" stroke="currentColor" strokeWidth="1" />
      <rect x="4" y="4" width="6" height="6" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

export function ArrowRight({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path
        d="M2 6 L10 6 M6 2 L10 6 L6 10"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
      />
    </svg>
  )
}

// Animated network of nodes orbiting a central attestation pulse.
// Pulsing "scaling" circles on inner ring removed per user feedback.
export function NetworkOrb({ size = 280 }: { size?: number }) {
  const cx = size / 2
  const cy = size / 2
  const nodes = useMemo(() => {
    const arr: { x: number; y: number; ring: number; delay: number }[] = []
    for (let ring = 0; ring < 3; ring++) {
      const radius = 50 + ring * 36
      const count = 6 + ring * 3
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + ring * 0.4
        arr.push({
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          ring,
          delay: (ring * 0.3 + i * 0.1) % 3,
        })
      }
    }
    return arr
  }, [])

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <radialGradient id="orb-glow" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#a7d28c" stopOpacity="0.3" />
          <stop offset="60%" stopColor="#a7d28c" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={size / 2} fill="url(#orb-glow)" />
      {[50, 86, 122].map((rad, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={rad}
          fill="none"
          stroke="#26262d"
          strokeWidth="1"
          strokeDasharray="2 4"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from={`0 ${cx} ${cy}`}
            to={`${i % 2 === 0 ? 360 : -360} ${cx} ${cy}`}
            dur={`${30 + i * 10}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}
      {nodes.slice(0, 9).map((n, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={cx + n.x}
          y2={cy + n.y}
          stroke="#a7d28c"
          strokeWidth="0.5"
          opacity="0.18"
        >
          <animate
            attributeName="opacity"
            values="0;0.5;0"
            dur="3s"
            begin={`${n.delay}s`}
            repeatCount="indefinite"
          />
        </line>
      ))}
      {nodes.map((n, i) => (
        <g key={i} transform={`translate(${cx + n.x}, ${cy + n.y})`}>
          <circle
            r="2"
            fill={n.ring === 0 ? '#a7d28c' : '#6a6a74'}
            opacity="0.9"
          />
        </g>
      ))}
      <circle cx={cx} cy={cy} r="6" fill="#a7d28c" />
      <line x1={cx - 14} y1={cy} x2={cx - 8} y2={cy} stroke="#0a0a0b" strokeWidth="2" />
      <line x1={cx + 8} y1={cy} x2={cx + 14} y2={cy} stroke="#0a0a0b" strokeWidth="2" />
      <line x1={cx} y1={cy - 14} x2={cx} y2={cy - 8} stroke="#0a0a0b" strokeWidth="2" />
      <line x1={cx} y1={cy + 8} x2={cx} y2={cy + 14} stroke="#0a0a0b" strokeWidth="2" />
    </svg>
  )
}

// Tx lifecycle flow with travelling pulse, dashed connectors, and corner marks.
export function TxFlowSvg({
  status = 'SUCCESS',
}: {
  status?: 'SUCCESS' | 'PENDING' | 'REVERTED'
}) {
  const accent =
    status === 'SUCCESS' ? '#a7d28c' : status === 'PENDING' ? '#d9b26a' : '#e88a7a'
  const stages = [
    { x: 60, label: 'SUBMITTED', meta: 'mempool' },
    { x: 220, label: 'PROPOSED', meta: 'sequencer' },
    { x: 380, label: 'ATTESTED', meta: '2 of 3 sigs' },
    { x: 540, label: 'FINALIZED', meta: 'celestia' },
    { x: 680, label: 'INDEXED', meta: 'explorer' },
  ]
  return (
    <svg viewBox="0 0 720 180" width="100%" height="180" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="line-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={accent} stopOpacity="0" />
          <stop offset="50%" stopColor={accent} stopOpacity="1" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="40" y1="90" x2="680" y2="90" stroke="#1a1a1f" strokeWidth="1" />
      <line x1="40" y1="90" x2="680" y2="90" stroke="url(#line-grad)" strokeWidth="2">
        <animate
          attributeName="stroke-dashoffset"
          from="0"
          to="-200"
          dur="2s"
          repeatCount="indefinite"
        />
      </line>
      {stages.map((s, i) => (
        <g key={i}>
          {i < stages.length - 1 && (
            <line
              x1={s.x}
              y1="90"
              x2={stages[i + 1].x}
              y2="90"
              stroke={accent}
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.5"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="0"
                to="-12"
                dur="1.5s"
                begin={`${i * 0.2}s`}
                repeatCount="indefinite"
              />
            </line>
          )}
          <circle cx={s.x} cy="90" r="6" fill="#0a0a0b" stroke={accent} strokeWidth="1.5" />
          <circle cx={s.x} cy="90" r="2.5" fill={accent}>
            <animate
              attributeName="opacity"
              values="1;0.3;1"
              dur="2s"
              begin={`${i * 0.4}s`}
              repeatCount="indefinite"
            />
          </circle>
          <text
            x={s.x}
            y="60"
            textAnchor="middle"
            fontFamily="JetBrains Mono"
            fontSize="9"
            letterSpacing="2"
            fill="#a8a8b3"
          >
            {s.label}
          </text>
          <text
            x={s.x}
            y="120"
            textAnchor="middle"
            fontFamily="JetBrains Mono"
            fontSize="9"
            fill="#6a6a74"
          >
            {s.meta}
          </text>
        </g>
      ))}
      {([
        [20, 20, 'tl'],
        [700, 20, 'tr'],
        [20, 160, 'bl'],
        [700, 160, 'br'],
      ] as const).map(([x, y, pos], i) => (
        <g key={i} stroke="#a7d28c" strokeWidth="1" fill="none">
          {pos === 'tl' && <path d={`M${x},${y + 8} L${x},${y} L${x + 8},${y}`} />}
          {pos === 'tr' && <path d={`M${x},${y} L${x + 8},${y} L${x + 8},${y + 8}`} />}
          {pos === 'bl' && <path d={`M${x},${y - 8} L${x},${y} L${x + 8},${y}`} />}
          {pos === 'br' && <path d={`M${x},${y} L${x + 8},${y} L${x + 8},${y - 8}`} />}
        </g>
      ))}
    </svg>
  )
}

// Sparkline of tx counts across recent blocks. Latest block highlighted in sage
// (no pulsing animation per user feedback).
export function BlockSpark({
  blocks,
}: {
  blocks: { tx_count: number }[]
}) {
  if (!blocks.length) return null
  // Guard against the all-zero case (early devnet, every recent block
  // has tx_count: 0). Using 1 here makes every bar render as 0 height
  // instead of NaN, which keeps React from complaining about NaN SVG
  // attributes and the spark from collapsing.
  const max = Math.max(1, ...blocks.map((b) => b.tx_count))
  const w = 1.0
  const h = 60
  const gap = 0.2
  return (
    <svg
      viewBox={`0 0 ${blocks.length * (w + gap)} ${h + 4}`}
      width="100%"
      height={h + 4}
      preserveAspectRatio="none"
    >
      {blocks
        .slice()
        .reverse()
        .map((b, i, arr) => {
          const bh = (b.tx_count / max) * h
          return (
            <rect
              key={i}
              x={i * (w + gap)}
              y={h - bh + 2}
              width={w}
              height={bh}
              fill={i === arr.length - 1 ? '#a7d28c' : '#26262d'}
            />
          )
        })}
    </svg>
  )
}

// Schema attestor-set diagram (e.g. 2 of 3 ring).
export function ThresholdRing({
  have = 2,
  total = 3,
  size = 88,
}: {
  have?: number
  total?: number
  size?: number
}) {
  const r = size / 2 - 6
  const cx = size / 2
  const cy = size / 2
  const items = []
  for (let i = 0; i < total; i++) {
    const a = (i / total) * Math.PI * 2 - Math.PI / 2
    items.push({
      x: cx + Math.cos(a) * r,
      y: cy + Math.sin(a) * r,
      filled: i < have,
    })
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1a1a1f" strokeWidth="1" />
      {items.map((it, i) => (
        <g key={i}>
          {it.filled && (
            <line
              x1={cx}
              y1={cy}
              x2={it.x}
              y2={it.y}
              stroke="#a7d28c"
              strokeWidth="1"
              opacity="0.4"
            />
          )}
          <circle
            cx={it.x}
            cy={it.y}
            r="5"
            fill={it.filled ? '#a7d28c' : '#0a0a0b'}
            stroke={it.filled ? '#a7d28c' : '#26262d'}
            strokeWidth="1.5"
          />
        </g>
      ))}
      <text
        x={cx}
        y={cy + 4}
        textAnchor="middle"
        fontFamily="JetBrains Mono"
        fontSize="11"
        fill="#EFEAD8"
      >
        {have}/{total}
      </text>
    </svg>
  )
}

// Faucet circuit: subtle traces converging on a central droplet. Pulse rings
// removed per user feedback (no scaling green circles).
export function CircuitDrop() {
  const horiz = [60, 120, 200, 240, 280]
  return (
    <svg
      viewBox="0 0 800 320"
      width="100%"
      height="320"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="trace" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#a7d28c" stopOpacity="0" />
          <stop offset="80%" stopColor="#a7d28c" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#a7d28c" stopOpacity="1" />
        </linearGradient>
      </defs>
      {horiz.map((y, i) => (
        <g key={`l${i}`}>
          <line x1="0" y1={y} x2="380" y2={y} stroke="#1a1a1f" strokeWidth="1" />
          <path d={`M380 ${y} L400 160`} stroke="#1a1a1f" strokeWidth="1" fill="none" />
        </g>
      ))}
      {horiz.map((y, i) => (
        <g key={`r${i}`}>
          <line x1="800" y1={y} x2="420" y2={y} stroke="#1a1a1f" strokeWidth="1" />
          <path d={`M420 ${y} L400 160`} stroke="#1a1a1f" strokeWidth="1" fill="none" />
        </g>
      ))}
      {[60, 200, 280].map((y, i) => (
        <circle key={`mp${i}`} cx="0" cy={y} r="2.5" fill="#a7d28c">
          <animateMotion
            dur={`${4 + i}s`}
            repeatCount="indefinite"
            path={`M0 0 L380 0 L400 ${160 - y}`}
          />
        </circle>
      ))}
      {[120, 240].map((y, i) => (
        <circle key={`mr${i}`} cx="800" cy={y} r="2.5" fill="#a7d28c">
          <animateMotion
            dur={`${5 + i}s`}
            repeatCount="indefinite"
            path={`M0 0 L-380 0 L-400 ${160 - y}`}
          />
        </circle>
      ))}
      <g transform="translate(400 160)">
        <circle r="40" fill="none" stroke="#26262d" strokeDasharray="2 4">
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0"
            to="360"
            dur="40s"
            repeatCount="indefinite"
          />
        </circle>
        <circle r="22" fill="#0a0a0b" stroke="#a7d28c" strokeWidth="1.5" />
        <path d="M0 -10 L8 4 A8 8 0 1 1 -8 4 Z" fill="#a7d28c" />
      </g>
    </svg>
  )
}
