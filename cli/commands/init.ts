import { Command } from 'commander';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import chalk from 'chalk';
import type { UxPathsDoc } from '../lib/types.js';

export function registerInit(program: Command): void {
  program
    .command('init')
    .description('Bootstrap a .dfl-ux-paths/ directory in the current cwd.')
    .option('--app-id <id>', 'App identifier (defaults to current dir name).')
    .option('--force', 'Overwrite an existing flows.json if present.', false)
    .action((opts: { appId?: string; force?: boolean }) => {
      const cwd = process.cwd();
      const dir = resolve(cwd, '.dfl-ux-paths');
      const flowsPath = resolve(dir, 'flows.json');
      const appId = opts.appId || basename(cwd);

      if (existsSync(flowsPath) && !opts.force) {
        console.error(
          chalk.yellow(`${flowsPath} already exists. Use --force to overwrite.`),
        );
        process.exit(1);
      }

      mkdirSync(dir, { recursive: true });

      const today = new Date().toISOString().slice(0, 10);
      const stub: UxPathsDoc = {
        schema_version: '1.0.0',
        app_id: appId,
        app_version: `${today}-0000000`,
        generated_at: new Date().toISOString(),
        tech_stack: [],
        screens: [],
        flows: [],
      };

      writeFileSync(flowsPath, JSON.stringify(stub, null, 2) + '\n', 'utf8');
      console.log(chalk.green('Created'), flowsPath);
      console.log(
        chalk.gray(
          'Next steps: populate screens/flows, then run `dfl-ux-paths validate` and `dfl-ux-paths generate-mermaid`.',
        ),
      );
    });
}
