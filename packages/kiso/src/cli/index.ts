import { parseArgs } from './args.js';
import { compileCommand } from './compile-command.js';
import { version } from '../version.js';

const HELP_TEXT = `Usage: kiso <command> [options]

Commands:
  compile <file|dir...>   Compile .cljs files to JavaScript

Options:
  --source-map            Generate sidecar .js.map files
  --inline-source-map     Embed source map as base64 in .js
  --out-dir <dir>         Write output to <dir>
  -V, --version           Show version
  -h, --help              Show this help

Examples:
  kiso compile src/app/core.cljs
  kiso compile src/
  kiso compile --source-map src/
  kiso compile --out-dir dist/ src/
`;

export function main(argv: string[]): void {
  const args = parseArgs(argv);

  switch (args.command) {
    case 'help':
      process.stdout.write(HELP_TEXT);
      break;
    case 'version':
      process.stdout.write(`kiso ${version}\n`);
      break;
    case 'compile': {
      const result = compileCommand(args);
      if (result.errors > 0) {
        process.exitCode = 1;
      }
      break;
    }
  }
}

try {
  main(process.argv.slice(2));
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  process.stderr.write(`kiso: ${msg}\n`);
  process.exitCode = 1;
}
