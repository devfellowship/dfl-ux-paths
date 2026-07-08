import type { FlowsJson } from "../lib/types";

export function MetaRow({ data }: { data: FlowsJson }) {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-[#e8b23b] border-b border-white/10 pb-2 mb-3">
      <span>
        <b>{data.app_id}</b>
      </span>
      <span>
        build <b>{data.app_version}</b>
      </span>
      <span>
        schema <b>{data.schema_version}</b>
      </span>
      <span>
        stack <b>{(data.tech_stack || []).join(", ") || "—"}</b>
      </span>
      <span>
        {data.screens.length} screens · {data.flows.length} flows
      </span>
    </div>
  );
}
