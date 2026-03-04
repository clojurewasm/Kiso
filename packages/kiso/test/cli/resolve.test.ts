import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveTargets } from '../../src/cli/resolve.js';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const tmpDir = join(import.meta.dirname, '__resolve_tmp__');

beforeEach(() => {
  mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('resolveTargets', () => {
  it('returns a single .cljs file as-is', () => {
    const file = join(tmpDir, 'app.cljs');
    writeFileSync(file, '(ns app)');
    expect(resolveTargets([file])).toEqual([file]);
  });

  it('finds .cljs files in a directory', () => {
    writeFileSync(join(tmpDir, 'a.cljs'), '');
    writeFileSync(join(tmpDir, 'b.cljs'), '');
    const result = resolveTargets([tmpDir]);
    expect(result.sort()).toEqual([join(tmpDir, 'a.cljs'), join(tmpDir, 'b.cljs')]);
  });

  it('finds .cljs files in nested directories', () => {
    mkdirSync(join(tmpDir, 'sub'), { recursive: true });
    writeFileSync(join(tmpDir, 'top.cljs'), '');
    writeFileSync(join(tmpDir, 'sub', 'nested.cljs'), '');
    const result = resolveTargets([tmpDir]);
    expect(result.sort()).toEqual([
      join(tmpDir, 'sub', 'nested.cljs'),
      join(tmpDir, 'top.cljs'),
    ]);
  });

  it('skips non-.cljs files', () => {
    writeFileSync(join(tmpDir, 'app.cljs'), '');
    writeFileSync(join(tmpDir, 'readme.md'), '');
    writeFileSync(join(tmpDir, 'lib.ts'), '');
    expect(resolveTargets([tmpDir])).toEqual([join(tmpDir, 'app.cljs')]);
  });

  it('throws on nonexistent path', () => {
    expect(() => resolveTargets([join(tmpDir, 'nope.cljs')])).toThrow(/does not exist/i);
  });

  it('merges results from multiple targets', () => {
    const dirA = join(tmpDir, 'a');
    const dirB = join(tmpDir, 'b');
    mkdirSync(dirA, { recursive: true });
    mkdirSync(dirB, { recursive: true });
    writeFileSync(join(dirA, 'x.cljs'), '');
    writeFileSync(join(dirB, 'y.cljs'), '');
    const result = resolveTargets([dirA, dirB]);
    expect(result.sort()).toEqual([join(dirA, 'x.cljs'), join(dirB, 'y.cljs')]);
  });
});
