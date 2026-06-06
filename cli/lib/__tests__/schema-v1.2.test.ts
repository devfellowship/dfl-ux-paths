import { describe, it, expect } from 'vitest';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { loadSchemaV1 } from '../load-schema.js';

function makeValidator() {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv.compile(loadSchemaV1() as object);
}

const base = {
  app_id: 'demo',
  app_version: '2026-06-06-abcdef0',
  screens: [
    { id: 'home', name: 'Home' },
    { id: 'editor', name: 'Editor' },
  ],
  flows: [{ name: 'noop', start: 'home', steps: ['editor'] }],
};

describe('schema v1.2 — additive backward compatibility', () => {
  it('still accepts a pristine v1.1.0 doc unchanged', () => {
    const validate = makeValidator();
    const doc = {
      ...base,
      schema_version: '1.1.0' as const,
      test_metadata: { default_viewport: 'mobile' },
      screens: [
        {
          id: 'home',
          name: 'Home',
          navigation_path: [{ selector: 'text=Studio', action: 'tap' }],
          prerequisites: { auth_required: true },
        },
        { id: 'editor', name: 'Editor' },
      ],
    };
    const ok = validate(doc);
    if (!ok) console.error(validate.errors);
    expect(ok).toBe(true);
  });

  it('accepts schema_version "1.2.0"', () => {
    const validate = makeValidator();
    expect(validate({ ...base, schema_version: '1.2.0' })).toBe(true);
  });
});

describe('schema v1.2 — source_ref', () => {
  it('accepts source_ref with component_file only', () => {
    const validate = makeValidator();
    const doc = {
      ...base,
      schema_version: '1.2.0' as const,
      screens: [
        { id: 'home', name: 'Home', source_ref: { component_file: 'app/index.tsx' } },
        { id: 'editor', name: 'Editor' },
      ],
    };
    const ok = validate(doc);
    if (!ok) console.error(validate.errors);
    expect(ok).toBe(true);
  });

  it('accepts source_ref with file_path_chain', () => {
    const validate = makeValidator();
    const doc = {
      ...base,
      schema_version: '1.2.0' as const,
      screens: [
        {
          id: 'editor',
          name: 'Editor',
          source_ref: {
            component_file: 'app/studio/[id]/editor.tsx',
            file_path_chain: ['app/_layout.tsx', 'app/studio/_layout.tsx', 'app/studio/[id]/editor.tsx'],
          },
        },
        { id: 'home', name: 'Home' },
      ],
    };
    const ok = validate(doc);
    if (!ok) console.error(validate.errors);
    expect(ok).toBe(true);
  });

  it('rejects source_ref missing component_file', () => {
    const validate = makeValidator();
    const doc = {
      ...base,
      schema_version: '1.2.0' as const,
      screens: [{ id: 'home', name: 'Home', source_ref: { file_path_chain: ['a.tsx'] } }, { id: 'editor', name: 'Editor' }],
    };
    expect(validate(doc)).toBe(false);
  });

  it('rejects unknown key inside source_ref', () => {
    const validate = makeValidator();
    const doc = {
      ...base,
      schema_version: '1.2.0' as const,
      screens: [{ id: 'home', name: 'Home', source_ref: { component_file: 'a.tsx', nope: 1 } }, { id: 'editor', name: 'Editor' }],
    };
    expect(validate(doc)).toBe(false);
  });
});

describe('schema v1.2 — screenshots[]', () => {
  it('accepts a screenshots array keyed by platform×orientation', () => {
    const validate = makeValidator();
    const doc = {
      ...base,
      schema_version: '1.2.0' as const,
      screens: [
        {
          id: 'editor',
          name: 'Editor',
          screenshots: [
            { platform: 'web', orientation: 'portrait', viewport: '375x812', url: 'https://devfellowship.s3.amazonaws.com/media/a.png', captured_at: '2026-06-06T12:00:00Z' },
            { platform: 'mobile', orientation: 'portrait', url: 'https://devfellowship.s3.amazonaws.com/media/b.png' },
          ],
        },
        { id: 'home', name: 'Home' },
      ],
    };
    const ok = validate(doc);
    if (!ok) console.error(validate.errors);
    expect(ok).toBe(true);
  });

  it('rejects unknown platform', () => {
    const validate = makeValidator();
    const doc = {
      ...base,
      schema_version: '1.2.0' as const,
      screens: [{ id: 'home', name: 'Home', screenshots: [{ platform: 'tv', orientation: 'portrait', url: 'https://x/y.png' }] }, { id: 'editor', name: 'Editor' }],
    };
    expect(validate(doc)).toBe(false);
  });

  it('rejects unknown orientation', () => {
    const validate = makeValidator();
    const doc = {
      ...base,
      schema_version: '1.2.0' as const,
      screens: [{ id: 'home', name: 'Home', screenshots: [{ platform: 'web', orientation: 'diagonal', url: 'https://x/y.png' }] }, { id: 'editor', name: 'Editor' }],
    };
    expect(validate(doc)).toBe(false);
  });

  it('rejects screenshot missing url', () => {
    const validate = makeValidator();
    const doc = {
      ...base,
      schema_version: '1.2.0' as const,
      screens: [{ id: 'home', name: 'Home', screenshots: [{ platform: 'web', orientation: 'portrait' }] }, { id: 'editor', name: 'Editor' }],
    };
    expect(validate(doc)).toBe(false);
  });
});

describe('schema v1.2 — route + id join key', () => {
  it('accepts canonical shared route on a screen', () => {
    const validate = makeValidator();
    const doc = {
      ...base,
      schema_version: '1.2.0' as const,
      screens: [
        { id: 'editor', name: 'Editor', route: 'studio/project/:id/editor' },
        { id: 'home', name: 'Home', route: 'studio' },
      ],
    };
    const ok = validate(doc);
    if (!ok) console.error(validate.errors);
    expect(ok).toBe(true);
  });

  it('still requires id (the join key)', () => {
    const validate = makeValidator();
    const doc = {
      ...base,
      schema_version: '1.2.0' as const,
      screens: [{ name: 'No id' }],
    };
    expect(validate(doc)).toBe(false);
  });

  it('rejects unknown screen field (additionalProperties:false preserved)', () => {
    const validate = makeValidator();
    const doc = {
      ...base,
      schema_version: '1.2.0' as const,
      screens: [{ id: 'home', name: 'Home', bogus: true }, { id: 'editor', name: 'Editor' }],
    };
    expect(validate(doc)).toBe(false);
  });
});
