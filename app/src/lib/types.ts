// Types mirror the dfl-ux-paths JSON Schema (../../../schema/v1.json), v1.2.
//
// ADDITIVE, FORWARD-LOOKING FIELDS (schema v1.3, plan 20260615-flows-viewer-multimode-evolution,
// ADR-4): `fidelity` on Screen and top-level `requirements[]` are NOT YET part of the
// published schema/v1.json (that bump is a separate, human-gated dfl-ux-paths PR — Fase 2).
// They are typed here as optional so the app can consume them for the Requisitos→Fluxo /
// Roteiro (UC1) lenses today, without breaking on any real v1.0–v1.2 flows.json that lacks
// them. Do NOT assume `requirements[]` validates against the current published schema.

export type Platform = "web" | "mobile";
export type Orientation = "portrait" | "landscape";

export interface Screenshot {
  platform: Platform;
  orientation: Orientation;
  viewport?: string;
  url: string;
  captured_at?: string;
}

export interface SourceRef {
  component_file: string;
  file_path_chain?: string[];
}

export interface Action {
  id: string;
  label: string;
  next_screen?: string;
  side_effect?: string;
}

/** v1.3 (forward-looking, additive) — not yet in schema/v1.json. */
export type Fidelity = "real" | "fictional" | "sketch";

export interface Screen {
  id: string;
  name: string;
  route?: string;
  page_class?: string;
  source_ref?: SourceRef;
  screenshots?: Screenshot[];
  components?: string[];
  api_calls?: string[];
  actions?: Action[];
  /** v1.3 forward-looking. */
  fidelity?: Fidelity;
}

export interface FlowStepObject {
  screen: string;
  action?: string;
  selector?: string;
  value?: string;
  target_screen?: string;
  wait_for_target?: string;
  note?: string;
}

export type FlowStep = string | FlowStepObject;

export interface Flow {
  name: string;
  start: string;
  steps: FlowStep[];
  actions?: string[];
  tested_by?: string[];
}

export interface DeadCodeEntry {
  component: string;
  reason: string;
}

/** v1.3 forward-looking (ADR-4) — requirement ↔ screen coverage bridge for UC1. */
export type RequirementState = "ok" | "new" | "gap";

export interface Requirement {
  id: string;
  text: string;
  covers: string[];
  state?: RequirementState;
}

export interface FlowsJson {
  schema_version: string;
  app_id: string;
  app_version: string;
  generated_at?: string;
  tech_stack?: string[];
  screens: Screen[];
  flows: Flow[];
  dead_code?: DeadCodeEntry[];
  /** v1.3 forward-looking, additive — see module doc comment. */
  requirements?: Requirement[];
}

export function stepScreenId(step: FlowStep): string {
  return typeof step === "string" ? step : step.screen;
}
