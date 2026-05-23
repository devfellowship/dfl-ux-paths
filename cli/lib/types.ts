export interface Action {
  id: string;
  label: string;
  next_screen?: string;
  side_effect?: string;
}

export interface Screen {
  id: string;
  name: string;
  route?: string;
  components?: string[];
  api_calls?: string[];
  actions?: Action[];
}

export interface Flow {
  name: string;
  start: string;
  steps: string[];
  actions?: string[];
  tested_by?: string[];
}

export interface DeadCodeEntry {
  component: string;
  reason: string;
}

export interface UxPathsDoc {
  schema_version: '1.0.0';
  app_id: string;
  app_version: string;
  generated_at?: string;
  tech_stack?: string[];
  screens: Screen[];
  flows: Flow[];
  dead_code?: DeadCodeEntry[];
}
