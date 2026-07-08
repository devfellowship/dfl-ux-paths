# e2e

Playwright suite covering the 3 use cases (see the plan's §2 mapping),
fully offline against `public/fixtures/*.json` via the `repo=demo/...`
convention (`src/lib/api.ts`) — no live GitHub calls, no `GITHUB_READ_TOKEN`
needed. `playwright.config.ts` builds + previews the app and points tests at
`http://localhost:4173`.

| Spec | UC | Lens | Asserts |
|---|---|---|---|
| `uc1-requisitos-fluxo.spec.ts` | UC1 | Requisitos→Fluxo + Roteiro | coverage matrix renders `requirements[]`, links to screens, flags the deliberate gap; Roteiro stepper walks the fictional/sketch screens; export stub is honestly disabled |
| `uc2-comparar-revisao.spec.ts` | UC2 | Comparar (Revisão) | pairs 2 real fixtures by `screen.id`, exact paired/changed/added/removed counts, side-by-side render |
| `uc3-explorar-atlas.spec.ts` | UC3 | Explorar (Atlas) | React Flow canvas renders the expected node/edge counts + the screen list (source_ref, action chips, gallery) |

Run: `pnpm --filter @devfellowship/ux-paths-app e2e` (needs `playwright install
--with-deps chromium` once).
