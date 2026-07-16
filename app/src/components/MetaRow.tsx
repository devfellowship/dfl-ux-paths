import type { FlowsJson } from "../lib/types";

export function MetaRow({ data }: { data: FlowsJson }) {
  return (
    <div className="flex flex-wrap gap-4 border-b border-border pb-2 mb-3 text-xs text-muted-foreground">
      <span className="font-mono font-semibold text-primary">{data.app_id}</span>
      <span>
        build <b className="font-mono text-foreground">{data.app_version}</b>
      </span>
      <span>
        schema <b className="font-mono text-foreground">{data.schema_version}</b>
      </span>
      <span>
        stack <b className="font-mono text-foreground">{(data.tech_stack || []).join(", ") || "—"}</b>
      </span>
      <span>
        {data.screens.length} screens · {data.flows.length} flows
      </span>
    </div>
  );
}
