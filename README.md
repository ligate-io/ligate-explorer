# ligate-explorer

[![CI](https://github.com/ligate-io/ligate-explorer/actions/workflows/ci.yml/badge.svg)](https://github.com/ligate-io/ligate-explorer/actions/workflows/ci.yml) [![License: Apache-2.0 OR MIT](https://img.shields.io/badge/license-Apache--2.0_OR_MIT-blue.svg)](#license) [![Chain](https://img.shields.io/badge/chain-ligate--devnet--1-A7D28C.svg)](https://github.com/ligate-io/ligate-chain) [![Docs](https://img.shields.io/badge/docs-docs.ligate.io-A7D28C.svg)](https://docs.ligate.io) [![Pre-devnet](https://img.shields.io/badge/status-pre--devnet-E8833A.svg)](#status)

Block explorer for [Ligate Chain](https://github.com/ligate-io/ligate-chain). Blocks, transactions, schemas, attestor sets, and attestations: live state of devnet.

## Quick start

You need `cargo` (1.93+, pinned in `rust-toolchain.toml`), [`pnpm`](https://pnpm.io), and Docker.

```bash
# 1. Postgres
docker compose -f deploy/docker-compose.yml up -d postgres

# 2. Indexer (points at host.docker.internal:12346 by default;
#    run a local ligate-node alongside or override --rpc-url)
cargo run -p ligate-indexer -- \
    --database-url postgres://postgres:postgres@localhost:5432/ligate_explorer

# 3. Frontend
cd web
cp .env.example .env.local
pnpm install
pnpm dev          # http://localhost:3000
```

A local Ligate Chain node serves its REST API at `http://127.0.0.1:12346` by default. Boot one from the `ligate-chain` repo:

```bash
cargo run --bin ligate-node       # MockDA, instant
```

## Status

**Pre-devnet.** Scaffold + types are wired. Indexer ingest loop and full set of frontend routes are in active development. Tracking issue: [`ligate-chain#80`](https://github.com/ligate-io/ligate-chain/issues/80) (and absorbs [`#91`](https://github.com/ligate-io/ligate-chain/issues/91), the indexer service, since the explorer is the primary consumer of indexed chain state).

`ligate-devnet-1` is targeted for **Q2 2026**.

## What this is

Devnet without an explorer is a black hole for users. This repo holds the indexer service and the web frontend that together render `https://explorer.ligate.io`:

- Latest blocks list (height, timestamp, tx count, blob size on Celestia).
- Transaction detail view (sender, type, payload, success/failure, fee).
- Schema browser: list registered schemas, click into one for its attestor set, fee config, and recent attestations.
- Attestation lookup by id (`lat1...`).
- Address lookup (balances, sequencer/attester/prover bonds).

The chain's REST API is **point-lookups only by design**: list, range, time-bucketed, and aggregation queries don't live on consensus nodes. The indexer fills that gap by reading the chain's REST surface and writing denormalized rows into Postgres.

## Architecture

```mermaid
flowchart LR
    Chain[ligate-node<br/>REST API]
    Indexer[ligate-indexer<br/>backfill + tail]
    DB[("Postgres<br/>slots, txs, schemas,<br/>attestor_sets, attestations")]
    Web[web/<br/>Next.js 15<br/>+ React 19]
    User["explorer.ligate.io"]

    Chain -->|"GET /v1/ledger/slots"| Indexer
    Chain -->|"GET /v1/rollup/info"| Indexer
    Indexer -->|"INSERT"| DB
    Web -->|"server components"| DB
    User --> Web
```

- **Indexer** (`crates/indexer`): Polls `/v1/ledger/slots/latest` and backfills history on first run. Writes denormalized rows for fast list and range queries the chain's REST surface deliberately does not serve.
- **Types** (`crates/types`): Serde-deserializable wire types for the chain's REST responses. Stands alone — doesn't pull in the chain workspace or the Sovereign SDK as transitive deps.
- **Frontend** (`web/`): Next.js 15 + React 19, server components read Postgres directly. No separate API tier in v0; one will land as a sibling crate if `ligate-chain#91`'s public API surface materializes differently than expected.

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

## Deploy

- **Frontend → Vercel**: root directory `web/`, framework auto-detected as Next.js. Set `DATABASE_URL` in Vercel env to the Postgres connection URL.
- **Indexer + Postgres → Railway**: deploy the indexer container from `deploy/Dockerfile.indexer`. Add a Railway Postgres in the same project and reuse its connection URL on Vercel.
- **DNS**: point `explorer.ligate.io` at the Vercel project.

## Development

```bash
# Workspace lint + check
cargo fmt --all -- --check
cargo clippy --all-targets -- -D warnings
cargo check --all-targets

# Web typecheck
cd web && pnpm typecheck
```

## Related

- Tracking: [`ligate-chain#80`](https://github.com/ligate-io/ligate-chain/issues/80)
- Chain REST API reference: [`docs/protocol/rest-api.md`](https://github.com/ligate-io/ligate-chain/blob/main/docs/protocol/rest-api.md)
- CLI consumer: [`ligate-io/ligate-cli`](https://github.com/ligate-io/ligate-cli)

## License

Apache-2.0 OR MIT, at your option. See [`LICENSE-APACHE`](LICENSE-APACHE) and [`LICENSE-MIT`](LICENSE-MIT).
