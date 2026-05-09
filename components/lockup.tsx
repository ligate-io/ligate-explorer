// Full horizontal lockup matching ligate.io: interlocked pill-links mark
// + wordmark in Space Grotesk. The marketing site renders this as
// "Ligate Labs"; the explorer renders it as "Ligate explorer" with the
// suffix in sage to signal the sub-product without diverging visually.

import { useId } from 'react'

export function LigateMark({
  fg = 'var(--color-ink)',
  accent = 'var(--color-accent)',
  size = 26,
  className,
}: {
  fg?: string
  accent?: string
  size?: number
  className?: string
}) {
  const uid = `lm-${useId().replace(/:/g, '')}`
  const sw = 3
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <mask id={uid}>
        <rect width="48" height="48" fill="white" />
        <rect x="2.5" y="13.5" width="28" height="21" rx="10.5" fill="black" />
      </mask>
      <g mask={`url(#${uid})`}>
        <rect
          x="19"
          y="15"
          width="25"
          height="18"
          rx="9"
          stroke={fg}
          strokeWidth={sw}
          fill="none"
        />
      </g>
      <rect
        x="4"
        y="15"
        width="25"
        height="18"
        rx="9"
        stroke={accent}
        strokeWidth={sw}
        fill="none"
      />
    </svg>
  )
}

export function ExplorerLockup({
  symbolSize = 26,
  wordSize = 15,
}: {
  symbolSize?: number
  wordSize?: number
}) {
  const gap = Math.round(symbolSize * 0.32)
  return (
    <span
      className="inline-flex items-center"
      style={{ gap, fontFamily: 'var(--font-sans)' }}
    >
      <LigateMark size={symbolSize} />
      <span
        style={{
          color: 'var(--color-ink)',
          fontSize: wordSize,
          fontWeight: 500,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        Ligate{' '}
        <span style={{ color: 'var(--color-accent)' }}>explorer</span>
      </span>
    </span>
  )
}
