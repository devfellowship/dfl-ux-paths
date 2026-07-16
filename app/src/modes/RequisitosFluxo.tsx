import {
  Card,
  CardContent,
  Badge,
  type BadgeProps,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@devfellowship/components";
import type { FlowsJson, RequirementState } from "../lib/types";
import { MetaRow } from "../components/MetaRow";
import { ScreenshotGallery } from "../components/ScreenshotGallery";

const STATE_LABEL: Record<RequirementState, string> = { ok: "ok", new: "new", gap: "gap" };
const STATE_VARIANT: Record<RequirementState, BadgeProps["variant"]> = {
  ok: "success",
  new: "info",
  gap: "danger",
};

/**
 * Requisitos→Fluxo mode (UC1, ADR-4) — coverage matrix bridging requirements
 * to screens, + gap detection. This is a FIXTURE-DRIVEN VIEWER ONLY (Fase 1
 * scope): the `requirements[]` / `fidelity` fields are consumed additively
 * (see lib/types.ts doc comment) but there is no LLM/MCP generation here yet
 * — that pipeline (wireframe → render → S3) is Fase 3 (ADR-5/ADR-6). If a
 * flows.json has no `requirements[]` (any real v1.0–v1.2 file today), this
 * mode renders an empty-state instead of erroring.
 */
export function RequisitosFluxo({ data }: { data: FlowsJson }) {
  const requirements = data.requirements || [];
  const screensById = new Map(data.screens.map((s) => [s.id, s]));
  const fictionalScreens = data.screens.filter((s) => s.fidelity === "fictional" || s.fidelity === "sketch");

  if (!requirements.length) {
    return (
      <div className="space-y-4">
        <MetaRow data={data} />
        <div
          className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground"
          data-testid="requirements-empty"
        >
          No <code className="font-mono text-foreground">requirements[]</code> in this flows.json — Requisitos→Fluxo needs a
          v1.3-style fixture (schema bump pending, ADR-4). Nothing to show yet for UC1 on this source.
        </div>
      </div>
    );
  }

  const gapCount = requirements.filter((r) => computeState(r, screensById) === "gap").length;

  return (
    <div className="space-y-4" data-testid="requirements-view">
      <MetaRow data={data} />
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="secondary" data-testid="requirements-count">
          {requirements.length} requirements
        </Badge>
        <Badge variant={gapCount ? "danger" : "secondary"} data-testid="gap-count">
          {gapCount} gaps
        </Badge>
        <Badge variant="secondary" data-testid="fictional-count">
          {fictionalScreens.length} fictional/sketch screens
        </Badge>
      </div>

      <Table data-testid="coverage-matrix">
        <TableHeader>
          <TableRow>
            <TableHead>requirement</TableHead>
            <TableHead>covers</TableHead>
            <TableHead>state</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requirements.map((r) => {
            const state = computeState(r, screensById);
            return (
              <TableRow key={r.id} data-testid="requirement-row" data-requirement-id={r.id} data-state={state}>
                <TableCell className="align-top text-foreground">{r.text}</TableCell>
                <TableCell className="align-top">
                  <div className="flex flex-wrap gap-1">
                    {r.covers.map((sid) => (
                      <Badge
                        key={sid}
                        variant="outline"
                        className={`font-mono font-normal ${screensById.has(sid) ? "" : "line-through opacity-40"}`}
                      >
                        {sid}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <Badge variant={STATE_VARIANT[state]}>{STATE_LABEL[state]}</Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {fictionalScreens.length ? (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-primary">Fictional / sketch screens</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {fictionalScreens.map((s) => (
              <Card key={s.id} data-testid="fictional-screen-card">
                <CardContent className="space-y-2 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">{s.name}</span>
                    <Badge variant="outline">{s.fidelity}</Badge>
                  </div>
                  <ScreenshotGallery screenshots={s.screenshots} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function computeState(
  r: { covers: string[]; state?: RequirementState },
  screensById: Map<string, unknown>,
): RequirementState {
  if (r.state) return r.state;
  if (!r.covers.length || r.covers.some((sid) => !screensById.has(sid))) return "gap";
  return "ok";
}
