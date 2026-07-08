import type { FlowsJson } from "./types";
import { stepScreenId } from "./types";
import type { Node, Edge } from "@xyflow/react";

const COL_WIDTH = 260;
const ROW_HEIGHT = 120;

/**
 * Simple BFS-level auto-layout (Atlas lens, ADR-2/UC3): screens with no
 * incoming `next_screen` edge (or referenced as a flow `start`) sit in
 * column 0; everything else is placed one column past its shallowest
 * predecessor. No external layout dep (dagre etc.) needed for a Fase 1
 * skeleton — good enough for spatial "ghost-diff" browsing via React Flow's
 * own pan/zoom/minimap.
 */
export function buildAtlasGraph(data: FlowsJson): { nodes: Node[]; edges: Edge[] } {
  const screens = data.screens || [];
  const byId = new Map(screens.map((s) => [s.id, s]));
  const incoming = new Set<string>();
  const edgesRaw: { source: string; target: string; label: string; key: string }[] = [];

  for (const s of screens) {
    for (const a of s.actions || []) {
      if (a.next_screen && byId.has(a.next_screen) && a.next_screen !== s.id) {
        incoming.add(a.next_screen);
        edgesRaw.push({ source: s.id, target: a.next_screen, label: a.label || a.id, key: `${s.id}->${a.next_screen}:${a.id}` });
      }
    }
  }

  const starts = new Set<string>();
  for (const f of data.flows || []) {
    if (f.start && byId.has(f.start)) starts.add(f.start);
    for (const step of f.steps || []) {
      const id = stepScreenId(step);
      if (byId.has(id)) starts.add(id);
      break; // only the first step of each flow counts as a "start" hint
    }
  }

  const level = new Map<string, number>();
  const roots = screens.filter((s) => !incoming.has(s.id) || starts.has(s.id));
  const queue: string[] = (roots.length ? roots : screens).map((s) => s.id);
  for (const id of queue) level.set(id, 0);

  // BFS to assign levels; cap iterations to guard against cycles.
  let guard = 0;
  const adjacency = new Map<string, string[]>();
  for (const e of edgesRaw) {
    if (!adjacency.has(e.source)) adjacency.set(e.source, []);
    adjacency.get(e.source)!.push(e.target);
  }
  while (queue.length && guard < screens.length * 4) {
    guard++;
    const id = queue.shift()!;
    const lvl = level.get(id) ?? 0;
    for (const next of adjacency.get(id) || []) {
      const nextLvl = lvl + 1;
      if (!level.has(next) || level.get(next)! < nextLvl) {
        level.set(next, nextLvl);
        queue.push(next);
      }
    }
  }
  // Anything unreached (disconnected screen) gets level 0.
  for (const s of screens) if (!level.has(s.id)) level.set(s.id, 0);

  const perLevelCount = new Map<number, number>();
  const nodes: Node[] = screens.map((s) => {
    const lvl = level.get(s.id) ?? 0;
    const row = perLevelCount.get(lvl) ?? 0;
    perLevelCount.set(lvl, row + 1);
    return {
      id: s.id,
      position: { x: lvl * COL_WIDTH, y: row * ROW_HEIGHT },
      data: { label: s.name || s.id, screen: s },
      type: "screenNode",
    };
  });

  const seen = new Set<string>();
  const edges: Edge[] = edgesRaw
    .filter((e) => (seen.has(e.key) ? false : (seen.add(e.key), true)))
    .map((e) => ({
      id: e.key,
      source: e.source,
      target: e.target,
      label: e.label,
      animated: false,
    }));

  return { nodes, edges };
}
