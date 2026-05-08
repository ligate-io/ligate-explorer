# ligate-explorer

[![CI](https://github.com/ligate-io/ligate-explorer/actions/workflows/ci.yml/badge.svg)](https://github.com/ligate-io/ligate-explorer/actions/workflows/ci.yml) [![License: Apache-2.0 OR MIT](https://img.shields.io/badge/license-Apache--2.0_OR_MIT-blue.svg)](#license) [![Chain](https://img.shields.io/badge/chain-ligate--devnet--1-A7D28C.svg)](https://github.com/ligate-io/ligate-chain) [![Docs](https://img.shields.io/badge/docs-docs.ligate.io-A7D28C.svg)](https://docs.ligate.io) [![Pre-devnet](https://img.shields.io/badge/status-pre--devnet-E8833A.svg)](#status)

Block explorer frontend for [Ligate Chain](https://github.com/ligate-io/ligate-chain). Blocks, transactions, schemas, attestor sets, and attestations: live state of devnet at [`explorer.ligate.io`](https://explorer.ligate.io).

## Quick start

You need [`pnpm`](https://pnpm.io) (Node 22+).

```bash
pnpm install
cp .env.example .env.local
pnpm dev          # http://localhost:3000
```

By default the dev server reads from a typed mock API. Flip to a live backend by setting `USE_MOCK_API=false` and pointing `NEXT_PUBLIC_API_URL` at a running [`ligate-api`](https://github.com/ligate-io/ligate-api).

## Status

**Pre-devnet.** This repo is the Next.js frontend only — the Rust indexer + Postgres surface lives in [`ligate-io/ligate-api`](https://github.com/ligate-io/ligate-api). Tracking issue: [`ligate-chain#80`](https://github.com/ligate-io/ligate-chain/issues/80).

`ligate-devnet-1` is targeted for **Q2 2026**.

## What this is

Devnet without an explorer is a black hole for users. This frontend renders the public block-and-tx browser at `explorer.ligate.io`:

- Latest blocks + latest transactions on the homepage.
- Transaction detail view (sender, type, status, fee, signatures).
- Address detail (balance, recent tx history).
- Schema browser (name, version, attestor set, fees, recent attestations).
- One-click `$LGT` faucet for testing on devnet.
- Search bar that auto-routes by input shape (`lig1...`, `lsc1...`, 64-char hex).

UX inspiration: [Celenium](https://celenium.io/) (Celestia's block explorer). Differentiator is content (attestation primitives), not novel UX.

## Architecture

```mermaid
flowchart LR
    User["explorer.ligate.io"]
    Web["This repo<br/>Next.js 15 + React 19<br/>(Vercel)"]
    API["api.ligate.io<br/>ligate-api<br/>(Railway)"]
    Chain["rpc.ligate.io<br/>ligate-node<br/>(GCP)"]

    User --> Web
    Web -->|fetch| API
    API -->|reads| Chain
```

The frontend is a thin renderer over `api.ligate.io`. No direct chain RPC, no Postgres in this repo. All data fetching is centralised in `lib/api.ts` and runs in Server Components or Server Actions (faucet drip).

## Routes

| Route             | Purpose                                                      |
| ----------------- | ------------------------------------------------------------ |
| `/`               | Homepage: latest blocks + latest txs (two-column)            |
| `/tx/[hash]`      | Tx detail: from/to/type/status/fee/signatures                |
| `/address/[addr]` | Balance + recent tx history (paginated)                      |
| `/schema/[id]`    | Schema browser: name, version, attestor set, recent attests  |
| `/faucet`         | One-button drip: paste address → `Request 100 LGT`           |
| `/info`           | Chain identity, latest height, tx/sec, link to docs/SDK      |

`/blocks/[height]`, `/attestor-sets/[id]`, stats/charts, wallet integration, theme toggle, and i18n are all out of scope for v0. See the agent prompt for sequencing.

## Layout

```
ligate-explorer/
├── app/              Next.js 15 App Router
│   ├── globals.css   Tailwind v4 + brand tokens
│   ├── layout.tsx
│   └── page.tsx      Homepage
├── lib/              Helpers (api client, formatters, validators)
├── public/           Static assets (TBD)
├── package.json
├── next.config.ts
└── tsconfig.json
```

## Environment

```bash
NEXT_PUBLIC_API_URL=https://api.ligate.io     # ligate-api root
NEXT_PUBLIC_RPC_URL=https://rpc.ligate.io     # chain RPC, read-only
USE_MOCK_API=true                             # set false to hit the real API
```

Set on Vercel for prod and in `.env.local` for dev. See [`.env.example`](.env.example) for the canonical list.

## Deploy

- **Vercel.** Root directory `/`, framework auto-detected as Next.js. Set the three env vars above. Push-to-deploy from `main`.
- **DNS.** `explorer.ligate.io` → Vercel project.

## Brand

Tokens mirror [`ligate-io/ligate-marketing`](https://github.com/ligate-io/ligate-marketing) — sage `#A7D28C` accent, obsidian `#0a0a0b` bg, bone `#EFEAD8` ink, Instrument Serif headings, Space Grotesk body, JetBrains Mono chrome. If a route doesn't feel brand-consistent, look at how `apps/landing/src/components/hero/Hero.tsx` does it and mirror the pattern.

## Related

- Tracking: [`ligate-chain#80`](https://github.com/ligate-io/ligate-chain/issues/80)
- Backend: [`ligate-io/ligate-api`](https://github.com/ligate-io/ligate-api)
- Chain: [`ligate-io/ligate-chain`](https://github.com/ligate-io/ligate-chain)
- TypeScript SDK: [`ligate-io/ligate-js`](https://github.com/ligate-io/ligate-js) (`@ligate/sdk` — address validators, etc.)

## License

Apache-2.0 OR MIT, at your option. See [`LICENSE-APACHE`](LICENSE-APACHE) and [`LICENSE-MIT`](LICENSE-MIT).
