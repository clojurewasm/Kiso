import { parseArgs as nodeParseArgs } from 'node:util';

export type CliArgs =
  | { command: 'help' }
  | { command: 'version' }
  | {
      command: 'compile';
      targets: string[];
      sourceMap: boolean;
      inlineSourceMap: boolean;
      outDir: string | null;
    };

export function parseArgs(argv: string[]): CliArgs {
  const { values, positionals } = nodeParseArgs({
    args: argv,
    allowPositionals: true,
    strict: false,
    options: {
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', short: 'V', default: false },
      'source-map': { type: 'boolean', default: false },
      'inline-source-map': { type: 'boolean', default: false },
      'out-dir': { type: 'string' },
    },
  });

  if (values.help) return { command: 'help' };
  if (values.version) return { command: 'version' };

  const command = positionals[0];
  if (!command) return { command: 'help' };

  if (command !== 'compile') {
    throw new Error(`Unknown command: ${command}`);
  }

  const targets = positionals.slice(1);
  if (targets.length === 0) {
    throw new Error('compile requires at least one file or directory target');
  }

  const sourceMap = Boolean(values['source-map']);
  const inlineSourceMap = Boolean(values['inline-source-map']);

  if (sourceMap && inlineSourceMap) {
    throw new Error('--source-map and --inline-source-map are mutually exclusive');
  }

  return {
    command: 'compile',
    targets,
    sourceMap,
    inlineSourceMap,
    outDir: (values['out-dir'] as string) ?? null,
  };
}
