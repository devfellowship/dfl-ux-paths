import { readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative, sep, posix } from 'node:path';

/**
 * v1.2 — Route → source-file resolver.
 *
 * Globs a file-based routing tree and emits a `route → component_file` map that
 * populates `screen.source_ref.component_file` in a flows.json.
 *
 * Supported conventions (auto-detected):
 *  - Expo Router (app dir): `app/profile/settings.tsx` -> `/profile/settings`.
 *    Handles route groups `(group)` (stripped), dynamic `[param]` -> `:param`,
 *    catch-all `[...rest]` -> `*rest`, `index` files -> parent dir, and skips
 *    `_layout` files (they're layouts, not routes).
 *  - Next.js app-router: only page.(tsx|jsx|ts|js) files define routes.
 *    `app/studio/[id]/editor/page.tsx` -> `/studio/:id/editor`.
 *    Route groups `(group)` stripped; dynamic `[id]` → `:id`; catch-all
 *    `[...slug]` → `*slug`. `layout`/`loading`/`error`/`template`/`route` files
 *    are ignored.
 *
 * If neither convention is detected (no `app/` dir with route-ish files), the
 * caller gets `{ convention: 'unknown', routes: [] }` plus a `note` explaining
 * that React-Router imperative config needs manual / AST handling (not done here).
 */

export type RouteConvention = 'expo-router' | 'next-app-router' | 'unknown';

export interface ResolvedRoute {
  /** Canonical route, leading-slash, params as ':name', catch-all as '*name'. */
  route: string;
  /** Repo-relative path (posix separators) to the component file. */
  component_file: string;
}

export interface ResolveResult {
  convention: RouteConvention;
  /** Directory (repo-relative) that was treated as the route root, if any. */
  app_dir?: string;
  routes: ResolvedRoute[];
  /** Present when convention is 'unknown' or a partial/ambiguous detection. */
  note?: string;
}

const ROUTE_EXTS = ['tsx', 'ts', 'jsx', 'js'];
const NEXT_PAGE_BASENAMES = new Set(['page']);
// Next special files that are NOT routes.
const NEXT_NON_ROUTE = new Set(['layout', 'loading', 'error', 'template', 'route', 'not-found', 'default', 'global-error']);
// Expo special files that are NOT routes.
const EXPO_NON_ROUTE = new Set(['_layout']);

function extOf(file: string): string {
  const i = file.lastIndexOf('.');
  return i >= 0 ? file.slice(i + 1) : '';
}
function baseNoExt(file: string): string {
  const i = file.lastIndexOf('.');
  return i >= 0 ? file.slice(0, i) : file;
}

/** Recursively collect files (repo-relative, posix) under `dir`. */
function walk(root: string, dir: string, acc: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === '.git') continue;
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walk(root, full, acc);
    } else if (st.isFile()) {
      acc.push(relative(root, full).split(sep).join(posix.sep));
    }
  }
}

/** Convert a single path segment to canonical route form. */
function canonSegment(seg: string): string | null {
  // Route group: (auth) → dropped from the URL.
  if (seg.startsWith('(') && seg.endsWith(')')) return null;
  // Catch-all dynamic: [...slug] → *slug
  const catchAll = seg.match(/^\[\.\.\.(.+)\]$/);
  if (catchAll) return `*${catchAll[1]}`;
  // Optional catch-all Next: [[...slug]] → *slug
  const optCatch = seg.match(/^\[\[\.\.\.(.+)\]\]$/);
  if (optCatch) return `*${optCatch[1]}`;
  // Dynamic: [id] → :id
  const dyn = seg.match(/^\[(.+)\]$/);
  if (dyn) return `:${dyn[1]}`;
  return seg;
}

/** Build a route string from an array of repo-relative segments (already ext-stripped). */
function segmentsToRoute(segments: string[]): string {
  const out: string[] = [];
  for (const seg of segments) {
    const c = canonSegment(seg);
    if (c === null) continue; // group, dropped
    out.push(c);
  }
  const route = '/' + out.join('/');
  return route === '/' ? '/' : route.replace(/\/+$/, '');
}

