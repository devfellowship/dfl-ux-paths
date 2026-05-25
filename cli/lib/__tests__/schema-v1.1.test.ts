import { describe, it, expect } from 'vitest';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { loadSchemaV1 } from '../load-schema.js';

function makeValidator() {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv.compile(loadSchemaV1() as object);
}

const v1_0_doc = {
  schema_version: '1.0.0' as const,
  app_id: 'demo',
  app_version: '2026-05-25-abcdef0',
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

describe('schema v1.1 — backward compatibility', () => {
  it('still accepts a pristine v1.0.0 doc', () => {
    const validate = makeValidator();
    const ok = validate(v1_0_doc);
    if (!ok) {
      // eslint-disable-next-line no-console
      console.error(validate.errors);
    }
    expect(ok).toBe(true);
  });

  it('rejects unknown schema_version', () => {
    const validate = makeValidator();
    const ok = validate({ ...v1_0_doc, schema_version: '2.0.0' });
    expect(ok).toBe(false);
  });
});

describe('schema v1.1 — new optional fields', () => {
  it('accepts schema_version "1.1.0"', () => {
    const validate = makeValidator();
    const ok = validate({ ...v1_0_doc, schema_version: '1.1.0' });
    expect(ok).toBe(true);
  });

  it('accepts navigation_path on a screen', () => {
    const validate = makeValidator();
    const doc = {
      ...v1_0_doc,
      schema_version: '1.1.0',
      screens: [
        {
          id: 'studio_list',
          name: 'Studio tab',
          navigation_path: [
            { selector: 'text=Studio', action: 'tap', wait_for: 'text=+ Nova Aula' },
            { selector: 'role=tab[name=Studio]', action: 'tap' },
          ],
        },
        { id: 'lessons', name: 'Lessons' },
      ],
      flows: [{ name: 'noop', start: 'studio_list', steps: ['lessons'] }],
    };
    const ok = validate(doc);
    if (!ok) console.error(validate.errors);
    expect(ok).toBe(true);
  });

  it('rejects navigation_path with unknown action', () => {
    const validate = makeValidator();
    const doc = {
      ...v1_0_doc,
      schema_version: '1.1.0',
      screens: [
        {
          id: 'home',
          name: 'Home',
          navigation_path: [{ selector: 'text=Foo', action: 'teleport' }],
        },
      ],
      flows: [{ name: 'x', start: 'home', steps: [] }],
    };
    expect(validate(doc)).toBe(false);
  });

  it('accepts prerequisites on a screen', () => {
    const validate = makeValidator();
    const doc = {
      ...v1_0_doc,
      schema_version: '1.1.0',
      screens: [
        {
          id: 'home',
          name: 'Home',
          prerequisites: {
            auth_required: true,
            auth_role: 'instructor',
            data_required: ['lesson_studio.projects has >= 0 rows'],
            preconditions_in_app: ['onboarding complete'],
            feature_flags: ['studio_v2'],
          },
        },
      ],
      flows: [{ name: 'x', start: 'home', steps: [] }],
    };
    const ok = validate(doc);
    if (!ok) console.error(validate.errors);
    expect(ok).toBe(true);
  });

  it('accepts top-level test_metadata', () => {
    const validate = makeValidator();
    const doc = {
      ...v1_0_doc,
      schema_version: '1.1.0',
      test_metadata: {
        auth_strategy: 'supabase-anon + CLAUDE_SMOKE creds',
        default_viewport: 'mobile',
        base_url: 'https://mobile.devfellowship.com/',
        test_user_secret_path: '/shared/CLAUDE_SMOKE_USERNAME',
        notes: 'Smoke against prod is allowed.',
      },
    };
    const ok = validate(doc);
    if (!ok) console.error(validate.errors);
    expect(ok).toBe(true);
  });

  it('rejects unknown viewport on test_metadata', () => {
    const validate = makeValidator();
    const doc = {
      ...v1_0_doc,
      schema_version: '1.1.0',
      test_metadata: { default_viewport: 'wristwatch' },
    };
    expect(validate(doc)).toBe(false);
  });

  it('accepts flow steps as rich step objects (v1.1)', () => {
    const validate = makeValidator();
    const doc = {
      ...v1_0_doc,
      schema_version: '1.1.0',
      flows: [
        {
          name: 'create_lesson',
          start: 'home',
          steps: [
            {
              screen: 'home',
              action: 'tap',
              selector: 'text=+ Nova Aula',
              target_screen: 'lessons',
              wait_for_target: 'css=[data-testid=template-grid]',
            },
          ],
        },
      ],
    };
    const ok = validate(doc);
    if (!ok) console.error(validate.errors);
    expect(ok).toBe(true);
  });

  it('accepts mixed string + object flow steps during migration', () => {
    const validate = makeValidator();
    const doc = {
      ...v1_0_doc,
      schema_version: '1.1.0',
      flows: [
        {
          name: 'mixed',
          start: 'home',
          steps: ['lessons', { screen: 'lessons', action: 'tap', selector: 'text=Next' }],
        },
      ],
    };
    const ok = validate(doc);
    if (!ok) console.error(validate.errors);
    expect(ok).toBe(true);
  });

  it('rejects unknown top-level fields (additionalProperties:false preserved)', () => {
    const validate = makeValidator();
    const doc = { ...v1_0_doc, schema_version: '1.1.0', unknown_field: 'nope' };
    expect(validate(doc)).toBe(false);
  });
});
