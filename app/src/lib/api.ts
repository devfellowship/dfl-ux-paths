import type { FlowsJson } from "./types";

// Preserves the a1f3 legacy contract (ADR-3): demo/fixture repos are read
// straight from static /fixtures/*.json (no server round-trip, no GitHub call
// — this is what lets the Playwright e2e suite run fully offline). Everything
// else goes through the server-side `/api/flows` proxy.
const DEMO_PREFIX = "demo/";
const FIXTURES_BASE = "/fixtures/";

// Canonical path within a real repo (server-side `/api/flows` allowlist,
// see server/lib.mjs guardPath — must live under this dir).
export const REAL_REPO_DEFAULT_PATH = ".dfl-ux-paths/flows.json";

// Fix (P0, 2026-07-08): each bundled demo/fixture repo has its OWN fixture
// filename under app/public/fixtures/ — NOT the real-repo convention above.
// Previously every `RepoPickerValue` (single/compareA/compareB) defaulted its
// `path` field to `REAL_REPO_DEFAULT_PATH` regardless of which repo was
// selected. For a demo repo that produces a request for e.g.
// `/fixtures/.dfl-ux-paths/flows.json`, which 404s and falls through to the
// Express SPA catch-all (`index.html`) — the client then tries to
// `JSON.parse` HTML and throws `SyntaxError: Unexpected token '<'`. This map
// is the single source of truth for "what's the right default path for this
// demo repo" so App.tsx (initial state) and RepoPicker (repo-switch) both
// stay correct instead of drifting independently.
export const DEMO_FIXTURE_PATHS: Record<string, string> = {
  "demo/lesson-studio-web": "lesson-studio-web.flows.json",
  "demo/learn-mobile-studio": "learn-mobile-studio.flows.json",
  "demo/requisitos-demo": "requisitos-demo.flows.json",
};

/** The correct default `path` for a given repo id (demo or real). */
export function defaultPathFor(repo: string): string {
  return DEMO_FIXTURE_PATHS[repo] || REAL_REPO_DEFAULT_PATH;
}

/** The correct default `ref` for a given repo id (demo fixtures use "fixture", real repos "main"). */
export function defaultRefFor(repo: string): string {
  return isDemoRepo(repo) ? "fixture" : "main";
}

export interface RepoRef {
  repo: string;
  path: string;
  ref?: string;
}

export function isDemoRepo(repo: string): boolean {
  return repo.startsWith(DEMO_PREFIX);
}

export function buildFlowsUrl({ repo, path, ref }: RepoRef): string {
  if (isDemoRepo(repo)) return FIXTURES_BASE + path;
  const r = repo.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "");
  const p = path.trim().replace(/^\//, "");
  const b = (ref || "main").trim() || "main";
  const qs = new URLSearchParams({ repo: r, path: p, ref: b });
  return `/api/flows?${qs.toString()}`;
}

export class FlowsFetchError extends Error {}

export async function fetchFlows(target: RepoRef): Promise<FlowsJson> {
  const url = buildFlowsUrl(target);
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch (e) {
    throw new FlowsFetchError(`Network error fetching ${url}: ${e instanceof Error ? e.message : String(e)}`);
  }

  const contentType = res.headers.get("content-type") || "";
  const looksJson = contentType.includes("json");

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    if (looksJson) {
      try {
        const body = await res.clone().json();
        if (body?.error) msg = body.error + (body.hint ? ` — ${body.hint}` : "");
      } catch {
        /* non-JSON error body */
      }
    }
    throw new FlowsFetchError(msg);
  }

  // Harden against a silent SPA/HTML fallback (e.g. a demo repo whose `path`
  // doesn't match its bundled fixture file, or any other misconfiguration
  // that 200s with HTML instead of the expected JSON): detect it up front via
  // content-type instead of letting `res.json()` throw a bare
  // "SyntaxError: Unexpected token '<'" that reaches the user unexplained.
  const raw = await res.text();
  if (!looksJson) {
    const looksLikeHtml = /^\s*</.test(raw);
    throw new FlowsFetchError(
      looksLikeHtml
        ? `Expected JSON but got HTML from ${url} — check repo/path/ref (this usually means the path doesn't exist for this repo).`
        : `Expected JSON but got content-type "${contentType || "unknown"}" from ${url}.`,
    );
  }

  let json: FlowsJson;
  try {
    json = JSON.parse(raw) as FlowsJson;
  } catch {
    throw new FlowsFetchError(`Response from ${url} was not valid JSON — check repo/path/ref.`);
  }

  if (!json.screens || !Array.isArray(json.screens)) {
    throw new FlowsFetchError("Not a valid flows.json — missing screens[].");
  }
  return json;
}

export interface RepoOption {
  repo: string;
  ref: string;
}

export interface ReposResponse {
  repos: RepoOption[];
  source: string;
}

const FALLBACK_REPOS: RepoOption[] = [
  { repo: "devfellowship/dfl-lesson-studio", ref: "main" },
  { repo: "demo/lesson-studio-web", ref: "fixture" },
  { repo: "demo/learn-mobile-studio", ref: "fixture" },
  { repo: "demo/requisitos-demo", ref: "fixture" },
];

export async function fetchRepos(): Promise<ReposResponse> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch("/api/repos", { cache: "no-store", signal: ctrl.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = (await res.json()) as ReposResponse;
      if (Array.isArray(data.repos) && data.repos.length) {
        return { repos: [...data.repos, ...FALLBACK_REPOS.filter((f) => isDemoRepo(f.repo))], source: data.source };
      }
    }
  } catch {
    /* fall through to fallback below */
  }
  return { repos: FALLBACK_REPOS, source: "fallback" };
}
