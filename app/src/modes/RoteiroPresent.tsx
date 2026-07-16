import { useMemo, useState } from "react";
import { Card, CardContent, Badge, Button } from "@devfellowship/components";
import type { FlowsJson } from "../lib/types";
import { ScreenshotGallery } from "../components/ScreenshotGallery";

/**
 * Roteiro mode — present-mode / storyboard lens (UC1 client-facing, ADR-2).
 * Steps through screens narratively for a low-context client walkthrough.
 * Export to image/PDF (ADR-7/Q6) is Fase 4 — the `onExport` prop is a stub
 * TODO hook so the button exists but is honestly disabled until the export
 * engine (shared UI↔MCP, ADR-7) lands.
 */
export function RoteiroPresent({ data }: { data: FlowsJson }) {
  const order = useMemo(() => {
    const firstFlow = data.flows?.[0];
    if (firstFlow?.steps?.length) {
      const ids = firstFlow.steps.map((s) => (typeof s === "string" ? s : s.screen));
      const known = new Set(data.screens.map((s) => s.id));
      const seq = ids.filter((id) => known.has(id));
      const rest = data.screens.map((s) => s.id).filter((id) => !seq.includes(id));
      return [...seq, ...rest];
    }
    return data.screens.map((s) => s.id);
  }, [data]);

  const [idx, setIdx] = useState(0);
  const screensById = new Map(data.screens.map((s) => [s.id, s]));
  const currentId = order[idx];
  const current = currentId ? screensById.get(currentId) : undefined;

  return (
    <div className="space-y-4" data-testid="roteiro-view">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span data-testid="roteiro-step-indicator">
          step {order.length ? idx + 1 : 0} / {order.length}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled
          title="Export image/PDF lands in Fase 4 (ADR-7) — shared engine, UI + MCP export_flow()"
          data-testid="roteiro-export-stub"
        >
          Export (image/PDF) — coming Fase 4
        </Button>
      </div>

      {current ? (
        <Card data-testid="roteiro-slide" data-screen-id={current.id} className="border-s-brand-ring">
          <CardContent className="space-y-3 p-6">
            <h2 className="text-lg font-semibold text-foreground">{current.name}</h2>
            {current.fidelity ? <Badge variant="outline">{current.fidelity}</Badge> : null}
            <ScreenshotGallery screenshots={current.screenshots} />
          </CardContent>
        </Card>
      ) : (
        <div className="text-sm italic text-muted-foreground" data-testid="roteiro-empty">
          No screens to narrate.
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
          data-testid="roteiro-prev"
        >
          ← prev
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIdx((i) => Math.min(order.length - 1, i + 1))}
          disabled={idx >= order.length - 1}
          data-testid="roteiro-next"
        >
          next →
        </Button>
      </div>
    </div>
  );
}
