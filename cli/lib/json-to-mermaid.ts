import type { UxPathsDoc, Screen, Action, FlowStep } from './types.js';

/**
 * Convert a UX-paths doc into a Mermaid `graph TD` diagram.
 *
 * Rules:
 * - Each screen becomes a node `id["name"]`.
 * - v1.1 — screens with `prerequisites.auth_required = true` are prefixed with 🔒.
 * - Each action that has a `next_screen` becomes an edge `from -->|label| to`.
 * - Flows render as a subgraph showing the ordered sequence of screens.
 *   v1.1 flow-step objects render with `action: selector` arrow labels.
 * - v1.1 — screens with `navigation_path` get a `%% nav[<id>]:` comment summary.
 * - Dead-code entries render as a `%% dead-code:` comment block at the end.
 */
export function jsonToMermaid(doc: UxPathsDoc): string {
  const lines: string[] = [];
  lines.push('graph TD');

  // Header comment with app metadata for traceability
  lines.push(`  %% app_id: ${doc.app_id}`);
  lines.push(`  %% app_version: ${doc.app_version}`);
  lines.push(`  %% schema_version: ${doc.schema_version}`);
  if (doc.test_metadata?.base_url) {
    lines.push(`  %% base_url: ${doc.test_metadata.base_url}`);
  }

  // Screens
  for (const screen of doc.screens) {
    const lockPrefix = screen.prerequisites?.auth_required ? '🔒 ' : '';
    lines.push(
      `  ${sanitizeId(screen.id)}["${escapeLabel(lockPrefix + screen.name)}"]`,
    );
  }

  // navigation_path summary comments (v1.1)
  for (const screen of doc.screens) {
    if (screen.navigation_path && screen.navigation_path.length > 0) {
      const summary = screen.navigation_path
        .map((s) => `${s.action} ${s.selector}`)
        .join(' -> ');
      lines.push(`  %% nav[${sanitizeId(screen.id)}]: ${summary}`);
    }
  }

  // Action edges
  for (const screen of doc.screens) {
    for (const action of screen.actions ?? []) {
      if (action.next_screen) {
        lines.push(
          `  ${sanitizeId(screen.id)} -->|${escapeLabel(action.label)}| ${sanitizeId(
            action.next_screen,
          )}`,
        );
      }
    }
  }

  // Flow subgraphs
  for (const flow of doc.flows) {
    const flowKey = sanitizeId(`flow_${flow.name}`);
    lines.push(`  subgraph ${flowKey}["Flow: ${escapeLabel(flow.name)}"]`);
    const nodes = flowStepsToNodes(flow.start, flow.steps);
    for (let i = 0; i < nodes.length - 1; i++) {
      const from = nodes[i];
      const to = nodes[i + 1];
      if (to.label) {
        lines.push(
          `    ${sanitizeId(from.id)} -.->|${escapeLabel(to.label)}| ${sanitizeId(to.id)}`,
        );
      } else {
        lines.push(`    ${sanitizeId(from.id)} -.-> ${sanitizeId(to.id)}`);
      }
    }
    if (nodes.length === 1) {
      // Lone start; just ensure it's anchored in the subgraph
      lines.push(`    ${sanitizeId(nodes[0].id)}`);
    }
    lines.push('  end');
  }

  // Dead code as comments
  if (doc.dead_code && doc.dead_code.length > 0) {
    lines.push('  %% --- dead code ---');
    for (const entry of doc.dead_code) {
      lines.push(`  %% dead: ${entry.component} — ${entry.reason}`);
    }
  }

  return lines.join('\n') + '\n';
}

/**
 * Resolve a flow's steps (string | object | mixed) into ordered (screenId, label?)
 * nodes. v1.0 steps are plain screen ids; v1.1 step objects yield
 * `action: selector` arrow labels where present.
 */
function flowStepsToNodes(
  start: string,
  steps: FlowStep[],
): Array<{ id: string; label?: string }> {
  const out: Array<{ id: string; label?: string }> = [{ id: start }];
  for (const step of steps) {
    if (typeof step === 'string') {
      out.push({ id: step });
    } else {
      const id = step.target_screen ?? step.screen;
      const labelParts: string[] = [];
      if (step.action) labelParts.push(step.action);
      if (step.selector) labelParts.push(step.selector);
      const label = labelParts.length > 0 ? labelParts.join(': ') : undefined;
      out.push({ id, label });
    }
  }
  return out;
}

function sanitizeId(raw: string): string {
  // Mermaid node ids must not contain spaces / special chars beyond _- A-Z a-z 0-9
  return raw.replace(/[^A-Za-z0-9_]/g, '_');
}

function escapeLabel(raw: string): string {
  // Escape quotes inside labels
  return raw.replace(/"/g, '\\"');
}

// Re-export for tests
export const _internal = { sanitizeId, escapeLabel };
export type { Screen, Action };
