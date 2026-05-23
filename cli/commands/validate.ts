import { Command } from 'commander';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import chalk from 'chalk';
import { loadSchemaV1 } from '../lib/load-schema.js';

export function registerValidate(program: Command): void {
  program
    .command('validate [path]')
    .description('Validate a flows.json against the DFL UX Paths v1 schema.')
    .action((maybePath: string | undefined) => {
      const path = resolve(process.cwd(), maybePath || '.dfl-ux-paths/flows.json');
      if (!existsSync(path)) {
        console.error(chalk.red('File not found:'), path);
        process.exit(1);
      }
      let doc: unknown;
      try {
        doc = JSON.parse(readFileSync(path, 'utf8'));
      } catch (err) {
        console.error(chalk.red('Invalid JSON:'), (err as Error).message);
        process.exit(1);
      }

      const ajv = new Ajv2020({ allErrors: true, strict: false });
      addFormats(ajv);
      const schema = loadSchemaV1();
      const validate = ajv.compile(schema as object);
      const ok = validate(doc);
      if (ok) {
        console.log(chalk.green('OK'), path, 'conforms to schema v1.');
        process.exit(0);
      }
      console.error(chalk.red('FAIL'), path);
      for (const err of validate.errors ?? []) {
        console.error(
          chalk.yellow('  -'),
          err.instancePath || '<root>',
          err.message,
          err.params ? JSON.stringify(err.params) : '',
        );
      }
      process.exit(1);
    });
}
