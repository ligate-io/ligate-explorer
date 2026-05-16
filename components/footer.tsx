// Footer with mono attribution + minimal nav. Server-safe.

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
        <div className="col" style={{ display: 'flex', gap: 24 }}>
          <a href="https://docs.ligate.io" className="a">
            docs.ligate.io
          </a>
          <a href="https://github.com/ligate-io" className="a">
            github / ligate-io
          </a>
          <a href="https://status.ligate.io" className="a">
            status
          </a>
        </div>
        <div className="col" style={{ color: 'var(--color-subtle)' }}>
          ligate-devnet-1
        </div>
      </div>
    </footer>
  )
}
