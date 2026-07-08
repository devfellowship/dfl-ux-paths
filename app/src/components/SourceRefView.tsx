import type { SourceRef } from "../lib/types";

export function SourceRefView({ sourceRef }: { sourceRef?: SourceRef }) {
  if (!sourceRef) {
    return <div className="text-xs text-white/40 italic">source_ref: none</div>;
  }
  return (
    <div className="text-xs" data-testid="source-ref">
      <div className="text-[#e8b23b]">▸ {sourceRef.component_file}</div>
      {sourceRef.file_path_chain?.length ? (
        <div className="flex flex-wrap gap-1 mt-1 text-white/40">
          {sourceRef.file_path_chain.map((p) => (
            <span key={p}>{p}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
