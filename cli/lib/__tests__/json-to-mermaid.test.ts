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

describe('jsonToMermaid — v1.1 enhancements', () => {
  it('renders 🔒 prefix on screens with auth_required', () => {
    const out = jsonToMermaid({
      ...baseDoc,
      schema_version: '1.1.0',
      screens: [
        { id: 'login', name: 'Login' },
        {
          id: 'dashboard',
          name: 'Dashboard',
          prerequisites: { auth_required: true },
        },
      ],
      flows: [{ name: 'after_login', start: 'login', steps: ['dashboard'] }],
    });
    expect(out).toContain('login["Login"]');
    expect(out).toContain('dashboard["🔒 Dashboard"]');
  });

  it('emits %% nav[<id>]: comment for screens with navigation_path', () => {
    const out = jsonToMermaid({
      ...baseDoc,
      schema_version: '1.1.0',
      screens: [
        {
          id: 'studio',
          name: 'Studio',
          navigation_path: [
            { selector: 'text=Studio', action: 'tap' },
            { selector: 'role=tab[name=Studio]', action: 'tap' },
          ],
        },
      ],
      flows: [{ name: 'land', start: 'studio', steps: [] }],
    });
    expect(out).toContain(
      '%% nav[studio]: tap text=Studio -> tap role=tab[name=Studio]',
    );
  });

  it('renders v1.1 flow step objects with action: selector arrow labels', () => {
    const out = jsonToMermaid({
      ...baseDoc,
      schema_version: '1.1.0',
      flows: [
        {
          name: 'rich',
          start: 'home',
          steps: [
            {
              screen: 'home',
              action: 'tap',
              selector: 'text=Next',
              target_screen: 'lessons',
            },
          ],
        },
      ],
    });
    expect(out).toContain('home -.->|tap: text=Next| lessons');
  });

  it('falls back to dotted arrow when v1.1 step has no action/selector', () => {
    const out = jsonToMermaid({
      ...baseDoc,
      schema_version: '1.1.0',
      flows: [
        {
          name: 'bare',
          start: 'home',
          steps: [{ screen: 'home', target_screen: 'lessons' }],
        },
      ],
    });
    expect(out).toContain('home -.-> lessons');
  });

  it('includes base_url metadata comment when test_metadata.base_url present', () => {
    const out = jsonToMermaid({
      ...baseDoc,
      schema_version: '1.1.0',
      test_metadata: { base_url: 'https://mobile.devfellowship.com/' },
    });
    expect(out).toContain('%% base_url: https://mobile.devfellowship.com/');
  });
});
