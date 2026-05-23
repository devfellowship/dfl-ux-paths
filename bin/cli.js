#!/usr/bin/env node
import('../dist/index.js').catch((err) => {
  console.error('Failed to load dfl-ux-paths CLI:', err?.stack || err);
  process.exit(1);
});
