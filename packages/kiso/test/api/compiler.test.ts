import { describe, it, expect } from 'vitest';
import { compile, read, analyze, generate } from '../../src/api/compiler.js';

describe('compile', () => {
  it('compiles a simple expression', () => {
    const result = compile('(+ 1 2)');
    expect(result.code).toContain('_PLUS_');
    expect(result.code).toContain('1');
    expect(result.code).toContain('2');
  });

  it('compiles with defn', () => {
    const result = compile('(defn greet [name] (str "Hello, " name))');
    expect(result.code).toContain('export');
    expect(result.code).toContain('greet');
  });

  it('compiles multiple forms', () => {
    const result = compile('(def x 1)\n(def y 2)');
    expect(result.code).toContain('x');
    expect(result.code).toContain('y');
  });

  it('includes source map when requested', () => {
    const result = compile('(def x 42)', { sourceMap: true });
    expect(result.map).toBeDefined();
    expect(result.map!.version).toBe(3);
  });

  it('returns undefined map when not requested', () => {
    const result = compile('(def x 42)');
    expect(result.map).toBeUndefined();
  });

  it('maps each top-level form to its generated line', () => {
    const src = '(def x 1)\n(def y 2)\n(def z 3)';
    const result = compile(src, { sourceMap: true });
    expect(result.map).toBeDefined();
    // Should have more than just "AAAA" — multiple semicolons for multiple lines
    expect(result.map!.mappings).toContain(';');
    // Each def should produce a separate mapping segment
    const segments = result.map!.mappings.split(';').filter(s => s.length > 0);
    expect(segments.length).toBeGreaterThanOrEqual(3);
  });
});

describe('read', () => {
  it('reads a form', () => {
    const form = read('(+ 1 2)');
    expect(form).not.toBeNull();
    expect(form!.data.type).toBe('list');
  });
});

describe('analyze', () => {
  it('analyzes a form to a node', () => {
    const form = read('42')!;
    const node = analyze(form);
    expect(node.type).toBe('literal');
  });
});

describe('generate', () => {
  it('generates JS from a node', () => {
    const form = read('42')!;
    const node = analyze(form);
    const js = generate(node);
    expect(js).toBe('42');
  });
});
