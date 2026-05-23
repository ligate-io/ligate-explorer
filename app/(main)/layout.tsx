import { ApiHealthBanner } from '@/components/api-health-banner'
import { IndexerBanner } from '@/components/indexer-banner'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'

// Main-routes layout. Wraps every page under `app/(main)/` with the
// full explorer chrome — operational banners, sticky header, page
// wrap, footer. Sibling route group `app/embed/` has its own
// chromeless layout for partner-iframe widgets.
//
// The grain texture + min-height flex column moved here from the
// root layout so embed routes don't inherit them — partner iframes
// want a transparent surface and natural content height, not a
// full-viewport flex container with our brand backdrop bleeding
// through.

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className="grain"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Operational banners. Both render nothing in the healthy
          case and never render together — `ApiHealthBanner` covers
          api-unreachable (5xx / network), `IndexerBanner` covers
          api-alive-but-indexer-behind (head_lag_slots > threshold).
          Sit above <Header /> so they pin to the top of the viewport. */}
      <ApiHealthBanner />
      <IndexerBanner />
      <Header />
      <main
        className="page-anim"
        style={{
          paddingTop: 16,
          paddingBottom: 40,
          flex: 1,
        }}
      >
        <div className="page-wrap">{children}</div>
      </main>
      <Footer />
    </div>
  )
}
