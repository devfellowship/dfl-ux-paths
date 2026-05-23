import { describe, it, expect } from 'vitest';
import { jsonToMermaid } from '../json-to-mermaid.js';
import type { UxPathsDoc } from '../types.js';

const baseDoc: UxPathsDoc = {
  schema_version: '1.0.0',
  app_id: 'demo',
  app_version: '2026-05-23-abcdef0',
  screens: [
    {
      id: 'home',
      name: 'Home',
      actions: [{ id: 'tap_lessons', label: 'View Lessons', next_screen: 'lessons' }],
    },
    { id: 'lessons', name: 'Lessons' },
  ],
  flows: [{ name: 'browse_lessons', start: 'home', steps: ['lessons'] }],
};

describe('jsonToMermaid', () => {
  it('emits a graph TD header', () => {
    const out = jsonToMermaid(baseDoc);
    expect(out.split('\n')[0]).toBe('graph TD');
  });

  it('includes app metadata comments for traceability', () => {
    const out = jsonToMermaid(baseDoc);
    expect(out).toContain('%% app_id: demo');
    expect(out).toContain('%% app_version: 2026-05-23-abcdef0');
    expect(out).toContain('%% schema_version: 1.0.0');
  });

  it('renders each screen as a node with its name as label', () => {
    const out = jsonToMermaid(baseDoc);
    expect(out).toContain('home["Home"]');
    expect(out).toContain('lessons["Lessons"]');
  });

  it('renders action edges with labels between screens', () => {
    const out = jsonToMermaid(baseDoc);
    expect(out).toContain('home -->|View Lessons| lessons');
  });

  it('wraps flows in a subgraph', () => {
    const out = jsonToMermaid(baseDoc);
    expect(out).toContain('subgraph flow_browse_lessons["Flow: browse_lessons"]');
    expect(out).toContain('home -.-> lessons');
    expect(out).toContain('end');
  });

  it('renders dead_code entries as comments', () => {
    const out = jsonToMermaid({
      ...baseDoc,
      dead_code: [{ component: 'OldButton', reason: 'replaced by NewButton' }],
    });
    expect(out).toContain('%% --- dead code ---');
    expect(out).toContain('%% dead: OldButton — replaced by NewButton');
  });

  it('sanitizes screen ids with special chars', () => {
    const out = jsonToMermaid({
      ...baseDoc,
      screens: [
        { id: 'home.v2', name: 'Home v2' },
        { id: 'lessons-list', name: 'Lessons' },
      ],
    });
    expect(out).toContain('home_v2["Home v2"]');
    expect(out).toContain('lessons_list["Lessons"]');
  });

  it('omits action edges that have no next_screen', () => {
    const out = jsonToMermaid({
      ...baseDoc,
      screens: [
        {
          id: 'home',
          name: 'Home',
          actions: [{ id: 'ping', label: 'Ping', side_effect: 'analytics only' }],
        },
      ],
      flows: [{ name: 'noop', start: 'home', steps: [] }],
    });
    expect(out).not.toContain('-->|Ping|');
  });
});
