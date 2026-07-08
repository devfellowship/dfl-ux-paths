# ux-paths app (`app/`)

React app for the **ux-paths** ("caminhos de UX") family — the rewrite of the
legacy `flows-viewer-a1f3` (`devfellowship/dfl-labs:prototypes/flows-viewer-a1f3/`).
Consumes `.dfl-ux-paths/flows.json` (schema `../schema/v1.json`, currently v1.2)
to explore, compare, and narrate app UI flows.

Plan: [`20260615-flows-viewer-multimode-evolution`](https://plans.devfellowship.com/20260615-flows-viewer-multimode-evolution)
(Fase 1). Decisions are locked ADRs in that plan — see it before changing
stack/architecture here.

## Stack

Vite `^8` · React `^19.2` · TailwindCSS `^4.2` (via `@tailwindcss/vite`) ·
TypeScript · `@devfellowship/components ^2.0.0` (tokens/Tailwind preset) ·
canvas via **React Flow** (`@xyflow/react`). Server: a small Express app
(`server/`) that serves the built SPA + re-implements the two legacy proxy
routes.

## Modes (lenses) — one fixed lens per use case (ADR-2, Fase 1 scope)

| Tab | Lens | Use case | Status |
|---|---|---|---|
| **Explorar** | Atlas (React Flow spatial canvas) | UC3 — refactor vs. reference | ✅ Fase 1 |
| **Comparar** | Revisão (paired/changed/added/removed split view) | UC2 — refactor keeping requirements | ✅ Fase 1 (`changed` detection is a TODO hook — see `src/lib/compare.ts`) |
| **Requisitos→Fluxo** | Coverage matrix + gap detection | UC1 — new UI from requirements | ⚠️ Fixture-driven viewer only. Consumes the **v1.3 forward-looking** `requirements[]` / `screen.fidelity` fields additively (schema bump itself is a separate, human-gated `dfl-ux-paths` PR — Fase 2). The LLM/MCP **generation** pipeline (wireframe→render→S3, ADR-5/6) is Fase 3. |
| **Roteiro** | Present-mode / storyboard stepper | UC1 client-facing narrative | ⚠️ Viewer only — Export to image/PDF (ADR-7/Q6) is a disabled stub, lands Fase 4. |

## Run locally

```bash
pnpm install         # from repo root (pnpm workspace — see ../pnpm-workspace.yaml)
pnpm --filter @devfellowship/ux-paths-app dev      # Vite dev server :5173
pnpm --filter @devfellowship/ux-paths-app server   # Express API server :3100 (proxied by vite dev)
```

Demo data loads automatically with no server/token needed — `repo=demo/...`
targets read straight from `public/fixtures/*.json` (see `src/lib/api.ts`),
bypassing `/api/flows` entirely. This is also what the Playwright e2e suite
runs against (fully offline, no GitHub calls).

### Production build + server

```bash
pnpm --filter @devfellowship/ux-paths-app build    # → app/dist
GITHUB_READ_TOKEN=... pnpm --filter @devfellowship/ux-paths-app start  # serves dist/ + /api/*
```

## Env vars

| Var | Required | Purpose |
|---|---|---|
| `GITHUB_READ_TOKEN` | for real (non-`demo/`) repos | GitHub Contents API read token, server-side only (never reaches the browser). Same allowlist as the legacy Pages Functions: owner must be `devfellowship`, path must start `.dfl-ux-paths/` and end `.json`/`.mmd`. |
| `PORT` | no (default `3100`) | Express server port. |

## Ported capabilities (ADR-3 — preserved from a1f3)

- `GET /api/flows?repo=&path=&ref=` — server-side GitHub Contents API proxy with the owner+path allowlist, supports **private** devfellowship repos. Ported 1:1 from `dfl-labs:functions/api/flows.js` → `server/routes.mjs`.
- `GET /api/repos` — repo discovery (code-search + curated probe). Ported from `dfl-labs:functions/api/repos.js`.
- Deep links: single `?repo=&path=&ref=`, compare `?a_repo=&a_path=&a_ref=&b_repo=&b_path=&b_ref=`, plus a new additive `?mode=explorar|comparar|requisitos|roteiro`.
- `screen.id` as the sticky 1:1 compare join key.
- Multi-viewport screenshot gallery (`platform × orientation × viewport`), placeholder when empty.

## Deploy (Dokploy — Q10)

Not deployed as part of this PR (deploy-ready, not deployed). Build context
must be the **repo root** (pnpm workspace), Dockerfile path `app/Dockerfile`:

```bash
safe-docker-build -f app/Dockerfile -t dfl-ux-paths-app:latest .
docker run -e GITHUB_READ_TOKEN=... -p 3100:3100 dfl-ux-paths-app:latest
```

## E2E (Playwright)

`e2e/` covers the 3 use cases end-to-end against a built preview server,
using only local fixtures (`public/fixtures/*.json`) — no live GitHub calls,
so it runs fully offline in CI.

```bash
pnpm --filter @devfellowship/ux-paths-app exec playwright install --with-deps chromium
pnpm --filter @devfellowship/ux-paths-app e2e
```

See `e2e/README.md` for what each spec asserts.
