'use client'

import { useState } from 'react'

// Decorative blurred backdrop sitting behind the hero text and the
// first row of dashboard widgets. Absolutely positioned to fill its
// parent (which must be position: relative). Hides itself if the
// image asset isn't present.
export function HeroBackdrop() {
  const [missing, setMissing] = useState(false)
  if (missing) return null
  return (
    <div
      aria-hidden="true"
      className="hero-backdrop"
      style={{
        position: 'absolute',
        // Extend up past <main>'s 40px top padding (with extra
        // overscroll so any sub-pixel rounding doesn't show a seam).
        // The Header gets z-index: 10 in layout.tsx and covers any
        // overlap above its bottom border, so pushing this up further
        // is purely a safety margin. Bleed sideways past the
        // page-wrap's 32px horizontal padding to fill viewport width.
        top: -80,
        left: -32,
        right: -32,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
        // Fade only the bottom and sides into obsidian. Top stays
        // opaque so the image meets the navbar cleanly.
        WebkitMaskImage:
          'linear-gradient(to bottom, #000 0%, #000 70%, transparent 100%)',
        maskImage:
          'linear-gradient(to bottom, #000 0%, #000 70%, transparent 100%)',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hero-graphic.png"
        alt=""
        onError={() => setMissing(true)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center top',
          filter: 'blur(6px)',
          opacity: 0.45,
        }}
      />
    </div>
  )
}
