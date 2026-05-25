# Deploy — `explorer.ligate.io` on Vercel

**Status:** v0 — single-Vercel-project deploy for the Next.js frontend. The indexer that feeds the explorer's queries lives in [`ligate-api`](https://github.com/ligate-io/ligate-api) (deployed separately on Railway); this runbook covers ONLY the frontend deploy.

Companion to [`README.md`](../README.md) (local dev), [`ligate-api`'s deploy story](https://github.com/ligate-io/ligate-api) (the live API backend), and [chain-side `public-devnet-deploy.md`](https://github.com/ligate-io/ligate-chain/blob/main/docs/development/public-devnet-deploy.md) (the chain the API queries).

---

## Architecture (one screen)

```
Browser
  v https://explorer.ligate.io
Vercel (Next.js 15 static + serverless)  <- this repo
  v https://api.ligate.io (read)
Railway (ligate-api: indexer + REST query layer)  <- ligate-api repo
  v Postgres (Railway-managed)
GCP VM (ligate-node)  <- ligate-chain repo
```

Three vendors:
- **Vercel** hosts the Next.js app at `explorer.ligate.io`. Auto-deploys on push to `main`.
- **Railway** hosts the api binary + a managed Postgres. The api scrapes the chain's REST endpoints and serves explorer queries.
- **GCP VM** hosts `ligate-node` + a co-located Celestia light node. The chain itself.

The explorer is the thinnest layer — UI only. All state queries go through `api.ligate.io`.

---

## One-time setup

### 1. Vercel project

1. Vercel dashboard -> **New Project** -> import from GitHub (`ligate-io/ligate-explorer`)
2. Framework preset: **Next.js** (auto-detected; verify)
3. Root directory: `./` (repo root)
4. Build command: `pnpm build` (from `vercel.json`)
5. Output directory: `.next`
6. Install command: `pnpm install --frozen-lockfile`

The committed [`vercel.json`](../vercel.json) sets all of the above declaratively; you can skip the UI override step if Vercel picks it up.

### 2. Environment variables

Set in **Project Settings -> Environment Variables** for all environments (Production, Preview, Development):

| Var | Production value | What it does |
|---|---|---|
| `USE_MOCK_API` | `false` | Use the live ligate-api. Set `true` to render against mock fixtures (`lib/mock.ts`) — useful for design / static-preview work without backend. |
| `NEXT_PUBLIC_API_URL` | `https://api.ligate.io` | Where Server Components fetch from |
| `NEXT_PUBLIC_RPC_URL` | `https://rpc.ligate.io` | Surfaced in the UI for copy-paste, not used for fetches |

The `NEXT_PUBLIC_*` vars are inlined at build time and visible in client-side JS. Don't put secrets here.

### 3. Custom domain

1. Vercel dashboard -> **Domains** -> add `explorer.ligate.io`
2. Vercel returns a CNAME target (something like `cname.vercel-dns.com`)
3. DNS provider (Cloudflare): add CNAME record `explorer` -> `cname.vercel-dns.com`
4. Cloudflare proxy: either DNS-only or proxied — both work. DNS-only gives Vercel direct cert management.
5. Wait ~1 min for Vercel to verify + issue cert (Let's Encrypt automatic)

Cross-link `apex.ligate.io` / `www.ligate.io` is the marketing repo's concern, not this one.

### 4. Auto-deploy on push to main

Default Vercel behaviour: every commit to `main` triggers a build + deploy.

`vercel.json`'s `ignoreCommand` filters out doc-only changes — `README.md` and `docs/**` won't redeploy. The `git.deploymentEnabled` block explicitly enables `main`; if you want preview deploys on other branches, add them here.

---

## Verification

After the first deploy:

```sh
# 1. Frontend responds
curl -sf https://explorer.ligate.io | head -20

# 2. /info route consumes the live API
curl -sf https://explorer.ligate.io/info | grep -i chain_id

# 3. Faucet route loads (POST goes to api.ligate.io, not blocked by CORS)
curl -sf https://explorer.ligate.io/faucet | head -20
```

A render error on `/` usually means `USE_MOCK_API` isn't set or the api isn't reachable. Check Vercel's deployment logs first.

---

## Troubleshooting

### Build fails with "Module not found" on `pnpm install`

Vercel's Node version. Vercel defaults to Node 22 unless the project specifies otherwise. Verify in **Project Settings -> General -> Node.js Version**.

### Deploy succeeds but `/blocks` page shows "Loading..." forever

The page is a Server Component that awaits `getLatestBlocks()`. If `USE_MOCK_API=false` and `api.ligate.io` is down, the fetch hangs. Check:

```sh
curl -sf https://api.ligate.io/v1/info
```

If that 502s, the issue is on the api side (Railway deploy / GCP indexer ingestion). Look at [`ligate-api`'s deploy logs](https://github.com/ligate-io/ligate-api) first.

### `/faucet` form POSTs but the toast says "Network error"

CORS — the api needs `CorsLayer::permissive()` (or scoped to the explorer's origin). Confirm via:

```sh
curl -i -X OPTIONS https://api.ligate.io/v1/drip \
    -H "Origin: https://explorer.ligate.io" \
    -H "Access-Control-Request-Method: POST"
```

Should return `Access-Control-Allow-Origin` matching the explorer's origin.

### Wrong chain rendering ("ligate-localnet" instead of "ligate-devnet-2")

`NEXT_PUBLIC_API_URL` is wrong (pointing at a localnet). Verify the env var in Vercel; re-deploy after updating (Vercel doesn't auto-rebuild on env-var change).

---

## What this deliberately doesn't cover

- **Indexer / api / Postgres deploy.** Lives in [`ligate-api`](https://github.com/ligate-io/ligate-api). Separate deploy story.
- **Chain deploy.** Lives in [`ligate-chain` `public-devnet-deploy.md`](https://github.com/ligate-io/ligate-chain/blob/main/docs/development/public-devnet-deploy.md). Separate VM, separate operator role.
- **Analytics / observability on the frontend.** No Plausible / Sentry / etc. wired today. Add when there's meaningful traffic.
- **Preview branch deploys.** `vercel.json` enables `main` only. If you want PR previews, add the branch to `git.deploymentEnabled`.

---

## Cross-references

- [Issue #2](https://github.com/ligate-io/ligate-explorer/issues/2) — this work closes the explorer-side scope
- [`vercel.json`](../vercel.json) — the deploy config
- [`.env.example`](../.env.example) — env var template (mirrors prod)
- [`ligate-api`](https://github.com/ligate-io/ligate-api) — the backend the explorer queries
- [`ligate-chain` `public-devnet-deploy.md`](https://github.com/ligate-io/ligate-chain/blob/main/docs/development/public-devnet-deploy.md) — the chain deploy
