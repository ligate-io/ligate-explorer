# Ligate Chain explorer

Block, transaction, schema, attestor set, and attestation explorer for
[Ligate Chain](https://github.com/ligate-io/ligate-chain).

Status: **scaffold**. Tracks chain issue
[#80](https://github.com/ligate-io/ligate-chain/issues/80) (explorer UI)
and absorbs [#91](https://github.com/ligate-io/ligate-chain/issues/91)
(indexer service) since the explorer is the primary consumer of indexed
chain state.

## Layout

```
ligate-explorer/
├── crates/
│   ├── types/      ligate-explorer-types — serde wire types matching
│   │               the chain's REST API shapes
│   └── indexer/    ligate-indexer — Rust service that subscribes to a
│                   Ligate Chain node and writes into Postgres
├── web/            Next.js 15 frontend, brand-aligned with ligate.io
└── deploy/         Dockerfile, docker-compose, deploy notes
```

## Running locally

You need `cargo` (1.93+, pinned in `rust-toolchain.toml`),
[`pnpm`](https://pnpm.io), and Docker.

```bash
# 1. Boot Postgres + indexer (indexer points at host.docker.internal:12346
#    by default; run a local ligate-node alongside or override RPC_URL).
docker compose -f deploy/docker-compose.yml up -d postgres
cargo run -p ligate-indexer -- --database-url postgres://postgres:postgres@localhost:5432/ligate_explorer

# 2. Frontend
cd web
cp .env.example .env.local
pnpm install
pnpm dev          # http://localhost:3000
```

A local Ligate Chain node serves its REST API at `http://127.0.0.1:12346`
by default. Boot one from the `ligate-chain` repo:

```bash
cargo run --bin ligate-node       # MockDA, instant
```

## Architecture

- **Indexer** (`crates/indexer`): Polls `/v1/ledger/slots/latest` plus
  the `/v1/ledger/slots/latest/ws` WebSocket for live tail. Backfills
  history on first run. Writes denormalized rows for fast list and
  range queries the chain's REST surface deliberately does not serve.
- **Types** (`crates/types`): Serde-deserializable wire types for the
  chain's REST responses. Stands alone — doesn't pull in the chain
  workspace or the Sovereign SDK as transitive deps.
- **Frontend** (`web`): Next.js 15 + React 19, server components read
  Postgres directly. No separate API tier in v0; one will land here as
  a sibling crate when the chain's
  [#91](https://github.com/ligate-io/ligate-chain/issues/91) public API
  surface materializes.

## Deploy

- **Frontend → Vercel**: root directory `web/`, framework auto-detected
  as Next.js. Set `DATABASE_URL` in Vercel env to the Railway Postgres
  connection URL.
- **Indexer + Postgres → Railway**: deploy the indexer container from
  `deploy/Dockerfile.indexer`. Add a Railway Postgres in the same
  project and reuse its connection URL on Vercel.
- **DNS**: point `explorer.ligate.io` at the Vercel project.

## License

Dual-licensed under either of:

- [Apache License, Version 2.0](LICENSE-APACHE)
- [MIT license](LICENSE-MIT)

at your option.
