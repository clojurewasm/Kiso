import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { compileCommand } from '../../src/cli/compile-command.js';
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const tmpDir = join(import.meta.dirname, '__compile_tmp__');

beforeEach(() => {
  mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('compileCommand', () => {
  it('compiles a single .cljs file to .js in the same directory', () => {
    const src = join(tmpDir, 'app.cljs');
    writeFileSync(src, '(def x 42)');
    compileCommand({ targets: [src], sourceMap: false, inlineSourceMap: false, outDir: null });
    const out = join(tmpDir, 'app.js');
    expect(existsSync(out)).toBe(true);
    const code = readFileSync(out, 'utf-8');
    expect(code).toContain('x');
  });

  it('compiles to --out-dir preserving relative paths', () => {
    const srcDir = join(tmpDir, 'src');
    const outDir = join(tmpDir, 'dist');
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(srcDir, 'core.cljs'), '(def y 1)');
    compileCommand({ targets: [join(srcDir, 'core.cljs')], sourceMap: false, inlineSourceMap: false, outDir });
    const out = join(outDir, 'core.js');
    expect(existsSync(out)).toBe(true);
  });

  it('generates sidecar .js.map with --source-map', () => {
    const src = join(tmpDir, 'app.cljs');
    writeFileSync(src, '(def z 99)');
    compileCommand({ targets: [src], sourceMap: true, inlineSourceMap: false, outDir: null });
    const jsFile = join(tmpDir, 'app.js');
    const mapFile = join(tmpDir, 'app.js.map');
    expect(existsSync(mapFile)).toBe(true);
    const code = readFileSync(jsFile, 'utf-8');
    expect(code).toContain('//# sourceMappingURL=app.js.map');
    const map = JSON.parse(readFileSync(mapFile, 'utf-8'));
    expect(map.version).toBe(3);
  });

  it('generates inline source map with --inline-source-map', () => {
    const src = join(tmpDir, 'app.cljs');
    writeFileSync(src, '(def w 7)');
    compileCommand({ targets: [src], sourceMap: false, inlineSourceMap: true, outDir: null });
    const code = readFileSync(join(tmpDir, 'app.js'), 'utf-8');
    expect(code).toContain('//# sourceMappingURL=data:application/json;base64,');
    expect(existsSync(join(tmpDir, 'app.js.map'))).toBe(false);
  });

  it('continues on compile error and reports count', () => {
    const good = join(tmpDir, 'good.cljs');
    const bad = join(tmpDir, 'bad.cljs');
    writeFileSync(good, '(def a 1)');
    writeFileSync(bad, '(def'); // unterminated
    const result = compileCommand({
      targets: [good, bad],
      sourceMap: false,
      inlineSourceMap: false,
      outDir: null,
    });
    expect(existsSync(join(tmpDir, 'good.js'))).toBe(true);
    expect(existsSync(join(tmpDir, 'bad.js'))).toBe(false);
    expect(result.errors).toBe(1);
    expect(result.compiled).toBe(1);
  });

  it('creates nested output directories with --out-dir', () => {
    const srcDir = join(tmpDir, 'src', 'app');
    const outDir = join(tmpDir, 'out');
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(srcDir, 'main.cljs'), '(def q 5)');
    compileCommand({
      targets: [join(srcDir, 'main.cljs')],
      sourceMap: false,
      inlineSourceMap: false,
      outDir,
    });
    expect(existsSync(join(outDir, 'main.js'))).toBe(true);
  });
});
