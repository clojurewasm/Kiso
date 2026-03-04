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
import { get, count } from '../../src/runtime/core.js';

const analyzer = new Analyzer();

// Runtime functions injected into compiled code evaluation context.
// new Function() is safe here: only compiler-generated code from controlled test inputs is evaluated.
const runtime: Record<string, unknown> = {
  vector, keyword, hashMap, hashSet, list, EMPTY_LIST,
  symbol: runtimeSymbol, seq, first, next: seqNext, get, count,
};
const runtimeKeys = Object.keys(runtime);
const runtimeVals = Object.values(runtime);

function compile(source: string): string {
  const form = readStr(source);
  if (!form) throw new Error('Expected form');
  const node = analyzer.analyze(form);
  return emit(node);
}

/** Evaluate compiler output in a sandbox with runtime injected. Test-only. */
function run(source: string): unknown {
  const js = compile(source);
  // eslint-disable-next-line no-new-func -- test-only: evaluating our own compiler output
  const fn = new Function(...runtimeKeys, `return ${js}`);
  return fn(...runtimeVals);
}

// -- Sequential destructuring --

describe('sequential destructuring', () => {
  it('basic positional [a b]', () => {
    expect(run('(let [[a b] [1 2]] a)')).toBe(1);
    expect(run('(let [[a b] [1 2]] b)')).toBe(2);
  });

  it('more bindings than values', () => {
    expect(run('(let [[a b c] [1 2]] c)')).toBe(null);
  });

  it('rest binding [a & rest]', () => {
    const rest = run('(let [[a & rest] [1 2 3]] rest)');
    // rest should be a seq over [2, 3]
    expect(first(rest)).toBe(2);
    expect(first(seqNext(rest))).toBe(3);
  });

  it(':as binding', () => {
    const v = run('(let [[a b :as all] [10 20]] all)');
    expect(count(v)).toBe(2);
  });

  it('rest + :as combined', () => {
    expect(run('(let [[a & r :as all] [1 2 3]] a)')).toBe(1);
  });

  it('nested sequential', () => {
    expect(run('(let [[[a b] c] [[1 2] 3]] a)')).toBe(1);
    expect(run('(let [[[a b] c] [[1 2] 3]] c)')).toBe(3);
  });
});

// -- Associative destructuring --

describe('associative destructuring', () => {
  it(':keys shorthand', () => {
    expect(run('(let [{:keys [a b]} {:a 1 :b 2}] a)')).toBe(1);
    expect(run('(let [{:keys [a b]} {:a 1 :b 2}] b)')).toBe(2);
  });

  it(':or defaults', () => {
    expect(run('(let [{:keys [a b] :or {b 99}} {:a 1}] b)')).toBe(99);
  });

  it(':as whole map', () => {
    const m = run('(let [{:keys [a] :as m} {:a 1 :b 2}] m)') as PersistentHashMap;
    expect(m.count).toBe(2);
  });

  it('explicit key binding {x :x}', () => {
    expect(run('(let [{x :x y :y} {:x 1 :y 2}] x)')).toBe(1);
  });
});

// -- fn param destructuring --

describe('fn param destructuring', () => {
  it('vector param in fn', () => {
    expect(run('((fn [[a b]] a) [10 20])')).toBe(10);
  });

  it('map param in fn', () => {
    expect(run('((fn [{:keys [x]}] x) {:x 42})')).toBe(42);
  });
});
