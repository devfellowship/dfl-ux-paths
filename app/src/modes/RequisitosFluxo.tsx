import type { FlowsJson, RequirementState } from "../lib/types";
import { MetaRow } from "../components/MetaRow";
import { ScreenshotGallery } from "../components/ScreenshotGallery";

const STATE_LABEL: Record<RequirementState, string> = { ok: "ok", new: "new", gap: "gap" };
const STATE_CLASS: Record<RequirementState, string> = {
  ok: "text-emerald-400 border-emerald-400/40",
  new: "text-sky-300 border-sky-300/40",
  gap: "text-red-400 border-red-400/40",
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
          className="text-sm text-white/50 border border-dashed border-white/15 rounded p-6 text-center"
          data-testid="requirements-empty"
        >
          No <code>requirements[]</code> in this flows.json — Requisitos→Fluxo needs a v1.3-style
          fixture (schema bump pending, ADR-4). Nothing to show yet for UC1 on this source.
        </div>
      </div>
    );
  }

  const gapCount = requirements.filter((r) => computeState(r, screensById) === "gap").length;

  return (
    <div className="space-y-4" data-testid="requirements-view">
      <MetaRow data={data} />
      <div className="flex gap-3 text-xs">
        <span className="dfl-chip" data-testid="requirements-count">
          {requirements.length} requirements
        </span>
        <span className="dfl-chip" data-testid="gap-count">
          {gapCount} gaps
        </span>
        <span className="dfl-chip" data-testid="fictional-count">
          {fictionalScreens.length} fictional/sketch screens
        </span>
      </div>

      <table className="w-full text-xs border-collapse" data-testid="coverage-matrix">
        <thead>
          <tr className="text-left text-white/50 border-b border-white/10">
            <th className="py-1 pr-2">requirement</th>
            <th className="py-1 pr-2">covers</th>
            <th className="py-1 pr-2">state</th>
          </tr>
        </thead>
        <tbody>
          {requirements.map((r) => {
            const state = computeState(r, screensById);
            return (
              <tr key={r.id} className="border-b border-white/5" data-testid="requirement-row" data-requirement-id={r.id} data-state={state}>
                <td className="py-2 pr-2 align-top">{r.text}</td>
                <td className="py-2 pr-2 align-top">
                  <div className="flex flex-wrap gap-1">
                    {r.covers.map((sid) => (
                      <span key={sid} className={`dfl-chip ${screensById.has(sid) ? "" : "opacity-40 line-through"}`}>
                        {sid}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-2 align-top">
                  <span className={`dfl-chip ${STATE_CLASS[state]}`}>{STATE_LABEL[state]}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {fictionalScreens.length ? (
        <div>
          <h3 className="text-sm font-semibold mb-2 text-[#e8b23b]">Fictional / sketch screens</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {fictionalScreens.map((s) => (
              <div key={s.id} className="rounded-lg border border-white/10 bg-black/20 p-3 space-y-2" data-testid="fictional-screen-card">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{s.name}</span>
                  <span className="dfl-chip">{s.fidelity}</span>
                </div>
                <ScreenshotGallery screenshots={s.screenshots} />
              </div>
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
