'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { SearchResult } from '@/lib/api-types'
import { ExplorerLockup } from './lockup'
import { SearchIcon } from './svgs'

const TABS = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'blocks', label: 'Blocks', href: '/blocks' },
  { id: 'txs', label: 'Txs', href: '/txs' },
  { id: 'attestations', label: 'Attestations', href: '/attestations' },
  { id: 'schemas', label: 'Schemas', href: '/schemas' },
  { id: 'faucet', label: 'Faucet', href: '/faucet' },
  { id: 'cluster', label: 'Cluster', href: '/cluster' },
  { id: 'info', label: 'Info', href: '/info' },
]

function activeTab(pathname: string): string | null {
  if (pathname === '/') return 'home'
  if (pathname.startsWith('/blocks') || pathname.startsWith('/block/'))
    return 'blocks'
  if (pathname.startsWith('/txs') || pathname.startsWith('/tx/')) return 'txs'
  if (
    pathname.startsWith('/attestations') ||
    pathname.startsWith('/attestation/') ||
    pathname.startsWith('/attestor-set')
  )
    return 'attestations'
  if (pathname.startsWith('/schemas') || pathname.startsWith('/schema/'))
    return 'schemas'
  if (pathname.startsWith('/faucet')) return 'faucet'
  if (pathname.startsWith('/cluster')) return 'cluster'
  if (pathname.startsWith('/info')) return 'info'
  return null
}

function Wordmark() {
  return (
    <Link href="/" style={{ flexShrink: 0 }}>
      <ExplorerLockup symbolSize={30} wordSize={22} />
    </Link>
  )
}

// Browser-side base. lib/api.ts is server-only; the api responds with
// open CORS so we hit /v1/search directly. Same env variable the SSR
// fetchers read.
const apiBase = (
  process.env.NEXT_PUBLIC_API_URL ?? 'https://api.ligate.io'
).replace(/\/+$/, '')

async function searchFromBrowser(q: string): Promise<SearchResult> {
  let res: Response
  try {
    res = await fetch(
      `${apiBase}/v1/search?q=${encodeURIComponent(q)}`,
      { cache: 'no-store' },
    )
  } catch {
    // Network-level failure (offline, DNS, TLS, etc.). Distinct from
    // a definitive `not_found` so the UI can render an actionable
    // message ("api unreachable") instead of misleading the user that
    // their query was wrong.
    return { kind: 'error', message: 'Search unavailable: api unreachable.' }
  }
  if (!res.ok) {
    return {
      kind: 'error',
      message: `Search unavailable: api returned ${res.status}.`,
    }
  }
  let body: SearchResult | { error: string }
  try {
    body = (await res.json()) as SearchResult | { error: string }
  } catch {
    return { kind: 'error', message: 'Search unavailable: malformed response.' }
  }
  if ('kind' in body) return body
  // Body has `error` field instead of `kind` — the api returned a
  // structured error envelope (e.g. `{error: "internal error"}`).
  if ('error' in body) {
    return {
      kind: 'error',
      message: `Search unavailable: ${body.error}.`,
    }
  }
  // Body has neither shape; treat as a definitive miss.
  return { kind: 'not_found', query: q }
}

// Bech32m HRP routing. Stable across api outages: the explorer routes
// directly off the prefix. The api's /v1/search is reserved for the
// cases the prefix can't fully resolve (`lph1…` alone needs the
// schema_id lookup). Today the api is unreliable for `lsc1…` and
// `las1…` (returns `internal error` or `not_found`), so client-side
// prefix routing is the primary path and the api call is the fallback
// for `lph1…` only.
//
// `AttestationId` switched to a single bech32m id (`lat1…`) in
// ligate-chain v0.2.0 (was a compound `lsc1…:lph1…` before); the
// detection is now a single-HRP match like the others.
//
// Returns the route to push, or null when the input shape is unknown
// and we need to fall through to the server-side resolver.
function routeFromPrefix(input: string): string | null {
  if (/^lat1[a-z0-9]+$/i.test(input)) return `/attestation/${input}`
  if (/^lsc1[a-z0-9]+$/i.test(input)) return `/schema/${input}`
  if (/^las1[a-z0-9]+$/i.test(input)) return `/attestor-set/${input}`
  if (/^ltx1[a-z0-9]+$/i.test(input)) return `/tx/${input}`
  if (/^lig1[a-z0-9]+$/i.test(input)) return `/address/${input}`
  // Hex tx hash (chain still accepts 0x... via FromStr).
  const hex = input.replace(/^0x/i, '')
  if (/^[a-f0-9]{64}$/i.test(hex)) return `/tx/0x${hex.toLowerCase()}`
  // Pure integer → block height.
  if (/^\d+$/.test(input)) return `/blocks/${parseInt(input, 10)}`
  return null
}

