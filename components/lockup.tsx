// Full horizontal lockup matching ligate.io's current rebrand (R3):
// the three-piece ligature mark + "Ligate Labs" wordmark in Space
// Grotesk. Mirrors `apps/landing/src/components/{LigateMark,Lockup}.tsx`
// 1-to-1 so the explorer's header reads as part of the same brand
// family as the marketing site. The mark is monochrome; mark and
// wordmark share one colour.

// Path geometry, lifted from the marketing repo's design handoff.
// Three pieces — top hexagon, left chevron, bottom-right flag — woven
// through one another. Echoes "ligate" (to bind) and reads as three
// elements held on one structure (the three first-party flagships on
// one protocol).
const PATH_BOTTOM_RIGHT =
  'M123.03 55.9332L115.623 68.7795L108.216 81.6154L100.819 94.4513L93.4121 107.277H34.2075L26.8004 94.4513L19.4037 81.6154H78.6187L86.0154 68.7795L93.4121 55.9332H123.03Z'
const PATH_LEFT =
  'M49.0113 30.2718L41.6042 43.0973L34.2075 55.9332L26.8004 68.7795L19.4037 81.6154L11.9967 68.7795L4.59998 55.9332L11.9967 43.0973L19.4037 30.2718H49.0113Z'
const PATH_TOP =
  'M108.216 30.2718L100.819 43.0973L93.4121 55.9332H63.8046L71.2221 43.0973L78.6188 30.2718H49.0112L56.4079 17.4359L63.8046 4.60001H93.4121L100.819 17.4359L108.216 30.2718Z'

const ASPECT = 112 / 128

export function LigateMark({
  fg = 'var(--color-ink)',
  size = 30,
  className,
}: {
  fg?: string
  size?: number
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size * ASPECT}
      viewBox="0 0 128 112"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Draw order preserved from the handoff so the over/under weave
          reads correctly: bottom-right, then left, then top. */}
      <path
        d={PATH_BOTTOM_RIGHT}
        stroke={fg}
        strokeWidth={9.2}
        strokeLinejoin="round"
      />
      <path
        d={PATH_LEFT}
        stroke={fg}
        strokeWidth={9.2}
        strokeLinejoin="round"
      />
      <path d={PATH_TOP} stroke={fg} strokeWidth={9.2} strokeLinejoin="round" />
    </svg>
  )
}

export function ExplorerLockup({
  fg = 'var(--color-ink)',
  symbolSize = 30,
  wordSize = 18,
}: {
  fg?: string
  symbolSize?: number
  wordSize?: number
}) {
  // Slightly tighter than the old square mark: the new mark's
  // bottom-right flag already carries the eye toward the wordmark.
  const gap = Math.round(symbolSize * 0.28)
  return (
    <span
      className="inline-flex items-center"
      style={{ gap, fontFamily: 'var(--font-sans, "Space Grotesk")' }}
    >
      <LigateMark fg={fg} size={symbolSize} />
      <span
        style={{
          color: fg,
          fontSize: wordSize,
          fontWeight: 500,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        Ligate Explorer
      </span>
    </span>
  )
}
