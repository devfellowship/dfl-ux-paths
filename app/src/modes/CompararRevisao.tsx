import type { FlowsJson } from "../lib/types";
import { pairByScreenId, type DiffStatus } from "../lib/compare";
import { ActionChips } from "../components/ActionChips";
import { ScreenshotGallery } from "../components/ScreenshotGallery";
import { SourceRefView } from "../components/SourceRefView";

const STATUS_LABEL: Record<DiffStatus, string> = {
  paired: "paired",
  changed: "changed",
  added: "added",
  removed: "removed",
};

const STATUS_CLASS: Record<DiffStatus, string> = {
  paired: "text-emerald-400 border-emerald-400/40",
  changed: "text-yellow-300 border-yellow-300/40",
  added: "text-sky-300 border-sky-300/40",
  removed: "text-red-400 border-red-400/40",
};

/** Comparar mode — Revisão lens (UC2 default, ADR-2/ADR-9). */
export function CompararRevisao({ a, b }: { a: FlowsJson; b: FlowsJson }) {
  const result = pairByScreenId(a, b);

  return (
    <div className="space-y-4" data-testid="compare-view">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" data-testid="compare-summary">
        <Stat label="screen ids" value={result.pairs.length} testId="stat-total" />
        <Stat label={`paired`} value={result.counts.paired} testId="stat-paired" />
        <Stat label="changed (TODO vision-diff)" value={result.counts.changed} testId="stat-changed" />
        <Stat label="added" value={result.counts.added} testId="stat-added" />
        <Stat label="removed" value={result.counts.removed} testId="stat-removed" />
      </div>

      <div className="space-y-3" data-testid="compare-pairs">
        {result.pairs.map((p) => (
          <div
            key={p.id}
            className="rounded-lg border border-white/10 bg-black/20 p-3"
            data-testid="compare-pair"
            data-screen-id={p.id}
            data-status={p.status}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm">
                <span className="font-mono text-[#e8b23b]">{p.id}</span>{" "}
                <span className="text-white/40">{p.a?.route || p.b?.route || ""}</span>
              </div>
              <span className={`dfl-chip ${STATUS_CLASS[p.status]}`} data-testid="pair-status">
                {STATUS_LABEL[p.status]}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Side label={a.app_id} screen={p.a} />
              <Side label={b.app_id} screen={p.b} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, testId }: { label: string; value: number; testId: string }) {
  return (
    <div className="rounded border border-white/10 bg-black/20 p-2 text-center" data-testid={testId}>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[10px] text-white/50">{label}</div>
    </div>
  );
}

function Side({ label, screen }: { label: string; screen: FlowsJson["screens"][number] | null }) {
  if (!screen) {
    return (
      <div className="rounded border border-dashed border-white/15 p-2 text-xs text-white/40" data-testid="pair-side-empty">
        absent on {label}
      </div>
    );
  }
  return (
    <div className="space-y-1" data-testid="pair-side">
      <div className="text-[10px] uppercase tracking-wide text-white/40">{label}</div>
      <SourceRefView sourceRef={screen.source_ref} />
      <ActionChips actions={screen.actions} />
      <ScreenshotGallery screenshots={screen.screenshots} />
    </div>
  );
}
