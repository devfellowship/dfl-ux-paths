import type { SourceRef } from "../lib/types";

export function SourceRefView({ sourceRef }: { sourceRef?: SourceRef }) {
  if (!sourceRef) {
    return <div className="text-xs italic text-muted-foreground">source_ref: none</div>;
  }
  return (
    <div className="text-xs" data-testid="source-ref">
      <div className="font-mono text-primary">▸ {sourceRef.component_file}</div>
      {sourceRef.file_path_chain?.length ? (
        <div className="mt-1 flex flex-wrap gap-1 font-mono text-muted-foreground">
          {sourceRef.file_path_chain.map((p) => (
            <span key={p}>{p}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
