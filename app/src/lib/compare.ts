import type { FlowsJson, Screen } from "./types";

// ADR-9 — compare semantics: paired/changed/added/removed via screen.id (the
// sticky 1:1 join key, ADR-3). `a` = baseline/old side, `b` = new/reference
// side. `changed` (exists on both sides but visually/structurally differs) is
// NOT computed yet — that needs the vision-judge/a11y-diff from
// `parity-e2e-diff` (parent plan BB-3). This is the documented TODO hook:
// wire `detectChanged(a, b)` in a follow-up phase and flip qualifying
// "paired" rows to "changed".
export type DiffStatus = "paired" | "changed" | "added" | "removed";

export interface ComparePair {
  id: string;
  a: Screen | null;
  b: Screen | null;
  status: DiffStatus;
}

export interface CompareResult {
  pairs: ComparePair[];
  counts: Record<DiffStatus, number>;
}

// TODO(Fase 1 follow-up, ADR-9): plug in real vision-diff / a11y-diff here.
// Signature kept stable so wiring it in later is a one-line change in
// `pairByScreenId` below (replace the `"paired"` literal with this call).
export function detectChanged(_a: Screen, _b: Screen): boolean {
  return false;
}

export function pairByScreenId(a: FlowsJson, b: FlowsJson): CompareResult {
  const am = new Map((a.screens || []).map((s) => [s.id, s] as const));
  const bm = new Map((b.screens || []).map((s) => [s.id, s] as const));
  const ids = Array.from(new Set([...am.keys(), ...bm.keys()])).sort((x, y) => {
    const rank = (id: string) => (am.has(id) && bm.has(id) ? 0 : am.has(id) ? 1 : 2);
    return rank(x) - rank(y) || x.localeCompare(y);
  });

  const counts: Record<DiffStatus, number> = { paired: 0, changed: 0, added: 0, removed: 0 };
  const pairs: ComparePair[] = ids.map((id) => {
    const av = am.get(id) ?? null;
    const bv = bm.get(id) ?? null;
    let status: DiffStatus;
    if (av && bv) {
      status = detectChanged(av, bv) ? "changed" : "paired";
    } else if (av && !bv) {
      status = "removed"; // present in old (A), absent in new (B)
    } else {
      status = "added"; // present in new (B), absent in old (A)
    }
    counts[status]++;
    return { id, a: av, b: bv, status };
  });

  return { pairs, counts };
}
