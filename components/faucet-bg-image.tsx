'use client'

import { useState } from 'react'

export function FaucetBgImage() {
  const [missing, setMissing] = useState(false)
  if (missing) return null
  return (
    // The `.faucet-backdrop` class lets globals.css's responsive
    // layer scale + soften this on phones so it doesn't dominate
    // the small viewport. eslint-disable for raw <img> is fine here
    // since this is a decorative backdrop, not a content image.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/faucet-bg.png"
      alt=""
      aria-hidden="true"
      className="faucet-backdrop"
      onError={() => setMissing(true)}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        transform: 'scale(1.35)',
        transformOrigin: 'center',
        filter: 'blur(1.5px)',
        opacity: 1,
      }}
    />
  )
}
