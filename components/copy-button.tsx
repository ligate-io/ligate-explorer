'use client'

import { useState } from 'react'
import { CopyIcon } from './svgs'

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    navigator.clipboard?.writeText(value).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }
  return (
    <button onClick={onClick} className={`copy-btn ${copied ? 'copied' : ''}`}>
      <CopyIcon />
      {copied ? 'COPIED' : 'COPY'}
    </button>
  )
}
