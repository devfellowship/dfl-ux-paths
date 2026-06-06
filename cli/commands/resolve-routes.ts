import { Command } from 'commander';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import chalk from 'chalk';
import { resolveRoutes } from '../lib/resolve-routes.js';

export function registerResolveRoutes(program: Command): void {
  program
    .command('resolve-routes [repoPath]')
    .description(
      'Glob file-based routing (Expo Router / Next app-router) in an app repo and emit a route → component_file map (JSON). Populates source_ref.component_file.',
    )
    .option('--pretty', 'Pretty-print the JSON output.', false)
    .action((maybeRepoPath: string | undefined, opts: { pretty?: boolean }) => {
      const repoPath = resolve(process.cwd(), maybeRepoPath || '.');
      if (!existsSync(repoPath)) {
        console.error(chalk.red('Path not found:'), repoPath);
        process.exit(1);
      }
      const result = resolveRoutes(repoPath);
      if (result.convention === 'unknown') {
        // Note goes to stderr so stdout stays clean JSON for piping.
        console.error(chalk.yellow('note:'), result.note);
      } else {
        console.error(
          chalk.gray(`convention: ${result.convention} (app_dir: ${result.app_dir}) — ${result.routes.length} routes`),
        );
      }
      const out = opts.pretty
        ? JSON.stringify(result.routes, null, 2)
        : JSON.stringify(result.routes);
      console.log(out);
    });
}
