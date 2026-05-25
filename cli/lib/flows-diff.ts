import type { UxPathsDoc, FlowStep } from './types.js';

export interface FlowsDiffResult {
  screens: {
    added: string[];
    removed: string[];
    common: string[];
  };
  actions: {
    added: string[]; // formatted as "screenId.actionId"
    removed: string[];
  };
  flows: {
    added: string[];
    removed: string[];
    changed: Array<{ name: string; reason: string }>;
  };
}

/**
 * Diff two UX-paths docs. The intended primary use is gap analysis between
 * the same app on two platforms (e.g. web vs mobile) — `a` is the baseline,
 * `b` is the candidate. Items only in `a` are reported as "removed" (i.e.
 * "missing from candidate"), items only in `b` are "added".
 */
export function flowsDiff(a: UxPathsDoc, b: UxPathsDoc): FlowsDiffResult {
  const aScreenIds = new Set(a.screens.map((s) => s.id));
  const bScreenIds = new Set(b.screens.map((s) => s.id));

  const screensAdded = [...bScreenIds].filter((id) => !aScreenIds.has(id)).sort();
  const screensRemoved = [...aScreenIds].filter((id) => !bScreenIds.has(id)).sort();
  const screensCommon = [...aScreenIds].filter((id) => bScreenIds.has(id)).sort();

  const aActionKeys = collectActionKeys(a);
  const bActionKeys = collectActionKeys(b);
  const actionsAdded = [...bActionKeys].filter((k) => !aActionKeys.has(k)).sort();
  const actionsRemoved = [...aActionKeys].filter((k) => !bActionKeys.has(k)).sort();

  const aFlowsByName = new Map(a.flows.map((f) => [f.name, f]));
  const bFlowsByName = new Map(b.flows.map((f) => [f.name, f]));
  const flowsAdded = [...bFlowsByName.keys()].filter((n) => !aFlowsByName.has(n)).sort();
  const flowsRemoved = [...aFlowsByName.keys()].filter((n) => !bFlowsByName.has(n)).sort();
  const flowsChanged: Array<{ name: string; reason: string }> = [];

  for (const name of [...aFlowsByName.keys()].sort()) {
    const aFlow = aFlowsByName.get(name)!;
    const bFlow = bFlowsByName.get(name);
    if (!bFlow) continue;
    const reasons: string[] = [];
    if (aFlow.start !== bFlow.start) {
      reasons.push(`start: ${aFlow.start} → ${bFlow.start}`);
    }
    if (!stepArraysEqual(aFlow.steps, bFlow.steps)) {
      reasons.push(`steps changed (${aFlow.steps.length} → ${bFlow.steps.length})`);
    }
    if (!arraysEqual(aFlow.actions ?? [], bFlow.actions ?? [])) {
      reasons.push('actions changed');
    }
    if (reasons.length > 0) {
      flowsChanged.push({ name, reason: reasons.join('; ') });
    }
  }

  return {
    screens: { added: screensAdded, removed: screensRemoved, common: screensCommon },
    actions: { added: actionsAdded, removed: actionsRemoved },
    flows: { added: flowsAdded, removed: flowsRemoved, changed: flowsChanged },
  };
}

function collectActionKeys(doc: UxPathsDoc): Set<string> {
  const out = new Set<string>();
  for (const screen of doc.screens) {
    for (const action of screen.actions ?? []) {
      out.add(`${screen.id}.${action.id}`);
    }
  }
  return out;
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Compare flow step arrays. v1.0 steps are strings; v1.1 steps may be objects.
 * Object steps compare on their canonical (target_screen ?? screen) id —
 * sufficient for "did the flow's path change?" diffing.
 */
function stepArraysEqual(a: FlowStep[], b: FlowStep[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (stepKey(a[i]) !== stepKey(b[i])) return false;
  }
  return true;
}

function stepKey(step: FlowStep): string {
  if (typeof step === 'string') return step;
  return step.target_screen ?? step.screen;
}
