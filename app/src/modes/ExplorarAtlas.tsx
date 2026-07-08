import { useMemo } from "react";
import { ReactFlow, Background, Controls, MiniMap, Handle, Position, type NodeProps } from "@xyflow/react";
import type { FlowsJson, Screen } from "../lib/types";
import { buildAtlasGraph } from "../lib/layout";
import { MetaRow } from "../components/MetaRow";
import { ScreenCard } from "../components/ScreenCard";

function ScreenNode({ data }: NodeProps) {
  const screen = data.screen as Screen;
  return (
    <div
      className="rounded-md border border-[#e8b23b]/50 bg-[#221f1b] px-3 py-2 text-xs min-w-[160px]"
      data-testid="atlas-node"
      data-screen-id={screen.id}
    >
      {/* Custom node types render no implicit connection points — Handles are
          required or React Flow silently drops edges attached to this node. */}
      <Handle type="target" position={Position.Left} />
      <div className="font-semibold">{(data.label as string) || screen.id}</div>
      <div className="text-white/40">{screen.route || screen.id}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes = { screenNode: ScreenNode };

/** Explorar mode — Atlas lens (UC3 default, ADR-2): spatial React Flow canvas. */
export function ExplorarAtlas({ data }: { data: FlowsJson }) {
  const { nodes, edges } = useMemo(() => buildAtlasGraph(data), [data]);

  return (
    <div className="space-y-4">
      <MetaRow data={data} />
      <div
        className="h-[420px] rounded-lg border border-white/10 bg-black/20"
        data-testid="atlas-canvas"
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-2 text-[#e8b23b]">Screens ({data.screens.length})</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="screen-list">
          {data.screens.map((s) => (
            <ScreenCard key={s.id} screen={s} />
          ))}
        </div>
      </div>
    </div>
  );
}
