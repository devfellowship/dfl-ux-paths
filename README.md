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

## Schema v1.1 — navigation metadata (additive, backward compatible)

v1.1 adds optional metadata so test-runners (`e2e-user-persona`, Playwright
flows, screenshot-driven regressions) can auto-generate persona scripts from
`flows.json` instead of doing LLM-driven discovery via clicks.

**All v1.1 fields are optional.** v1.0 files continue to validate without
modification — opt-in incrementally.

### New `screen` fields

- `navigation_path[]` — ordered list of UI steps to navigate TO this screen
  from the app entrypoint. When multiple selectors are listed the runner
  tries them in order; first match wins (resilient to renames).
- `prerequisites{}` — `auth_required`, `auth_role`, `data_required[]`,
  `preconditions_in_app[]`, `feature_flags[]`.

### New `flow.steps[]` form — rich step objects

`steps` accepts either a bare screen id (v1.0 form) **or** an object with
`action` / `selector` / `target_screen` / `wait_for_target` (v1.1). Mixed
arrays are allowed during migration.

### New top-level `test_metadata{}`

- `auth_strategy` — e.g. `"supabase-anon + CLAUDE_SMOKE creds"`.
- `default_viewport` — `mobile` | `tablet` | `desktop` | `responsive`.
- `base_url` — production / smoke URL.
- `test_user_secret_path` — Infisical path for credentials.

### Example (v1.1 opt-in)

```jsonc
{
  "schema_version": "1.1.0",
  "app_id": "dfl-lesson-studio",
  "app_version": "2026-05-25-abc1234",
  "test_metadata": {
    "auth_strategy": "supabase-anon + CLAUDE_SMOKE creds",
    "default_viewport": "mobile",
    "base_url": "https://rec.devfellowship.com/",
    "test_user_secret_path": "/shared/CLAUDE_SMOKE_USERNAME"
  },
  "screens": [
    {
      "id": "studio_list",
      "name": "Studio tab — project list",
      "navigation_path": [
        { "selector": "text=Studio", "action": "tap", "wait_for": "text=+ Nova Aula" },
        { "selector": "role=tab[name=Studio]", "action": "tap" }
      ],
      "prerequisites": {
        "auth_required": true,
        "data_required": ["lesson_studio.projects has >= 0 rows"],
        "preconditions_in_app": ["Studio tab feature flag enabled"]
      }
    },
    { "id": "template_picker", "name": "Template picker" }
  ],
  "flows": [
    {
      "name": "create_new_lesson",
      "start": "studio_list",
      "steps": [
        {
          "screen": "studio_list",
          "action": "tap",
          "selector": "text=+ Nova Aula",
          "target_screen": "template_picker",
          "wait_for_target": "css=[data-testid=template-grid]"
        }
      ]
    }
  ]
}
```

### Mermaid generator behavior under v1.1

- Screens with `prerequisites.auth_required = true` render with a 🔒 prefix.
- Screens with `navigation_path` get a `%% nav[<id>]:` comment summary.
- v1.1 flow-step objects produce richer arrow labels (`action: selector`).
- `test_metadata.base_url` surfaces as a `%% base_url:` header comment.

## Conventions

- Path inside the consumer repo: `<app-repo>/.dfl-ux-paths/flows.json`.
  Keep both `flows.json` and `flows.mmd` versioned (the Mermaid file is
  auto-generated; never edit by hand).
- `app_version` format: `YYYY-MM-DD-<git-sha-short>` (regex enforced by schema).
- `schema_version` is `1.0.0` (minimal) or `1.1.0` (with navigation metadata).
  v1.1 is additive — v1.0 files validate without changes.
- Screen / action / flow `id`s should be stable across versions to make
  diffing useful. Treat ids as a contract.

## Phase plan

- **Phase 0:** schema v1.0 + CLI scaffold + CI. ✅
- **Phase 1:** backfill 4 DFL apps with hand-curated `flows.json` (v1.0). ✅
- **Phase 1.1 (this PR):** schema v1.1 — additive navigation_path / prerequisites /
  test_metadata for executable persona scripts. Backward compatible.
- **Phase 1.5:** publish CLI to npm so `npx @devfellowship/dfl-ux-paths-cli`
  works without a local clone (currently repo-local).
- **Phase 2 (next):** GitHub Action that runs `validate` + `generate-mermaid`
  on PR; opt-in backfill of v1.1 navigation metadata in selected apps.
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
