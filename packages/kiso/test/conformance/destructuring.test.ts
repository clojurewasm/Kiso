/**
 * Conformance tests — Deep nested destructuring (Phase 13.3)
 *
 * Tests: combined :or + :as + &, nested sequential+associative, fn params
 */
import { describe, it, expect } from 'vitest';
import { readStr } from '../../src/reader/reader.js';
import { Analyzer } from '../../src/analyzer/analyzer.js';
import { emit } from '../../src/codegen/emitter.js';
import { vector } from '../../src/runtime/vector.js';
import { keyword } from '../../src/runtime/keyword.js';
import { hashMap, PersistentHashMap } from '../../src/runtime/hash-map.js';
import { hashSet } from '../../src/runtime/hash-set.js';
import { list, EMPTY_LIST } from '../../src/runtime/list.js';
import { symbol as runtimeSymbol } from '../../src/runtime/symbol.js';
import { seq, first, next as seqNext } from '../../src/runtime/seq.js';
import {
  truthy, add, subtract, get, count, nil_p, str, multiply,
} from '../../src/runtime/core.js';
import { defprotocol, protocolFn } from '../../src/runtime/protocols.js';

const analyzer = new Analyzer();

const runtime: Record<string, unknown> = {
  vector, keyword, hashMap, hashSet, list, EMPTY_LIST,
  symbol: runtimeSymbol, seq, first, next: seqNext,
  defprotocol, protocolFn,
  truthy, add, subtract, get, count, nil_p, str, multiply,
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

// ── :or + :as + :keys combined ──

describe('combined :or + :as + :keys', () => {
  it(':keys + :or + :as all together', () => {
    const code = `(let [{:keys [a b c] :or {b 10 c 20} :as m} {:a 1}] [a b c])`;
    const result = run(code) as any;
    expect(first(result)).toBe(1);
    expect(first(seqNext(result))).toBe(10);
    expect(first(seqNext(seqNext(result)))).toBe(20);
  });

  it(':or defaults only apply to missing keys', () => {
    const code = `(let [{:keys [a b] :or {a 99 b 99}} {:a 1 :b 2}] (+ a b))`;
    expect(run(code)).toBe(3);
  });

  it(':or with nil value — nil key present returns nil (not default)', () => {
    // Matches CLJS: get with default only applies when key is missing, not when value is nil
    const code = `(let [{:keys [a] :or {a 42}} {:a nil}] a)`;
    expect(run(code)).toBe(null);
  });

  it(':as provides the full map', () => {
    const code = `(let [{:keys [x] :as m} {:x 1 :y 2}] (count m))`;
    expect(run(code)).toBe(2);
  });
});

// ── Nested sequential destructuring ──

describe('nested sequential destructuring', () => {
  it('deeply nested [[a [b c]] d]', () => {
    const code = `(let [[[a [b c]] d] [[1 [2 3]] 4]] (+ a b c d))`;
    expect(run(code)).toBe(10);
  });

  it('three levels deep', () => {
    const code = `(let [[[[x]]] [[[42]]]] x)`;
    expect(run(code)).toBe(42);
  });

  it('& with nested pattern', () => {
    const code = `(let [[[a b] & rest] [[1 2] 3 4]] a)`;
    expect(run(code)).toBe(1);
  });
});

// ── Nested associative destructuring ──

describe('nested associative destructuring', () => {
  it('nested map destructuring', () => {
    const code = `(let [{{:keys [x]} :inner} {:inner {:x 42}}] x)`;
    expect(run(code)).toBe(42);
  });

  it('map inside vector', () => {
    const code = `(let [[{:keys [a]} b] [{:a 10} 20]] (+ a b))`;
    expect(run(code)).toBe(30);
  });

  it('vector inside map', () => {
    const code = `(let [{[a b] :pair} {:pair [10 20]}] (+ a b))`;
    expect(run(code)).toBe(30);
  });
});

// ── & rest binding edge cases ──

describe('& rest edge cases', () => {
  it('rest is nil when nothing remains', () => {
    const code = `(let [[a b & rest] [1 2]] (nil? rest))`;
    expect(run(code)).toBe(true);
  });

  it('rest with :as', () => {
    const code = `(let [[a & rest :as all] [1 2 3]] (count all))`;
    expect(run(code)).toBe(3);
  });

  it('rest captures remaining as seq', () => {
    const code = `(let [[a & rest] [1 2 3 4]] (first rest))`;
    expect(run(code)).toBe(2);
  });
});

// ── fn parameter destructuring ──

describe('fn parameter destructuring edge cases', () => {
  it('sequential destructuring in fn params', () => {
    expect(run('((fn [[a b c]] (+ a b c)) [1 2 3])')).toBe(6);
  });

  it('map destructuring in fn params with :or', () => {
    const code = `((fn [{:keys [x y] :or {y 100}}] (+ x y)) {:x 1})`;
    expect(run(code)).toBe(101);
  });

  it('nested destructuring in fn params', () => {
    const code = `((fn [[a [b c]]] (+ a b c)) [1 [2 3]])`;
    expect(run(code)).toBe(6);
  });

  it('destructuring with multi-arity fn', () => {
    const code = `
      (let [f (fn ([x] x)
                  ([[a b]] (+ a b)))]
        (f 10))
    `;
    expect(run(code)).toBe(10);
  });
});

// ── let destructuring edge cases ──

describe('let destructuring edge cases', () => {
  it('multiple destructuring bindings in same let', () => {
    const code = `(let [[a b] [1 2] {:keys [x]} {:x 3}] (+ a b x))`;
    expect(run(code)).toBe(6);
  });

  it('destructuring with computed values', () => {
    const code = `(let [[a b] [(+ 1 2) (* 3 4)]] (+ a b))`;
    expect(run(code)).toBe(15);
  });

  it('empty vector destructuring', () => {
    const code = `(let [[] []] :ok)`;
    expect(run(code)).toEqual(keyword('ok'));
  });
});
