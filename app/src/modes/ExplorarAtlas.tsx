import { useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type NodeProps,
  type EdgeProps,
} from "@xyflow/react";
import { Button } from "@devfellowship/components";
import type { FlowsJson, Screen } from "../lib/types";
import { buildAtlasGraph } from "../lib/layout";
import { MetaRow } from "../components/MetaRow";
import { ScreenCard } from "../components/ScreenCard";

function pickThumbnail(screen: Screen): string | undefined {
  const shots = screen.screenshots;
  if (!shots?.length) return undefined;
  return (shots.find((s) => s.platform === "web") || shots[0]).url;
}

function ScreenNode({ data }: NodeProps) {
  const screen = data.screen as Screen;
  const label = (data.label as string) || screen.id;
  const routeLabel = screen.route || screen.id;
  const thumb = pickThumbnail(screen);

  return (
    <div
      className="w-[220px] overflow-hidden rounded-lg border border-s-brand-ring bg-card shadow-lg shadow-black/40"
      data-testid="atlas-node"
      data-screen-id={screen.id}
    >
      {/* Custom node types render no implicit connection points — Handles are
          required or React Flow silently drops edges attached to this node. */}
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-none !bg-primary" />

      <div
        className="flex h-[104px] w-full items-center justify-center overflow-hidden border-b border-border bg-muted"
        data-testid="atlas-node-thumb-wrap"
      >
        {thumb ? (
          <img
            src={thumb}
            alt={label}
            loading="lazy"
            // object-contain (not cover): fixture/real screenshots are often
            // portrait mobile captures (e.g. 375x812) crammed into this
            // landscape card slot — `cover` crops most of the frame away and,
            // worse, some fixture placeholders (placehold.co) bake their
            // caption text INTO the image, so a `cover` crop can zoom into
            // just a fragment of that text and render as giant, confusing
            // letters. `contain` always shows the whole screenshot.
            className="h-full w-full object-contain"
            data-testid="atlas-node-thumb"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
              const fallback = (e.currentTarget.parentElement?.querySelector("[data-thumb-fallback]") as HTMLElement) || null;
              if (fallback) fallback.style.display = "flex";
            }}
          />
        ) : null}
        <div
          data-thumb-fallback
          data-testid="atlas-node-thumb-placeholder"
          className="flex h-full w-full items-center justify-center text-[10px] italic text-muted-foreground"
          style={{ display: thumb ? "none" : "flex" }}
        >
          no preview
        </div>
      </div>

      <div className="px-3 py-2 text-xs">
        <div className="truncate font-semibold text-foreground" title={label}>
          {label}
        </div>
        <div className="truncate font-mono text-muted-foreground" title={routeLabel}>
          {routeLabel}
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-none !bg-primary" />
    </div>
  );
}

const nodeTypes = { screenNode: ScreenNode };

/**
 * Chip-styled edge label (fix: previously a bare, unbackgrounded label
 * floating on the path — it collided visually with edges/nodes) +
 * smoothstep routing (reads cleaner than straight lines when several edges
 * fan out of one screen).
 *
 * Also de-collides RECIPROCAL edge pairs (e.g. both `A→B` and `B→A` exist,
 * common for "back" actions like publish/preview toggles): `layout.ts`
 * tags each edge with `data.pairIndex`/`data.pairCount` for edges sharing the
 * same node pair, and this component nudges the label chip's on-screen
 * position (not the path itself — the path stays true to source/target) by a
 * small perpendicular offset per index so overlapping chips separate into a
 * legible stack instead of overprinting each other.
 */
function ChipEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, label, data }: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  const pairIndex = (data?.pairIndex as number | undefined) ?? 0;
  const pairCount = (data?.pairCount as number | undefined) ?? 1;
  const offsetY = pairCount > 1 ? (pairIndex - (pairCount - 1) / 2) * 22 : 0;

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ stroke: "var(--s-brand-ring)", strokeWidth: 1.5 }} />
      {label ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none absolute rounded-md border border-s-brand-ring bg-popover px-1.5 py-0.5 text-[10px] font-semibold text-foreground"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY + offsetY}px)` }}
            data-testid="atlas-edge-label"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

const edgeTypes = { chipEdge: ChipEdge };

/** Explorar mode — Atlas lens (UC3 default, ADR-2): spatial React Flow canvas. */
export function ExplorarAtlas({ data }: { data: FlowsJson }) {
  const { nodes, edges } = useMemo(() => buildAtlasGraph(data), [data]);
  const [showGallery, setShowGallery] = useState(false);

  return (
    <div className="space-y-4">
      <MetaRow data={data} />
      <div className="h-[70vh] min-h-[520px] w-full overflow-hidden rounded-lg border border-border bg-card" data-testid="atlas-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          colorMode="dark"
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable nodeColor="#E07A4A" maskColor="rgba(10,9,8,0.72)" bgColor="#141210" />
        </ReactFlow>
      </div>
      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-testid="screens-gallery-toggle"
          onClick={() => setShowGallery((v) => !v)}
          className="mb-2 gap-2 text-primary"
          aria-expanded={showGallery}
        >
          <span>{showGallery ? "▾" : "▸"}</span>
          Screens ({data.screens.length})
          <span className="text-xs font-normal text-muted-foreground">— now shown in-node above; expand for full detail</span>
        </Button>
        {showGallery && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="screen-list">
            {data.screens.map((s) => (
              <ScreenCard key={s.id} screen={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
