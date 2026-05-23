import { Command } from 'commander';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import chalk from 'chalk';
import type { UxPathsDoc } from '../lib/types.js';

export function registerStamp(program: Command): void {
  program
    .command('stamp [path]')
    .description('Refresh app_version to YYYY-MM-DD-<git-sha-short> and bump generated_at.')
    .action((maybePath: string | undefined) => {
      const path = resolve(process.cwd(), maybePath || '.dfl-ux-paths/flows.json');
      if (!existsSync(path)) {
        console.error(chalk.red('File not found:'), path);
        process.exit(1);
      }
      const doc = JSON.parse(readFileSync(path, 'utf8')) as UxPathsDoc;

      const today = new Date().toISOString().slice(0, 10);
      let sha = '0000000';
      try {
        sha = execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
          .toString()
          .trim();
        if (!sha) sha = '0000000';
      } catch {
        // Not a git repo or git missing — fall back to 0000000.
      }

      const newVersion = `${today}-${sha}`;
      const newGeneratedAt = new Date().toISOString();
      const updated: UxPathsDoc = {
        ...doc,
        app_version: newVersion,
        generated_at: newGeneratedAt,
      };
      writeFileSync(path, JSON.stringify(updated, null, 2) + '\n', 'utf8');
      console.log(chalk.green('Stamped'), path);
      console.log(chalk.gray(`  app_version: ${newVersion}`));
      console.log(chalk.gray(`  generated_at: ${newGeneratedAt}`));
    });
}
