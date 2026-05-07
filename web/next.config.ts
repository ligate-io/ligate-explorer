import path from 'node:path'
import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Pin file tracing to this app — prevents Next from picking up a
  // stray lockfile higher in the filesystem (e.g. the user's home).
  outputFileTracingRoot: path.join(__dirname),
}

export default config
