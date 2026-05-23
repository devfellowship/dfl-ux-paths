import { describe, it, expect } from 'vitest';
import { flowsDiff } from '../flows-diff.js';
import type { UxPathsDoc } from '../types.js';

function makeDoc(partial: Partial<UxPathsDoc>): UxPathsDoc {
  return {
    schema_version: '1.0.0',
    app_id: 'demo',
    app_version: '2026-05-23-0000000',
    screens: [],
    flows: [],
    ...partial,
  };
}

describe('flowsDiff', () => {
  it('reports added screens that exist only in b', () => {
    const a = makeDoc({ screens: [{ id: 'home', name: 'Home' }] });
    const b = makeDoc({
      screens: [
        { id: 'home', name: 'Home' },
        { id: 'profile', name: 'Profile' },
      ],
    });
    const result = flowsDiff(a, b);
    expect(result.screens.added).toEqual(['profile']);
    expect(result.screens.removed).toEqual([]);
    expect(result.screens.common).toEqual(['home']);
  });

  it('reports removed screens that exist only in a', () => {
    const a = makeDoc({
      screens: [
        { id: 'home', name: 'Home' },
        { id: 'legacy', name: 'Legacy' },
      ],
    });
    const b = makeDoc({ screens: [{ id: 'home', name: 'Home' }] });
    const result = flowsDiff(a, b);
    expect(result.screens.removed).toEqual(['legacy']);
    expect(result.screens.added).toEqual([]);
  });

  it('diffs actions by screenId.actionId composite keys', () => {
    const a = makeDoc({
      screens: [
        {
          id: 'home',
          name: 'Home',
          actions: [
            { id: 'tap_lessons', label: 'Lessons' },
            { id: 'tap_settings', label: 'Settings' },
          ],
        },
      ],
    });
    const b = makeDoc({
      screens: [
        {
          id: 'home',
          name: 'Home',
          actions: [
            { id: 'tap_lessons', label: 'Lessons' },
            { id: 'tap_profile', label: 'Profile' },
          ],
        },
      ],
    });
    const result = flowsDiff(a, b);
    expect(result.actions.added).toEqual(['home.tap_profile']);
    expect(result.actions.removed).toEqual(['home.tap_settings']);
  });

  it('detects flows added/removed by name', () => {
    const a = makeDoc({
      flows: [{ name: 'onboarding', start: 'home', steps: ['signup'] }],
    });
    const b = makeDoc({
      flows: [
        { name: 'onboarding', start: 'home', steps: ['signup'] },
        { name: 'payment', start: 'cart', steps: ['checkout'] },
      ],
    });
    const result = flowsDiff(a, b);
    expect(result.flows.added).toEqual(['payment']);
    expect(result.flows.removed).toEqual([]);
  });

  it('flags a flow as changed when start screen differs', () => {
    const a = makeDoc({
      flows: [{ name: 'login', start: 'splash', steps: ['form'] }],
    });
    const b = makeDoc({
      flows: [{ name: 'login', start: 'home', steps: ['form'] }],
    });
    const result = flowsDiff(a, b);
    expect(result.flows.changed).toHaveLength(1);
    expect(result.flows.changed[0]?.reason).toContain('start: splash → home');
  });

  it('flags a flow as changed when step length differs', () => {
    const a = makeDoc({
      flows: [{ name: 'login', start: 'home', steps: ['form'] }],
    });
    const b = makeDoc({
      flows: [{ name: 'login', start: 'home', steps: ['form', '2fa'] }],
    });
    const result = flowsDiff(a, b);
    expect(result.flows.changed[0]?.reason).toContain('steps changed (1 → 2)');
  });

  it('returns empty diffs for identical docs', () => {
    const doc = makeDoc({
      screens: [{ id: 'home', name: 'Home' }],
      flows: [{ name: 'noop', start: 'home', steps: [] }],
    });
    const result = flowsDiff(doc, doc);
    expect(result.screens.added).toEqual([]);
    expect(result.screens.removed).toEqual([]);
    expect(result.actions.added).toEqual([]);
    expect(result.actions.removed).toEqual([]);
    expect(result.flows.added).toEqual([]);
    expect(result.flows.removed).toEqual([]);
    expect(result.flows.changed).toEqual([]);
  });
});
