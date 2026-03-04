/**
 * Tests for `for` and `doseq` macro compilation.
 */
import { describe, it, expect } from 'vitest';
import { readStr } from '../../src/reader/reader.js';
import { Analyzer } from '../../src/analyzer/analyzer.js';
import { emit } from '../../src/codegen/emitter.js';
import { vector } from '../../src/runtime/vector.js';
import { keyword } from '../../src/runtime/keyword.js';
import { hashMap } from '../../src/runtime/hash-map.js';
import { hashSet } from '../../src/runtime/hash-set.js';
import { list, EMPTY_LIST } from '../../src/runtime/list.js';
import { symbol as runtimeSymbol } from '../../src/runtime/symbol.js';
import { seq, first, next as seqNext } from '../../src/runtime/seq.js';
import { defprotocol, protocolFn } from '../../src/runtime/protocols.js';
import {
  truthy, add, subtract, multiply, nil_p, not, str, get, count,
  eq, lt, gt, lte, gte, conj, map, filter, reduce,
} from '../../src/runtime/core.js';

const analyzer = new Analyzer();

const runtime: Record<string, unknown> = {
  vector, keyword, hashMap, hashSet, list, EMPTY_LIST,
  symbol: runtimeSymbol, seq, first, next: seqNext,
  defprotocol, protocolFn,
  truthy, add, subtract, multiply, nil_p, not, str, get, count,
  eq, lt, gt, lte, gte, conj, map, filter, reduce,
};
const runtimeKeys = Object.keys(runtime);
const runtimeVals = Object.values(runtime);

function compile(source: string): string {
  const form = readStr(source);
  if (!form) throw new Error('Expected form');
  const node = analyzer.analyze(form);
  return emit(node);
}

function run(source: string): unknown {
  const js = compile(source);
  // eslint-disable-next-line no-new-func -- test-only: evaluating compiler output
  const fn = new Function(...runtimeKeys, `return ${js}`);
  return fn(...runtimeVals);
}

// ── doseq ──

describe('doseq', () => {
  it('iterates over collection for side effects', () => {
    const code = `
      (let [result (js* "{ value: '' }")]
        (doseq [x [1 2 3]]
          (js* "result.value += String(x)"))
        (js* "result.value"))
    `;
    expect(run(code)).toBe('123');
  });

  it('returns nil', () => {
    const code = `(doseq [x [1 2 3]] x)`;
    expect(run(code)).toBe(null);
  });

  it('handles nested bindings', () => {
    const code = `
      (let [result (js* "{ value: '' }")]
        (doseq [x [1 2] y [3 4]]
          (js* "result.value += String(x) + String(y) + ' '"))
        (js* "result.value"))
    `;
    expect(run(code)).toBe('13 14 23 24 ');
  });

  it('handles :when modifier', () => {
    const code = `
      (let [result (js* "{ value: '' }")]
        (doseq [x [1 2 3 4 5] :when (js* "x % 2 === 1")]
          (js* "result.value += String(x)"))
        (js* "result.value"))
    `;
    expect(run(code)).toBe('135');
  });

  it('handles :let modifier', () => {
    const code = `
      (let [result (js* "{ value: '' }")]
        (doseq [x [1 2 3] :let [y (+ x 10)]]
          (js* "result.value += String(y) + ' '"))
        (js* "result.value"))
    `;
    expect(run(code)).toBe('11 12 13 ');
  });

  it('handles :while modifier', () => {
    const code = `
      (let [result (js* "{ value: '' }")]
        (doseq [x [1 2 3 4 5] :while (< x 4)]
          (js* "result.value += String(x)"))
        (js* "result.value"))
    `;
    expect(run(code)).toBe('123');
  });

  it('handles empty collection', () => {
    const code = `
      (let [result (js* "{ value: 'init' }")]
        (doseq [x []]
          (js* "result.value = 'changed'"))
        (js* "result.value"))
    `;
    expect(run(code)).toBe('init');
  });
});

// ── for ──

describe('for', () => {
  it('simple list comprehension', () => {
    const code = `(for [x [1 2 3]] (+ x 10))`;
    const result = run(code) as any;
    expect(first(result)).toBe(11);
    expect(first(seqNext(result))).toBe(12);
    expect(first(seqNext(seqNext(result)))).toBe(13);
  });

  it('nested bindings produce cartesian product', () => {
    const code = `(for [x [1 2] y [3 4]] (+ x y))`;
    const result = run(code) as any;
    // 1+3=4, 1+4=5, 2+3=5, 2+4=6
    expect(first(result)).toBe(4);
    expect(first(seqNext(result))).toBe(5);
    expect(first(seqNext(seqNext(result)))).toBe(5);
    expect(first(seqNext(seqNext(seqNext(result))))).toBe(6);
  });

  it(':when filters results', () => {
    const code = `(for [x [1 2 3 4 5] :when (js* "x % 2 === 1")] x)`;
    const result = run(code) as any;
    expect(first(result)).toBe(1);
    expect(first(seqNext(result))).toBe(3);
    expect(first(seqNext(seqNext(result)))).toBe(5);
  });

  it(':let introduces local bindings', () => {
    const code = `(for [x [1 2 3] :let [y (* x x)]] y)`;
    const result = run(code) as any;
    expect(first(result)).toBe(1);
    expect(first(seqNext(result))).toBe(4);
    expect(first(seqNext(seqNext(result)))).toBe(9);
  });

  it(':while terminates early', () => {
    const code = `(for [x [1 2 3 4 5] :while (< x 4)] x)`;
    const result = run(code) as any;
    expect(first(result)).toBe(1);
    expect(first(seqNext(result))).toBe(2);
    expect(first(seqNext(seqNext(result)))).toBe(3);
    expect(seqNext(seqNext(seqNext(result)))).toBe(null);
  });

  it('empty collection returns empty', () => {
    const code = `(for [x []] x)`;
    const result = run(code) as any;
    // Empty for should return empty list/vector
    expect(seq(result)).toBe(null);
  });
});
