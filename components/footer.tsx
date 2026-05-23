// Footer with mono attribution + nav. Server-safe.
//
// Link surface mirrors the marketing site footer (docs / GitHub /
// X / Discord / status) so visitors moving between explorer and
// landing don't lose their bearings. Order: by likelihood-to-click —
// docs first (most-asked-for), social last.

const LINKS: { label: string; href: string; external?: boolean }[] = [
  { label: 'docs.ligate.io', href: 'https://docs.ligate.io', external: true },
  // Internal: partner-iframe embed widgets index. Lives on the
  // explorer itself, not the marketing site, so it's the one footer
  // link that isn't an off-site domain. Sits next to docs because the
  // audience is the same: developers integrating against the chain.
  { label: 'embed widgets', href: '/embed' },
  {
    label: 'github / ligate-io',
    href: 'https://github.com/ligate-io',
    external: true,
  },
  { label: 'discord', href: 'https://discord.gg/ZWUeJ8k3eP', external: true },
  { label: 'x / @ligatelabs', href: 'https://x.com/ligatelabs', external: true },
  { label: 'status', href: 'https://status.ligate.io', external: true },
]

export function Footer() {
  return (
    <footer
      style={{
        marginTop: 32,
        borderTop: '1px solid var(--color-line)',
        background: 'var(--color-bg)',
      }}
    >
      {/* `footer-inner` flips to a stacked column under 768px so the
          three blocks (© line / link strip / chain id) don't squish. */}
      <div
        className="page-wrap footer-inner"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '24px 32px',
        }}
      >
        <div className="col">© 2026 Ligate Labs · devnet build</div>
        <div
          className="col"
          style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}
        >
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="a"
              target={l.external ? '_blank' : undefined}
              rel={l.external ? 'noopener noreferrer' : undefined}
            >
              {l.label}
            </a>
          ))}
        </div>
        <div className="col" style={{ color: 'var(--color-subtle)' }}>
          ligate-devnet-1
        </div>
      </div>
    </footer>
  )
}
