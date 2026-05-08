// Footer with mono attribution + minimal nav. Server-safe.

export function Footer() {
  return (
    <footer
      style={{
        marginTop: 80,
        borderTop: '1px solid var(--color-line)',
        background: 'var(--color-bg)',
      }}
    >
      <div
        className="page-wrap"
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
        <div className="col" style={{ color: 'var(--color-accent)' }}>
          <span
            style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: 999,
              background: 'currentColor',
              marginRight: 8,
              verticalAlign: 'middle',
              boxShadow: '0 0 6px currentColor',
            }}
          />
          BLOCK 1247 · 2.4 TPS
        </div>
      </div>
    </footer>
  )
}
