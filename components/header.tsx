'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { ExplorerLockup } from './lockup'
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
    <Link href="/" style={{ flexShrink: 0 }}>
      <ExplorerLockup symbolSize={26} wordSize={15} />
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
    // Bech32m identifiers: each HRP routes to a different page. Order
    // matters because regexes are tried top-to-bottom; specific HRPs
    // before more general ones.
    if (/^lig1[a-z0-9]+$/.test(v)) return router.push(`/address/${v}`)
    if (/^lsc1[a-z0-9]+$/.test(v)) return router.push(`/schema/${v}`)
    if (/^ltx1[a-z0-9]+$/.test(v)) return router.push(`/tx/${v}`)
    // Hex backward-compat: chain still accepts `0x...` hex on the tx
    // path via FromStr; we route through `/tx/0x...` to keep the URL
    // shape consistent with the existing pattern.
    const hex = v.replace(/^0x/i, '')
    if (/^[a-f0-9]{64}$/i.test(hex)) return router.push(`/tx/0x${hex.toLowerCase()}`)
    // Block height (decimal int).
    if (/^\d+$/.test(v)) return router.push(`/blocks/${parseInt(v, 10)}`)
    // Other bech32m families exist on the chain (lblk = block hash,
    // lba = batch hash, lsch = chain hash, lbz = DA blob hash, lsr =
    // state root, las/lph/lpk = attestation-module ids) but no
    // explorer routes yet. Recognise them and say so explicitly so a
    // user pasting one knows it's a known shape, not a typo.
    if (/^(lblk|lba|lsch|lbz|lsr|las|lph|lpk)1[a-z0-9]+$/.test(v)) {
      return setErr(
        `Recognised as a ${v.split('1')[0]}1… identifier, but no explorer route exists yet.`,
      )
    }
    setErr(
      'Unrecognized. Paste a tx (ltx1… / 0x…), address (lig1…), schema id (lsc1…), or block height.',
    )
  }

  return (
    <form onSubmit={submit} style={{ flex: 1, maxWidth: 720 }}>
      <div className="search-wrap">
        <SearchIcon />
        <input
          type="search"
          placeholder="Search by tx (ltx1… / 0x…), address (lig1…), schema (lsc1…), or block height"
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
        position: 'relative',
        zIndex: 10,
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
