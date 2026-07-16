import { Card, CardContent, Badge, type BadgeProps } from "@devfellowship/components";
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

// Map the diff status onto DS semantic Badge variants (sand-palette aware)
// instead of ad-hoc emerald/sky/yellow/red Tailwind colors.
const STATUS_VARIANT: Record<DiffStatus, BadgeProps["variant"]> = {
  paired: "success",
  changed: "warning",
  added: "info",
  removed: "danger",
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
          <Card key={p.id} data-testid="compare-pair" data-screen-id={p.id} data-status={p.status}>
            <CardContent className="p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-sm">
                  <span className="font-mono text-primary">{p.id}</span>{" "}
                  <span className="font-mono text-muted-foreground">{p.a?.route || p.b?.route || ""}</span>
                </div>
                <Badge variant={STATUS_VARIANT[p.status]} data-testid="pair-status">
                  {STATUS_LABEL[p.status]}
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Side label={a.app_id} screen={p.a} />
                <Side label={b.app_id} screen={p.b} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, testId }: { label: string; value: number; testId: string }) {
  return (
    <Card data-testid={testId}>
      <CardContent className="p-2 text-center">
        <div className="text-xl font-bold text-foreground">{value}</div>
        <div className="text-[10px] text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function Side({ label, screen }: { label: string; screen: FlowsJson["screens"][number] | null }) {
  if (!screen) {
    return (
      <div
        className="rounded-md border border-dashed border-border p-2 text-xs text-muted-foreground"
        data-testid="pair-side-empty"
      >
        absent on {label}
      </div>
    );
  }
  return (
    <div className="space-y-1" data-testid="pair-side">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <SourceRefView sourceRef={screen.source_ref} />
      <ActionChips actions={screen.actions} />
      <ScreenshotGallery screenshots={screen.screenshots} />
    </div>
  );
}
