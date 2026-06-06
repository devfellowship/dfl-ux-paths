import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveRoutes, _internal } from '../resolve-routes.js';

function touch(root: string, rel: string): void {
  const full = join(root, rel);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, '// stub\n', 'utf8');
}

describe('resolve-routes — segment canonicalization', () => {
  const { canonSegment, segmentsToRoute } = _internal;
  it('strips route groups', () => {
    expect(canonSegment('(auth)')).toBeNull();
  });
  it('maps dynamic [id] → :id', () => {
    expect(canonSegment('[id]')).toBe(':id');
  });
  it('maps catch-all [...slug] → *slug', () => {
    expect(canonSegment('[...slug]')).toBe('*slug');
  });
  it('maps optional catch-all [[...slug]] → *slug', () => {
    expect(canonSegment('[[...slug]]')).toBe('*slug');
  });
  it('builds a route dropping groups', () => {
    expect(segmentsToRoute(['(auth)', 'studio', '[id]', 'editor'])).toBe('/studio/:id/editor');
  });
  it('root for empty segments', () => {
    expect(segmentsToRoute([])).toBe('/');
  });
});

describe('resolve-routes — Expo Router', () => {
  let root: string;
  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'expo-'));
    touch(root, 'app/_layout.tsx');
    touch(root, 'app/index.tsx');
    touch(root, 'app/profile/settings.tsx');
    touch(root, 'app/(tabs)/studio.tsx');
    touch(root, 'app/studio/[id]/editor.tsx');
    touch(root, 'app/blog/[...slug].tsx');
  });
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it('detects expo-router (no page.* sentinel)', () => {
    const r = resolveRoutes(root);
    expect(r.convention).toBe('expo-router');
  });
  it('maps index → parent route', () => {
    const r = resolveRoutes(root);
    expect(r.routes.find((x) => x.component_file === 'app/index.tsx')?.route).toBe('/');
  });
  it('maps nested file → /profile/settings', () => {
    const r = resolveRoutes(root);
    expect(r.routes.find((x) => x.route === '/profile/settings')?.component_file).toBe('app/profile/settings.tsx');
  });
  it('strips (tabs) group', () => {
    const r = resolveRoutes(root);
    expect(r.routes.find((x) => x.component_file === 'app/(tabs)/studio.tsx')?.route).toBe('/studio');
  });
  it('handles dynamic [id]', () => {
    const r = resolveRoutes(root);
    expect(r.routes.find((x) => x.route === '/studio/:id/editor')?.component_file).toBe('app/studio/[id]/editor.tsx');
  });
  it('handles catch-all', () => {
    const r = resolveRoutes(root);
    expect(r.routes.some((x) => x.route === '/blog/*slug')).toBe(true);
  });
  it('skips _layout files', () => {
    const r = resolveRoutes(root);
    expect(r.routes.some((x) => x.component_file.endsWith('_layout.tsx'))).toBe(false);
  });
});

describe('resolve-routes — Next app-router', () => {
  let root: string;
  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'next-'));
    touch(root, 'app/layout.tsx');
    touch(root, 'app/page.tsx');
    touch(root, 'app/(marketing)/about/page.tsx');
    touch(root, 'app/studio/[id]/editor/page.tsx');
    touch(root, 'app/docs/[...slug]/page.tsx');
    touch(root, 'app/api/health/route.ts'); // not a page → ignored
    touch(root, 'app/dashboard/loading.tsx'); // not a route
  });
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it('detects next-app-router (page.* sentinel present)', () => {
    const r = resolveRoutes(root);
    expect(r.convention).toBe('next-app-router');
  });
  it('root page → /', () => {
    const r = resolveRoutes(root);
    expect(r.routes.find((x) => x.component_file === 'app/page.tsx')?.route).toBe('/');
  });
  it('strips (marketing) group', () => {
    const r = resolveRoutes(root);
    expect(r.routes.find((x) => x.route === '/about')?.component_file).toBe('app/(marketing)/about/page.tsx');
  });
  it('dynamic [id] → :id', () => {
    const r = resolveRoutes(root);
    expect(r.routes.find((x) => x.route === '/studio/:id/editor')?.component_file).toBe('app/studio/[id]/editor/page.tsx');
  });
  it('catch-all docs', () => {
    const r = resolveRoutes(root);
    expect(r.routes.some((x) => x.route === '/docs/*slug')).toBe(true);
  });
  it('ignores route.ts and loading.tsx', () => {
    const r = resolveRoutes(root);
    expect(r.routes.some((x) => x.component_file.endsWith('route.ts'))).toBe(false);
    expect(r.routes.some((x) => x.component_file.endsWith('loading.tsx'))).toBe(false);
  });
});

describe('resolve-routes — unknown convention fallback', () => {
  let root: string;
  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'rr-'));
    touch(root, 'src/App.tsx');
    touch(root, 'src/routes.tsx');
  });
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it('returns unknown + a note when no app/ routing detected', () => {
    const r = resolveRoutes(root);
    expect(r.convention).toBe('unknown');
    expect(r.routes).toEqual([]);
    expect(r.note).toMatch(/React-Router/i);
  });
});
