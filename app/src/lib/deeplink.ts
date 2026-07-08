import type { RepoRef } from "./api";

// Preserves the a1f3 legacy deep-link contract (ADR-3):
//   single   — ?repo=&path=&ref=              (ref optional, defaults main)
//   compare  — ?a_repo=&a_path=&a_ref=&b_repo=&b_path=&b_ref=
// Plus a new `mode` param (additive) to pick the initial tab/lens:
//   ?mode=explorar|comparar|requisitos|roteiro
export type ModeName = "explorar" | "comparar" | "requisitos" | "roteiro";

export interface DeepLinkState {
  mode: ModeName | null;
  single: RepoRef | null;
  compareA: RepoRef | null;
  compareB: RepoRef | null;
}

export function parseDeepLink(search: string): DeepLinkState {
  const q = new URLSearchParams(search);
  const mode = q.get("mode") as ModeName | null;

  const aRepo = q.get("a_repo");
  const bRepo = q.get("b_repo");
  const compareA = aRepo
    ? { repo: aRepo, path: q.get("a_path") || ".dfl-ux-paths/flows.json", ref: q.get("a_ref") || undefined }
    : null;
  const compareB = bRepo
    ? { repo: bRepo, path: q.get("b_path") || ".dfl-ux-paths/flows.json", ref: q.get("b_ref") || undefined }
    : null;

  const repo = q.get("repo");
  const single = repo
    ? { repo, path: q.get("path") || ".dfl-ux-paths/flows.json", ref: q.get("ref") || undefined }
    : null;

  return {
    mode: mode && ["explorar", "comparar", "requisitos", "roteiro"].includes(mode) ? mode : null,
    single,
    compareA,
    compareB,
  };
}

export function buildDeepLink(state: Partial<DeepLinkState>): string {
  const q = new URLSearchParams();
  if (state.mode) q.set("mode", state.mode);
  if (state.single) {
    q.set("repo", state.single.repo);
    q.set("path", state.single.path);
    if (state.single.ref) q.set("ref", state.single.ref);
  }
  if (state.compareA) {
    q.set("a_repo", state.compareA.repo);
    q.set("a_path", state.compareA.path);
    if (state.compareA.ref) q.set("a_ref", state.compareA.ref);
  }
  if (state.compareB) {
    q.set("b_repo", state.compareB.repo);
    q.set("b_path", state.compareB.path);
    if (state.compareB.ref) q.set("b_ref", state.compareB.ref);
  }
  const qs = q.toString();
  return qs ? `?${qs}` : "";
}
