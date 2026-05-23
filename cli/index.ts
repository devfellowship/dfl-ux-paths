import { Command } from 'commander';
import { registerInit } from './commands/init.js';
import { registerValidate } from './commands/validate.js';
import { registerGenerateMermaid } from './commands/generate-mermaid.js';
import { registerDiff } from './commands/diff.js';
import { registerStamp } from './commands/stamp.js';

const program = new Command();

program
  .name('dfl-ux-paths')
  .description('DFL UX Paths CLI — schema-validated app-flow mapping.')
  .version('0.1.0');

registerInit(program);
registerValidate(program);
registerGenerateMermaid(program);
registerDiff(program);
registerStamp(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(err?.stack || err);
  process.exit(1);
});
