import { describe, it, expect } from 'vitest';
import { compile, read, analyze, generate } from '../../src/api/compiler.js';

describe('compile', () => {
  it('compiles a simple expression', () => {
    const result = compile('(+ 1 2)');
    expect(result.code).toContain('add');
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

  it('aliases runtime import when user def collides', () => {
    // User defines `add` which collides with munge('+') = 'add'
    const result = compile('(ns test)\n(defn add [a b] (+ a b))');
    // Runtime `add` should be imported with alias
    expect(result.code).toContain('add as _rt_add');
    // The body should use _rt_add for +, not the user's add
    expect(result.code).toContain('_rt_add(a, b)');
    // The user's function should still be named add
    expect(result.code).toContain('export let add =');
  });

  it('aliases runtime import when ns alias collides', () => {
    // `:as str` collides with runtime `str` function when both are used
    const result = compile('(ns test (:require [clojure.string :as str]))\n(def x (str (str/join "," ["a" "b"])))');
    // Runtime `str` should be aliased to avoid collision with `import * as str`
    expect(result.code).toContain('str as _rt_str');
    // The ns import should still use `str` as namespace alias
    expect(result.code).toContain('import * as str from');
    // The runtime str should use the aliased name
    expect(result.code).toContain('_rt_str(str.join');
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

  it('errors on odd-length map literal', () => {
    expect(() => compile('{:a 1 :b}')).toThrow('even number');
  });

  it('errors on odd-length let binding vector', () => {
    expect(() => compile('(let [x 1 y] x)')).toThrow('even number');
  });

  it('errors on odd-length loop binding vector', () => {
    expect(() => compile('(loop [x 1 y] x)')).toThrow('even number');
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

describe('regex literals', () => {
  it('compiles regex literal to JS RegExp', () => {
    const result = compile('#"\\n"');
    expect(result.code).toContain('/\\n/');
    expect(result.code).not.toContain('"\\\\n"');
  });

  it('compiles regex with special chars', () => {
    const result = compile('#"[a-z]+"');
    expect(result.code).toContain('/[a-z]+/');
  });

  it('escapes forward slashes in regex pattern', () => {
    const result = compile('#"a/b"');
    expect(result.code).toContain('/a\\/b/');
  });
});
