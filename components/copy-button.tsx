'use client'

import { useState } from 'react'
import { CopyIcon } from './svgs'

export function CopyButton({
  value,
  compact = false,
}: {
  value: string
  /** Compact mode: icon-only, tighter padding. Used inside dense
   *  detail rows (sender / block hash on the tx page) where the
   *  default chunky "COPY" label sits awkwardly next to a long
   *  bech32 string. The COPIED feedback flashes a sage check icon
   *  for ~1.2s so the user still gets confirmation. */
  compact?: boolean
}) {
  const [copied, setCopied] = useState(false)
  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    navigator.clipboard?.writeText(value).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }
  return (
    <button
      onClick={onClick}
      className={`copy-btn${compact ? ' copy-btn-compact' : ''}${copied ? ' copied' : ''}`}
      title={copied ? 'Copied' : 'Copy'}
      aria-label={copied ? 'Copied' : 'Copy to clipboard'}
    >
      {compact && copied ? <CheckIcon /> : <CopyIcon />}
      {compact ? null : copied ? 'COPIED' : 'COPY'}
    </button>
  )
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
      <path
        d="M2.5 6 L5 8.5 L9.5 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