function SearchBar() {
  const router = useRouter()
  const pathname = usePathname()
  const [val, setVal] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  // Clear the input whenever the path changes — that's what users
  // expect from explorer search bars (Etherscan / Beaconcha.in /
  // Solscan all do this). Without it, the search query lingers in
  // the box after the user navigated away from the result page.
  useEffect(() => {
    setVal('')
    setErr('')
  }, [pathname])

  // Outside-click: clear the input when the user clicks anywhere
  // outside the search form. Listens at the document level on
  // mousedown so it fires before the click target's own handlers.
  useEffect(() => {
    if (!val && !err) return
    const onDown = (e: MouseEvent) => {
      const form = formRef.current
      if (!form) return
      if (e.target instanceof Node && !form.contains(e.target)) {
        setVal('')
        setErr('')
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [val, err])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const v = val.trim()
    if (!v) return
    setErr('')

    // Client-side prefix routing first (works without the api,
    // covers everything the api currently chokes on).
    const direct = routeFromPrefix(v)
    if (direct) {
      router.push(direct)
      return
    }

    // Fall through to the server resolver. Today this is mostly for
    // `lph1…` alone (which needs the schema_id lookup the api owns),
    // and for any future query shape we don't recognise.
    setBusy(true)
    try {
      const result = await searchFromBrowser(v)
      switch (result.kind) {
        case 'block':
          router.push(`/blocks/${result.block_height}`)
          return
        case 'tx':
          router.push(`/tx/${result.tx_hash}`)
          return
        case 'address':
          router.push(`/address/${result.address}`)
          return
        case 'schema':
          router.push(`/schema/${result.schema_id}`)
          return
        case 'attestor_set':
          router.push(`/attestor-set/${result.attestor_set_id}`)
          return
        case 'attestation':
          router.push(`/attestation/${result.id}`)
          return
        case 'error':
          // API itself failed (network / 5xx / unparseable). Surface
          // the underlying reason so the user knows it's not their
          // query that's wrong.
          setErr(result.message)
          return
        case 'not_found':
        default:
          setErr('Nothing matched. Paste a hash, address, or block height.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      style={{ flex: 1, maxWidth: 720 }}
    >
      <div className="search-wrap" data-busy={busy ? 'true' : undefined}>
        <SearchIcon />
        <input
          type="search"
          placeholder="Hash, address, or block height"
          value={val}
          onChange={(e) => {
            setVal(e.target.value)
            if (err) setErr('')
          }}
          autoComplete="off"
          spellCheck="false"
          disabled={busy}
        />
        <span className="search-hint">{busy ? '…' : '↵'}</span>
      </div>
      {err ? <div className="search-error">{err}</div> : null}
    </form>
  )
}

// Hamburger icons drawn inline so we avoid an extra svg-file import
// and they share the parent's currentColor.
function HamburgerIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <path
        d="M3 3 L13 13 M13 3 L3 13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <path
        d="M2 4 H14 M2 8 H14 M2 12 H14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Header() {
  const pathname = usePathname()
  const active = activeTab(pathname)
  // Drawer state lives at the Header level so the close handler can
  // also be wired into the route-change effect below.
  const [drawerOpen, setDrawerOpen] = useState(false)
  // Auto-close the drawer whenever the user navigates. Without this,
  // clicking a link opens the new route but leaves the drawer pinned
  // open over the new content.
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])
  // Body-scroll lock while drawer is open — the CSS rule in
  // globals.css keys off this attribute on <html>. Closing the drawer
  // (or navigating) clears it.
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (drawerOpen) {
      document.documentElement.setAttribute('data-drawer-open', 'true')
    } else {
      document.documentElement.removeAttribute('data-drawer-open')
    }
    return () => {
      document.documentElement.removeAttribute('data-drawer-open')
    }
  }, [drawerOpen])
  return (
    <header
      style={{
        borderBottom: '1px solid var(--color-line)',
        background: 'var(--color-bg)',
        // Sticky so the navbar follows the user as they scroll. The
        // z-index sits above the drawer fallback (z:50) and the page
        // content. `top: 0` pins it to the viewport top edge.
        position: 'sticky',
        top: 0,
        zIndex: 60,
      }}
    >
      {/* `header-inner` + `header-nav` classes carry the mobile rules
          from globals.css. On desktop, .hamburger is display:none and
          .header-nav shows. On ≤1024px, .hamburger shows and
          .header-nav hides — the drawer below takes over. */}
      <div
        className="page-wrap header-inner"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 32,
          padding: '20px 32px',
        }}
      >
        <Wordmark />
        {/* `search-cell` lets the responsive layer push this to a
            full-width second row on mobile (under the logo +
            hamburger). Desktop keeps it centered between them. */}
        <div
          className="search-cell"
          style={{ flex: 1, display: 'flex', justifyContent: 'center' }}
        >
          <SearchBar />
        </div>
        <nav
          className="header-nav"
          style={{ display: 'flex', gap: 28, flexShrink: 0 }}
        >
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
        <button
          type="button"
          className="hamburger"
          aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen((v) => !v)}
        >
          <HamburgerIcon open={drawerOpen} />
        </button>
      </div>
      {drawerOpen ? (
        <div className="mobile-drawer" role="navigation">
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={t.href}
              className={`nav-link ${active === t.id ? 'active' : ''}`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      ) : null}
    </header>
  )
}
