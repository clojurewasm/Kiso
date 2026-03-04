import { describe, it, expect } from 'vitest';
import { parseArgs, type CliArgs } from '../../src/cli/args.js';

describe('parseArgs', () => {
  it('returns help for --help', () => {
    expect(parseArgs(['--help'])).toEqual({ command: 'help' });
  });

  it('returns help for -h', () => {
    expect(parseArgs(['-h'])).toEqual({ command: 'help' });
  });

  it('returns version for --version', () => {
    expect(parseArgs(['--version'])).toEqual({ command: 'version' });
  });

  it('returns version for -V', () => {
    expect(parseArgs(['-V'])).toEqual({ command: 'version' });
  });

  it('parses compile with a single file target', () => {
    const result = parseArgs(['compile', 'src/app.cljs']);
    expect(result).toEqual({
      command: 'compile',
      targets: ['src/app.cljs'],
      sourceMap: false,
      inlineSourceMap: false,
      outDir: null,
    });
  });

  it('parses compile with multiple targets', () => {
    const result = parseArgs(['compile', 'a.cljs', 'b.cljs']);
    expect(result).toEqual({
      command: 'compile',
      targets: ['a.cljs', 'b.cljs'],
      sourceMap: false,
      inlineSourceMap: false,
      outDir: null,
    });
  });

  it('parses compile with --source-map', () => {
    const result = parseArgs(['compile', '--source-map', 'src/']);
    expect(result).toEqual({
      command: 'compile',
      targets: ['src/'],
      sourceMap: true,
      inlineSourceMap: false,
      outDir: null,
    });
  });

  it('parses compile with --inline-source-map', () => {
    const result = parseArgs(['compile', '--inline-source-map', 'src/']);
    expect(result).toEqual({
      command: 'compile',
      targets: ['src/'],
      sourceMap: false,
      inlineSourceMap: true,
      outDir: null,
    });
  });

  it('parses compile with --out-dir', () => {
    const result = parseArgs(['compile', '--out-dir', 'dist/', 'src/']);
    expect(result).toEqual({
      command: 'compile',
      targets: ['src/'],
      sourceMap: false,
      inlineSourceMap: false,
      outDir: 'dist/',
    });
  });

  it('parses compile with all flags combined', () => {
    const result = parseArgs(['compile', '--source-map', '--out-dir', 'dist/', 'a.cljs', 'b.cljs']);
    expect(result).toEqual({
      command: 'compile',
      targets: ['a.cljs', 'b.cljs'],
      sourceMap: true,
      inlineSourceMap: false,
      outDir: 'dist/',
    });
  });

  it('throws on --source-map and --inline-source-map together', () => {
    expect(() => parseArgs(['compile', '--source-map', '--inline-source-map', 'src/'])).toThrow(
      /mutually exclusive/
    );
  });

  it('throws on compile with no targets', () => {
    expect(() => parseArgs(['compile'])).toThrow(/at least one/i);
  });

  it('throws on unknown command', () => {
    expect(() => parseArgs(['unknown'])).toThrow(/unknown command/i);
  });

  it('returns help when no arguments given', () => {
    expect(parseArgs([])).toEqual({ command: 'help' });
  });
});
