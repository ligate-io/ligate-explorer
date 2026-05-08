'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { SearchIcon } from './svgs'

const TABS = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'blocks', label: 'Blocks', href: '/blocks' },
  { id: 'txs', label: 'Txs', href: '/txs' },
  { id: 'schemas', label: 'Schemas', href: '/schemas' },
  { id: 'faucet', label: 'Faucet', href: '/faucet' },
  { id: 'info', label: 'Info', href: '/info' },
]

function activeTab(pathname: string): string | null {
  if (pathname === '/') return 'home'
  if (pathname.startsWith('/blocks') || pathname.startsWith('/block/'))
    return 'blocks'
  if (pathname.startsWith('/txs') || pathname.startsWith('/tx/')) return 'txs'
  if (pathname.startsWith('/schemas') || pathname.startsWith('/schema/'))
    return 'schemas'
  if (pathname.startsWith('/faucet')) return 'faucet'
  if (pathname.startsWith('/info')) return 'info'
  return null
}

function Wordmark() {
  return (
    <Link
      href="/"
      style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}
    >
      <svg width="22" height="22" viewBox="0 0 22 22">
        <rect
          x="1"
          y="1"
          width="20"
          height="20"
          stroke="#a7d28c"
          fill="none"
          strokeWidth="1"
        />
        <path d="M5 11 L9 7 L13 11 L9 15 Z" fill="#a7d28c" />
        <circle cx="15" cy="11" r="2" fill="none" stroke="#a7d28c" strokeWidth="1" />
      </svg>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--color-ink)',
        }}
      >
        Ligate <span style={{ color: 'var(--color-subtle)' }}>·</span>{' '}
        <span style={{ color: 'var(--color-accent)' }}>explorer</span>
      </div>
    </Link>
  )
}

function SearchBar() {
  const router = useRouter()
  const [val, setVal] = useState('')
  const [err, setErr] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const v = val.trim()
    if (!v) return
    setErr('')
    if (/^lig1[a-z0-9]+$/.test(v)) return router.push(`/address/${v}`)
    if (/^lsc1[a-z0-9]+$/.test(v)) return router.push(`/schema/${v}`)
    const hex = v.replace(/^0x/, '')
    if (/^[a-f0-9]{64}$/i.test(hex)) return router.push(`/tx/0x${hex}`)
    if (/^\d+$/.test(v)) return router.push(`/blocks/${parseInt(v, 10)}`)
    setErr('Unrecognized — paste a tx hash, address, schema id, or block height')
  }

  return (
    <form onSubmit={submit} style={{ flex: 1, maxWidth: 720 }}>
      <div className="search-wrap">
        <SearchIcon />
        <input
          type="search"
          placeholder="Search by hash, lig1…, lsc1…, or block height"
          value={val}
          onChange={(e) => {
            setVal(e.target.value)
            if (err) setErr('')
          }}
          autoComplete="off"
          spellCheck="false"
        />
        <span className="search-hint">↵</span>
      </div>
      {err ? <div className="search-error">{err}</div> : null}
    </form>
  )
}

export function Header() {
  const pathname = usePathname()
  const active = activeTab(pathname)
  return (
    <header
      style={{
        borderBottom: '1px solid var(--color-line)',
        background: 'var(--color-bg)',
      }}
    >
      <div
        className="page-wrap"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 32,
          padding: '20px 32px',
        }}
      >
        <Wordmark />
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <SearchBar />
        </div>
        <nav style={{ display: 'flex', gap: 28, flexShrink: 0 }}>
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={t.href}
              className={`nav-link ${active === t.id ? 'active' : ''}`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
