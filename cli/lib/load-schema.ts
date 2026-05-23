import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

let cached: unknown | null = null;

export function loadSchemaV1(): unknown {
  if (cached) return cached;
  // dist/lib/load-schema.js → schema/v1.json lives at package root
  const here = dirname(fileURLToPath(import.meta.url));
  // Walk up to find schema/v1.json (works from cli/lib via tsx OR dist/lib)
  const candidates = [
    resolve(here, '../../schema/v1.json'),
    resolve(here, '../../../schema/v1.json'),
  ];
  for (const path of candidates) {
    try {
      const raw = readFileSync(path, 'utf8');
      cached = JSON.parse(raw);
      return cached;
    } catch {
      /* try next */
    }
  }
  throw new Error('Unable to locate schema/v1.json relative to ' + here);
}
