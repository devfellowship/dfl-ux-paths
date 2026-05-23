import type { UxPathsDoc, Screen, Action } from './types.js';

/**
 * Convert a UX-paths doc into a Mermaid `graph TD` diagram.
 *
 * Rules:
 * - Each screen becomes a node `id["name"]`.
 * - Each action that has a `next_screen` becomes an edge `from -->|label| to`.
 * - Flows render as a subgraph showing the ordered sequence of screens.
 * - Dead-code entries render as a `%% dead-code:` comment block at the end.
 */
export function jsonToMermaid(doc: UxPathsDoc): string {
  const lines: string[] = [];
  lines.push('graph TD');

  // Header comment with app metadata for traceability
  lines.push(`  %% app_id: ${doc.app_id}`);
  lines.push(`  %% app_version: ${doc.app_version}`);
  lines.push(`  %% schema_version: ${doc.schema_version}`);

  // Screens
  for (const screen of doc.screens) {
    lines.push(`  ${sanitizeId(screen.id)}["${escapeLabel(screen.name)}"]`);
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
    const steps = [flow.start, ...flow.steps];
    for (let i = 0; i < steps.length - 1; i++) {
      lines.push(`    ${sanitizeId(steps[i])} -.-> ${sanitizeId(steps[i + 1])}`);
    }
    if (steps.length === 1) {
      // Lone start; just ensure it's anchored in the subgraph
      lines.push(`    ${sanitizeId(steps[0])}`);
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
