# dfl-ux-paths

Versioned per-app user-flow mapping for the DFL fleet — JSON schema + CLI.

Each DFL app gets a `.dfl-ux-paths/flows.json` file committed to its repo.
The file describes the app's **screens**, **actions**, and **flows** at a
specific build (`app_version`). A sibling `.dfl-ux-paths/flows.mmd` (Mermaid)
is auto-generated for native GitHub viewing.

The schema is intentionally minimal — see [`schema/v1.json`](./schema/v1.json).
Canonical schema URL:

```
https://raw.githubusercontent.com/devfellowship/dfl-ux-paths/main/schema/v1.json
```

Tracked under plan slug `20260523-dfl-diagrams-versioned-app-flow-mapping`
(slug may rename as the plan evolves).

## Why

- **Migration-gap analysis.** Diff `dfl-learn` (web) against `dfl-learn-mobile`
  (RN) to spot missing screens/actions in the mobile port.
- **Dead-code detection.** Surface components/screens that are no longer
  reachable from any flow.
- **Onboarding context.** New agents/humans get a versioned bird's-eye map of
  every app without having to read the whole source.
- **No dedicated UI.** JSON lives in git, Mermaid renders natively on GitHub
  — `dfl-diagrams` is the fallback for ad-hoc diagram authoring.

This replaces the prior manual "feature inventory" subagent pattern.

## CLI

Node ≥20. Install globally or use via `npx`:

```bash
# global (after publish)
pnpm add -g @devfellowship/dfl-ux-paths-cli
# or one-off
npx @devfellowship/dfl-ux-paths-cli <command>
```

Commands:

| Command | Purpose |
|---|---|
| `dfl-ux-paths init` | Bootstrap `.dfl-ux-paths/flows.json` in the current cwd. |
| `dfl-ux-paths validate [path]` | Validate a flows.json against schema v1 (exit 0/1). |
| `dfl-ux-paths generate-mermaid [path]` | Emit `flows.mmd` (read-only Mermaid). |
| `dfl-ux-paths diff <a.json> <b.json>` | Diff screens/actions/flows between two snapshots. |
| `dfl-ux-paths stamp [path]` | Refresh `app_version` to `YYYY-MM-DD-<git-sha-short>` and bump `generated_at`. |

## Schema (v1, minimal)

Top-level required fields: `schema_version`, `app_id`, `app_version`, `screens`, `flows`.

```jsonc
{
  "schema_version": "1.0.0",
  "app_id": "dfl-learn-mobile",
  "app_version": "2026-05-23-abcdef0",
  "generated_at": "2026-05-23T12:00:00Z",
  "tech_stack": ["react-native", "expo", "powersync"],
  "screens": [
    {
      "id": "home",
      "name": "Home",
      "route": "/",
      "actions": [
        { "id": "tap_lessons", "label": "View Lessons", "next_screen": "lessons" }
      ]
    },
    { "id": "lessons", "name": "Lessons" }
  ],
  "flows": [
    { "name": "browse_lessons", "start": "home", "steps": ["lessons"] }
  ],
  "dead_code": []
}
```

See [`schema/v1.json`](./schema/v1.json) for the full JSON Schema.

## Conventions

- Path inside the consumer repo: `<app-repo>/.dfl-ux-paths/flows.json`.
  Keep both `flows.json` and `flows.mmd` versioned (the Mermaid file is
  auto-generated; never edit by hand).
- `app_version` format: `YYYY-MM-DD-<git-sha-short>` (regex enforced by schema).
- `schema_version` is `1.0.0`; bump only via a new repo release.
- Screen / action / flow `id`s should be stable across versions to make
  diffing useful. Treat ids as a contract.

## Phase plan

- **Phase 0 (this repo, current PR):** schema v1 + CLI scaffold + CI.
- **Phase 1 (next):** backfill 4 DFL apps with hand-curated `flows.json`.
- **Phase 2:** GitHub Action that runs `validate` + `generate-mermaid` on PR.
- **Phase 3:** static-analysis helper that proposes a `flows.json` from
  React/RN source (probably opt-in per app).

## Development

```bash
pnpm install
pnpm test       # vitest
pnpm run lint   # tsc --noEmit
pnpm run build  # emits dist/
node bin/cli.js --help
```

## License

MIT.
