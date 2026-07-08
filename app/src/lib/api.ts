import type { FlowsJson } from "./types";

// Preserves the a1f3 legacy contract (ADR-3): demo/fixture repos are read
// straight from static /fixtures/*.json (no server round-trip, no GitHub call
// — this is what lets the Playwright e2e suite run fully offline). Everything
// else goes through the server-side `/api/flows` proxy.
const DEMO_PREFIX = "demo/";
const FIXTURES_BASE = "/fixtures/";

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
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.clone().json();
      if (body?.error) msg = body.error + (body.hint ? ` — ${body.hint}` : "");
    } catch {
      /* non-JSON error body (e.g. static 404 for a fixture) */
    }
    throw new FlowsFetchError(msg);
  }
  const json = (await res.json()) as FlowsJson;
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
