import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { compile } from '../api/compiler.js';
import { resolveTargets } from './resolve.js';

export type CompileCommandOptions = {
  targets: string[];
  sourceMap: boolean;
  inlineSourceMap: boolean;
  outDir: string | null;
};

export type CompileCommandResult = {
  compiled: number;
  errors: number;
};

export function compileCommand(options: CompileCommandOptions): CompileCommandResult {
  const files = resolveTargets(options.targets);
  let compiled = 0;
  let errors = 0;

  for (const file of files) {
    try {
      const source = readFileSync(file, 'utf-8');
      const needsMap = options.sourceMap || options.inlineSourceMap;
      const result = compile(source, {
        filename: basename(file),
        sourceMap: needsMap,
      });

      const jsName = basename(file).replace(/\.cljs$/, '.js');
      const outDirPath = options.outDir ?? dirname(file);
      mkdirSync(outDirPath, { recursive: true });
      const outFile = join(outDirPath, jsName);

      let code = result.code;

      if (options.sourceMap && result.map) {
        const mapName = jsName + '.map';
        code += `\n//# sourceMappingURL=${mapName}\n`;
        writeFileSync(join(outDirPath, mapName), JSON.stringify(result.map));
      } else if (options.inlineSourceMap && result.map) {
        const b64 = Buffer.from(JSON.stringify(result.map)).toString('base64');
        code += `\n//# sourceMappingURL=data:application/json;base64,${b64}\n`;
      }

      writeFileSync(outFile, code);
      compiled++;
      process.stderr.write(`compiled ${relative(process.cwd(), file)} -> ${relative(process.cwd(), outFile)}\n`);
    } catch (e) {
      errors++;
      const msg = e instanceof Error ? e.message : String(e);
      process.stderr.write(`error: ${relative(process.cwd(), file)}: ${msg}\n`);
    }
  }

  if (errors > 0) {
    process.stderr.write(`\n${errors} file(s) failed to compile\n`);
  }

  return { compiled, errors };
}
