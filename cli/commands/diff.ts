import { Command } from 'commander';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import chalk from 'chalk';
import { flowsDiff } from '../lib/flows-diff.js';
import type { UxPathsDoc } from '../lib/types.js';

export function registerDiff(program: Command): void {
  program
    .command('diff <a> <b>')
    .description('Diff screens/actions/flows between two flows.json files (a = baseline).')
    .option('--json', 'Emit machine-readable JSON instead of human-readable output.', false)
    .action((aPath: string, bPath: string, opts: { json?: boolean }) => {
      const a = loadDoc(aPath);
      const b = loadDoc(bPath);
      const result = flowsDiff(a, b);

      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      console.log(chalk.bold(`Diff ${a.app_id}@${a.app_version} → ${b.app_id}@${b.app_version}`));
      printSection('Screens added', result.screens.added, chalk.green);
      printSection('Screens removed', result.screens.removed, chalk.red);
      printSection('Actions added', result.actions.added, chalk.green);
      printSection('Actions removed', result.actions.removed, chalk.red);
      printSection('Flows added', result.flows.added, chalk.green);
      printSection('Flows removed', result.flows.removed, chalk.red);
      if (result.flows.changed.length > 0) {
        console.log(chalk.yellow('\nFlows changed:'));
        for (const ch of result.flows.changed) {
          console.log(`  - ${ch.name}: ${ch.reason}`);
        }
      }
    });
}

function loadDoc(p: string): UxPathsDoc {
  const path = resolve(process.cwd(), p);
  if (!existsSync(path)) {
    console.error(chalk.red('File not found:'), path);
    process.exit(1);
  }
  return JSON.parse(readFileSync(path, 'utf8')) as UxPathsDoc;
}

function printSection(label: string, items: string[], color: (s: string) => string): void {
  if (items.length === 0) return;
  console.log(color(`\n${label} (${items.length}):`));
  for (const item of items) {
    console.log(`  - ${item}`);
  }
}
