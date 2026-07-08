import dagre from "@dagrejs/dagre";
import type { FlowsJson } from "./types";
import type { Node, Edge } from "@xyflow/react";

// Node card size used both for the actual rendered <ScreenNode/> (see
// ExplorarAtlas.tsx) and as the box size dagre lays out around — must stay in
// sync with the CSS w-[…]/h-[…] on that component or spacing will look off.
export const NODE_WIDTH = 220;
export const NODE_HEIGHT = 176;

const DIRECTION: "LR" | "TB" = "LR";

/**
 * Directional auto-layout (Atlas lens, ADR-2/UC3), P1 redesign 2026-07-08:
 * ranks screens left-to-right by BFS depth from entry/login screens outward,
 * using `@dagrejs/dagre` (the same library + integration pattern already
 * proven in devfellowship/dfl-diagrams:src/lib/autoLayout.ts — reused the
 * technique, not the file, since that app's node types/sizing don't apply
 * here). Previously this was a naive column-stack (BFS level → column,
 * insertion order → row) with fixed 260×120 slots; with variable numbers of
 * screens per level that produced overlapping/stacked boxes with no
 * legible "forward progression" read. Dagre computes true rank/order
 * simultaneously, so it also minimizes edge crossings between levels.
 *
 * LR chosen over TB after visual comparison: the flows.json screen graphs in
 * dfl's fixtures/real repos read as "shallow onboarding → deeper editor
 * screens", which scans naturally left-to-right (same intuition as a subway
 * map / user journey diagram). TB is available by flipping DIRECTION above
 * if a given app's graph reads better top-down.
 */
export function buildAtlasGraph(data: FlowsJson): { nodes: Node[]; edges: Edge[]; direction: "LR" | "TB" } {
  const screens = data.screens || [];
  const byId = new Map(screens.map((s) => [s.id, s]));
  const edgesRaw: { source: string; target: string; label: string; key: string }[] = [];

  for (const s of screens) {
    for (const a of s.actions || []) {
      if (a.next_screen && byId.has(a.next_screen) && a.next_screen !== s.id) {
        edgesRaw.push({ source: s.id, target: a.next_screen, label: a.label || a.id, key: `${s.id}->${a.next_screen}:${a.id}` });
      }
    }
  }

  // NOTE: an earlier version of this function also injected a synthetic
  // "super-source" edge from every flow `start` screen to nudge entries to
  // the front column. That backfired: it pushed genuine flow-start nodes one
  // rank to the RIGHT of truly disconnected/orphan screens (which have zero
  // edges and so stay at dagre's default rank 0), making an orphan screen
  // render as if it came *before* the real entry point. Plain dagre ranking
  // from the real action-edges already gives every no-incoming-edge screen
  // (which includes every genuine entry/login screen) rank 0 — that's the
  // correct, simpler behavior, so the synthetic-edge trick was removed.
  const seen = new Set<string>();
  const dedupedEdges = edgesRaw.filter((e) => (seen.has(e.key) ? false : (seen.add(e.key), true)));

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: DIRECTION, nodesep: 48, ranksep: 120, marginx: 24, marginy: 24 });

  for (const s of screens) {
    g.setNode(s.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const e of dedupedEdges) g.setEdge(e.source, e.target);

  dagre.layout(g);

  const nodes: Node[] = screens.map((s) => {
    const dn = g.node(s.id);
    const x = dn ? dn.x - NODE_WIDTH / 2 : 0;
    const y = dn ? dn.y - NODE_HEIGHT / 2 : 0;
    return {
      id: s.id,
      position: { x, y },
      data: { label: s.name || s.id, screen: s },
      type: "screenNode",
      // Explicit width/height (not just relied-upon post-mount measurement):
      // React Flow's <MiniMap/> only draws a node's rect once it considers
      // the node to "have dimensions" (`measured` OR explicit width/height —
      // see @xyflow/system nodeHasDimensions). Without this, the minimap
      // silently rendered zero node rects (just an empty dark/white panel —
      // likely the actual cause behind the reported "white sliver" minimap).
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    };
  });

  // Group edges by their unordered node-pair (A|B) so the node component can
  // spread out reciprocal edges' label chips (e.g. Editor→Preview AND
  // Preview→Editor both exist) — otherwise both chips render on top of each
  // other at the same path midpoint. See ChipEdge in ExplorarAtlas.tsx.
  const pairCounts = new Map<string, number>();
  for (const e of dedupedEdges) {
    const pairKey = [e.source, e.target].sort().join("|");
    pairCounts.set(pairKey, (pairCounts.get(pairKey) ?? 0) + 1);
  }
  const pairSeen = new Map<string, number>();
  const edges: Edge[] = dedupedEdges.map((e) => {
    const pairKey = [e.source, e.target].sort().join("|");
    const pairIndex = pairSeen.get(pairKey) ?? 0;
    pairSeen.set(pairKey, pairIndex + 1);
    return {
      id: e.key,
      source: e.source,
      target: e.target,
      label: e.label,
      type: "chipEdge",
      data: { pairIndex, pairCount: pairCounts.get(pairKey) ?? 1 },
    };
  });

  return { nodes, edges, direction: DIRECTION };
}
