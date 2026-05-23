import QRCode from 'qrcode'

// Server-rendered address QR. Generates the SVG inline at build /
// request time via the `qrcode` package (~10KB compressed) — no
// third-party QR API call, so the address never leaves our domain
// and there's no privacy surface to think about.
//
// Rendered next to the copy button on `/address/[addr]` so phones
// can scan-to-paste. Sized small (120px) — large enough to scan,
// small enough to not dominate the page header.
//
// Sage on obsidian to match the brand. White-on-black would be more
// readable to some QR scanners but visually breaks the page; the
// sage/dark contrast still scans cleanly on every modern phone.

interface AddressQrProps {
  value: string
  size?: number
}

export async function AddressQr({ value, size = 120 }: AddressQrProps) {
  // toString returns the SVG markup as a string. We embed it via
  // dangerouslySetInnerHTML rather than passing through an <img src=
  // data:...> because inline SVG renders crisply at any DPI and we
  // get full control over the colors via the `color` option.
  const svg = await QRCode.toString(value, {
    type: 'svg',
    width: size,
    margin: 1,
    color: {
      // Dark = sage accent (the QR "pixels"), light = obsidian bg.
      // Both colors are opaque so the QR scans the same on any
      // backdrop the surrounding page paints.
      dark: '#a7d28c',
      light: '#0a0a0b',
    },
    errorCorrectionLevel: 'M',
  })

  return (
    <div
      aria-label={`QR code for address ${value}`}
      title={`Scan to copy: ${value}`}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        border: '1px solid var(--color-line)',
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
