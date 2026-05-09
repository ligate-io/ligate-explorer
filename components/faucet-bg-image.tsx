'use client'

import { useState } from 'react'

export function FaucetBgImage() {
  const [missing, setMissing] = useState(false)
  if (missing) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/faucet-bg.png"
      alt=""
      aria-hidden="true"
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
