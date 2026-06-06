#!/usr/bin/env node
// Standalone route → component_file resolver.
// Usage: node bin/resolve-routes.mjs <app-repo-path> [--pretty]
// Emits JSON [{ route, component_file }] on stdout; a one-line note on stderr.
// Equivalent to `dfl-ux-paths resolve-routes <path>` — provided as a zero-arg
// shim for callers that don't have the full CLI built/installed but DO have dist/.
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const distLib = join(here, '..', 'dist', 'lib', 'resolve-routes.js');

if (!existsSync(distLib)) {
  console.error(
    'resolve-routes: dist/lib/resolve-routes.js not found. Run `pnpm run build` first, ' +
      'or use `node bin/cli.js resolve-routes <path>` after building.',
  );
  process.exit(1);
}

const { resolveRoutes } = await import(distLib);

const args = process.argv.slice(2);
const pretty = args.includes('--pretty');
const repoArg = args.find((a) => !a.startsWith('--')) || '.';
const repoPath = resolve(process.cwd(), repoArg);

if (!existsSync(repoPath)) {
  console.error('resolve-routes: path not found:', repoPath);
  process.exit(1);
}

const result = resolveRoutes(repoPath);
if (result.convention === 'unknown') {
  console.error('note:', result.note);
} else {
  console.error(
    `convention: ${result.convention} (app_dir: ${result.app_dir}) — ${result.routes.length} routes`,
  );
}
console.log(pretty ? JSON.stringify(result.routes, null, 2) : JSON.stringify(result.routes));