/** Detect which file-based routing convention an `app/` dir uses. */
function detectConvention(root: string): { convention: RouteConvention; appDir?: string } {
  const appDir = join(root, 'app');
  if (!existsSync(appDir) || !statSync(appDir).isDirectory()) {
    return { convention: 'unknown' };
  }
  const files: string[] = [];
  walk(root, appDir, files);
  const routeFiles = files.filter((f) => ROUTE_EXTS.includes(extOf(f)));
  if (routeFiles.length === 0) return { convention: 'unknown' };

  const hasNextPage = routeFiles.some((f) => NEXT_PAGE_BASENAMES.has(baseNoExt(f.split(posix.sep).pop()!)));
  // Expo Router: route is the filename itself (not a sentinel `page` file).
  // Heuristic: if there are page.* files, it's Next app-router. Otherwise Expo.
  if (hasNextPage) return { convention: 'next-app-router', appDir: 'app' };
  return { convention: 'expo-router', appDir: 'app' };
}

function resolveNext(root: string): ResolvedRoute[] {
  const appDir = join(root, 'app');
  const files: string[] = [];
  walk(root, appDir, files);
  const routes: ResolvedRoute[] = [];
  for (const f of files) {
    const parts = f.split(posix.sep); // e.g. ['app','studio','[id]','editor','page.tsx']
    const fileName = parts[parts.length - 1];
    const base = baseNoExt(fileName);
    if (!ROUTE_EXTS.includes(extOf(fileName))) continue;
    if (!NEXT_PAGE_BASENAMES.has(base)) continue; // only page.* defines a route
    if (NEXT_NON_ROUTE.has(base)) continue;
    // Drop leading 'app' and the trailing file → directory segments form the route.
    const dirSegments = parts.slice(1, -1);
    const route = segmentsToRoute(dirSegments);
    routes.push({ route, component_file: f });
  }
  return dedupeSort(routes);
}

function resolveExpo(root: string): ResolvedRoute[] {
  const appDir = join(root, 'app');
  const files: string[] = [];
  walk(root, appDir, files);
  const routes: ResolvedRoute[] = [];
  for (const f of files) {
    const parts = f.split(posix.sep); // e.g. ['app','profile','settings.tsx']
    const fileName = parts[parts.length - 1];
    const base = baseNoExt(fileName);
    if (!ROUTE_EXTS.includes(extOf(fileName))) continue;
    if (EXPO_NON_ROUTE.has(base)) continue; // _layout is not a route
    // segments = dirs after 'app' + the file base (unless 'index')
    const dirSegments = parts.slice(1, -1);
    const segs = base === 'index' ? dirSegments : [...dirSegments, base];
    const route = segmentsToRoute(segs);
    routes.push({ route, component_file: f });
  }
  return dedupeSort(routes);
}

function dedupeSort(routes: ResolvedRoute[]): ResolvedRoute[] {
  const seen = new Map<string, ResolvedRoute>();
  for (const r of routes) {
    // Prefer the first component_file for a given route; stable order via sort below.
    if (!seen.has(r.route)) seen.set(r.route, r);
  }
  return [...seen.values()].sort((a, b) => a.route.localeCompare(b.route));
}

/**
 * Resolve a `route → component_file` map for an app repo at `repoPath`.
 */
export function resolveRoutes(repoPath: string): ResolveResult {
  const { convention, appDir } = detectConvention(repoPath);
  if (convention === 'unknown') {
    return {
      convention: 'unknown',
      routes: [],
      note: 'No Expo Router / Next.js app-router file-based routing detected (no `app/` dir with route files). React-Router imperative route config needs manual or AST-based extraction — not implemented by this resolver.',
    };
  }
  const routes = convention === 'next-app-router' ? resolveNext(repoPath) : resolveExpo(repoPath);
  return { convention, app_dir: appDir, routes };
}

// Re-export internals for tests.
export const _internal = { canonSegment, segmentsToRoute, detectConvention, walk };
