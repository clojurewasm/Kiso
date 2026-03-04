/**
 * Conformance tests — Protocol edge cases (Phase 13.4)
 *
 * Tests: extend-type, multi-protocol reify, deftype, defprotocol dispatch
 */
import { describe, it, expect } from 'vitest';
import { readStr, readAllStr } from '../../src/reader/reader.js';
import { Analyzer } from '../../src/analyzer/analyzer.js';
import { emit, emitModule } from '../../src/codegen/emitter.js';
import { vector } from '../../src/runtime/vector.js';
import { keyword } from '../../src/runtime/keyword.js';
import { hashMap } from '../../src/runtime/hash-map.js';
import { hashSet } from '../../src/runtime/hash-set.js';
import { list, EMPTY_LIST } from '../../src/runtime/list.js';
import { symbol as runtimeSymbol } from '../../src/runtime/symbol.js';
import { defprotocol, protocolFn } from '../../src/runtime/protocols.js';
import {
  truthy, add, subtract, str, nil_p, not, get, count,
} from '../../src/runtime/core.js';

const analyzer = new Analyzer();

const runtime: Record<string, unknown> = {
  vector, keyword, hashMap, hashSet, list, EMPTY_LIST,
  symbol: runtimeSymbol,
  defprotocol, protocolFn,
  truthy, add, subtract, str, nil_p, not, get, count,
};
const runtimeKeys = Object.keys(runtime);
const runtimeVals = Object.values(runtime);

function runModule(source: string): unknown {
  const forms = readAllStr(source);
  const nodes = analyzer.analyzeAll(forms);
  // Emit each node as a statement, with last as return
  const stmts: string[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    const isLast = i === nodes.length - 1;
    if (node.type === 'def') {
      const init = emit(node);
      // def at top level — use var for Function context
      stmts.push(`var ${init.replace(/^let /, '')}`);
    } else if (node.type === 'do') {
      // defprotocol expands to (do (def ...) (def ...))
      // Flatten the do into separate var statements
      const doJs = emit(node);
      // The do emits as (let X = ..., let Y = ...)
      // Split and convert to var statements
      const inner = doJs.slice(1, -1); // strip outer parens
      const parts = inner.split(/,\s*let\s+/);
      for (const part of parts) {
        const cleaned = part.replace(/^let\s+/, '');
        stmts.push(`var ${cleaned};`);
      }
    } else if (node.type === 'deftype' || node.type === 'defrecord') {
      stmts.push(emit(node));
    } else if (node.type === 'extend-type') {
      stmts.push(`${emit(node)};`);
    } else if (isLast) {
      stmts.push(`return ${emit(node)};`);
    } else {
      stmts.push(`${emit(node)};`);
    }
  }
  const js = stmts.join('\n');
  // eslint-disable-next-line no-new-func -- test-only: evaluating compiler output
  const fn = new Function(...runtimeKeys, js);
  return fn(...runtimeVals);
}

// ── defprotocol + deftype ──

describe('defprotocol + deftype', () => {
  it('creates type implementing a protocol', () => {
    const result = runModule(`
      (defprotocol IGreet
        (greet [this]))
      (deftype Greeter [name]
        IGreet
        (greet [this] (str "Hello, " (.-name this))))
      (greet (Greeter. "World"))
    `);
    expect(result).toBe('Hello, World');
  });

  it('multi-method protocol', () => {
    const result = runModule(`
      (defprotocol IShape
        (area [this])
        (perimeter [this]))
      (deftype Circle [radius]
        IShape
        (area [this] (js* "Math.PI * this.radius * this.radius"))
        (perimeter [this] (js* "2 * Math.PI * this.radius")))
      (let [c (Circle. 1)]
        (js* "Math.round(area(c) * 100) / 100"))
    `);
    expect(result).toBeCloseTo(3.14, 1);
  });
});

// ── reify ──

describe('reify edge cases', () => {
  it('reify creates inline protocol implementation', () => {
    const result = runModule(`
      (defprotocol IFoo
        (foo [this]))
      (let [x (reify IFoo (foo [this] 42))]
        (foo x))
    `);
    expect(result).toBe(42);
  });

  it('reify with method taking args', () => {
    const result = runModule(`
      (defprotocol ICalc
        (compute [this x y]))
      (let [calc (reify ICalc (compute [this x y] (+ x y)))]
        (compute calc 10 20))
    `);
    expect(result).toBe(30);
  });
});

// ── extend-type ──

describe('extend-type edge cases', () => {
  it('extends JS built-in type with protocol', () => {
    const result = runModule(`
      (defprotocol ILen
        (len [this]))
      (extend-type js/String
        ILen
        (len [this] (.-length this)))
      (len "hello")
    `);
    expect(result).toBe(5);
  });

  it('extends js/Array with protocol', () => {
    const result = runModule(`
      (defprotocol ISize
        (size [this]))
      (extend-type js/Array
        ISize
        (size [this] (.-length this)))
      (size (js* "[1,2,3]"))
    `);
    expect(result).toBe(3);
  });
});

// ── protocolFn dispatch ──

describe('protocol dispatch edge cases', () => {
  it('throws on nil target', () => {
    expect(() => runModule(`
      (defprotocol IFoo
        (foo [this]))
      (foo nil)
    `)).toThrow();
  });

  it('throws on missing implementation', () => {
    expect(() => runModule(`
      (defprotocol IFoo
        (foo [this]))
      (foo (js* "{}"))
    `)).toThrow();
  });
});

// ── deftype fields ──

describe('deftype field access', () => {
  it('accesses fields via .-', () => {
    const result = runModule(`
      (deftype Point [x y])
      (let [p (Point. 10 20)]
        (+ (.-x p) (.-y p)))
    `);
    expect(result).toBe(30);
  });
});
