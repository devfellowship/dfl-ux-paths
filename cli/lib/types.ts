export interface Action {
  id: string;
  label: string;
  next_screen?: string;
  side_effect?: string;
}

/** v1.1 — interaction primitives for navigation_path / flow steps. */
export type NavigationAction =
  | 'tap'
  | 'click'
  | 'type'
  | 'scroll'
  | 'swipe'
  | 'navigate'
  | 'wait'
  | 'assert';

/** v1.1 — single step in the path to navigate TO a screen. */
export interface NavigationStep {
  selector: string;
  action: NavigationAction;
  value?: string;
  wait_for?: string;
  note?: string;
}

/** v1.1 — preconditions required for a screen to be reachable / functional. */
export interface Prerequisites {
  auth_required?: boolean;
  auth_role?: string;
  data_required?: string[];
  preconditions_in_app?: string[];
  feature_flags?: string[];
}

export interface Screen {
  id: string;
  name: string;
  route?: string;
  components?: string[];
  api_calls?: string[];
  actions?: Action[];
  /** v1.1 — ordered list of UI actions to navigate TO this screen from app entrypoint. */
  navigation_path?: NavigationStep[];
  /** v1.1 — preconditions that must hold for this screen to be reachable. */
  prerequisites?: Prerequisites;
}

/** v1.1 — rich flow step. Enables executable script generation. */
export interface FlowStepObject {
  screen: string;
  action?: string;
  selector?: string;
  value?: string;
  target_screen?: string;
  wait_for_target?: string;
  note?: string;
}

/** Flow step — v1.0 = bare screen id (string); v1.1 = step object. Mixed arrays OK. */
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

/** v1.1 — app-level metadata used by test runners / persona-script generators. */
export interface TestMetadata {
  auth_strategy?: string;
  default_viewport?: 'mobile' | 'tablet' | 'desktop' | 'responsive';
  base_url?: string;
  test_user_secret_path?: string;
  notes?: string;
}

export type SchemaVersion = '1.0.0' | '1.1.0';

export interface UxPathsDoc {
  schema_version: SchemaVersion;
  app_id: string;
  app_version: string;
  generated_at?: string;
  tech_stack?: string[];
  /** v1.1 — app-level metadata for test runners. */
  test_metadata?: TestMetadata;
  screens: Screen[];
  flows: Flow[];
  dead_code?: DeadCodeEntry[];
}
