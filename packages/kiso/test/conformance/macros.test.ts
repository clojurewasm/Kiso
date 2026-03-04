/**
 * Conformance tests — Multi-arity, variadic, complex patterns (Phase 13.5-13.7)
 *
 * Tests: multi-arity + variadic + destructuring, case/cond, letfn mutual recursion
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
  eq, lt, gt, lte, gte,
} from '../../src/runtime/core.js';

const analyzer = new Analyzer();

const runtime: Record<string, unknown> = {
  vector, keyword, hashMap, hashSet, list, EMPTY_LIST,
  symbol: runtimeSymbol, seq, first, next: seqNext,
  defprotocol, protocolFn,
  truthy, add, subtract, multiply, nil_p, not, str, get, count,
  eq, lt, gt, lte, gte,
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

// ── Multi-arity functions ──

describe('multi-arity edge cases', () => {
  it('dispatches to correct arity', () => {
    const code = `
      (let [f (fn ([x] x)
                  ([x y] (+ x y))
                  ([x y z] (+ x y z)))]
        [(f 1) (f 2 3) (f 4 5 6)])
    `;
    const result = run(code) as any;
    expect(first(result)).toBe(1);
    expect(first(seqNext(result))).toBe(5);
    expect(first(seqNext(seqNext(result)))).toBe(15);
  });

  it('0-arity', () => {
    expect(run('((fn ([] 42)))')).toBe(42);
  });

  it('multi-arity with different bodies', () => {
    const code = `
      (let [f (fn ([x] (str "one: " x))
                  ([x y] (str "two: " x " " y)))]
        (f "hello"))
    `;
    expect(run(code)).toBe('one: hello');
  });
});

// ── Variadic functions ──

describe('variadic edge cases', () => {
  it('variadic collects extra args', () => {
    const code = `
      (let [f (fn [x & rest] (first rest))]
        (f 1 2 3))
    `;
    expect(run(code)).toBe(2);
  });

  it('variadic with no extra args gives empty JS array', () => {
    // In CLJS, rest is nil when empty; our impl gives JS [] (empty array)
    const code = `
      (let [f (fn [x & rest] (.-length rest))]
        (f 1))
    `;
    expect(run(code)).toBe(0);
  });

  it('multi-arity with variadic arity', () => {
    const code = `
      (let [f (fn ([x] (str "one: " x))
                  ([x y & more] (str "many: " x)))]
        [(f "a") (f "b" "c" "d")])
    `;
    const result = run(code) as any;
    expect(first(result)).toBe('one: a');
    expect(first(seqNext(result))).toBe('many: b');
  });
});

// ── Complex case patterns ──

describe('case edge cases', () => {
  it('matches keyword constants', () => {
    const code = `(case :b :a 1 :b 2 :c 3 :default)`;
    expect(run(code)).toBe(2);
  });

  it('falls through to default', () => {
    expect(run('(case :z :a 1 :b 2 :not-found)')).toEqual(keyword('not-found'));
  });

  it('matches nil', () => {
    expect(run('(case nil nil :nil-match :other)')).toEqual(keyword('nil-match'));
  });

  it('matches integer', () => {
    expect(run('(case 2 1 :one 2 :two 3 :three :default)')).toEqual(keyword('two'));
  });

  it('matches string', () => {
    expect(run('(case "b" "a" 1 "b" 2 :default)')).toBe(2);
  });
});

// ── Complex cond patterns ──

describe('cond edge cases', () => {
  it('matches first truthy', () => {
    const code = `(cond false :a true :b true :c)`;
    expect(run(code)).toEqual(keyword('b'));
  });

  it('falls through to :else', () => {
    const code = `(cond false :a false :b :else :c)`;
    expect(run(code)).toEqual(keyword('c'));
  });

  it('returns nil when nothing matches', () => {
    expect(run('(cond false :a false :b)')).toBe(null);
  });

  it('evaluates test expressions', () => {
    const code = `(cond (= 1 2) :wrong (= 1 1) :right)`;
    expect(run(code)).toEqual(keyword('right'));
  });
});

// ── letfn mutual recursion ──

describe('letfn mutual recursion', () => {
  it('basic mutual recursion', () => {
    const code = `
      (letfn [(even? [n] (if (js* "n === 0") true (odd? (js* "n - 1"))))
              (odd? [n] (if (js* "n === 0") false (even? (js* "n - 1"))))]
        [(even? 4) (odd? 3)])
    `;
    const result = run(code) as any;
    expect(first(result)).toBe(true);
    expect(first(seqNext(result))).toBe(true);
  });

  it('letfn with single function', () => {
    const code = `
      (letfn [(fact [n] (if (js* "n <= 1") 1 (js* "n * fact(n - 1)")))]
        (fact 5))
    `;
    expect(run(code)).toBe(120);
  });

  it('letfn functions can call each other', () => {
    const code = `
      (letfn [(a [x] (if (> x 0) (b (- x 1)) :done))
              (b [x] (a x))]
        (a 3))
    `;
    expect(run(code)).toEqual(keyword('done'));
  });
});

// ── condp ──

describe('condp edge cases', () => {
  it('matches with = predicate', () => {
    const code = `
      (let [eq (fn [a b] (js* "a === b"))]
        (condp eq 2 1 :one 2 :two :default))
    `;
    expect(run(code)).toEqual(keyword('two'));
  });

  it('falls through to default', () => {
    const code = `
      (let [eq (fn [a b] (js* "a === b"))]
        (condp eq 99 1 :one 2 :two :default))
    `;
    expect(run(code)).toEqual(keyword('default'));
  });
});

// ── when/when-not/if-not ──

describe('conditional macro edge cases', () => {
  it('when executes body on truthy', () => {
    expect(run('(when true :yes)')).toEqual(keyword('yes'));
  });

  it('when returns nil on falsy', () => {
    expect(run('(when false :yes)')).toBe(null);
  });

  it('when-not returns body on falsy', () => {
    expect(run('(when-not false :yes)')).toEqual(keyword('yes'));
  });

  it('if-not inverts test', () => {
    expect(run('(if-not true :then :else)')).toEqual(keyword('else'));
  });

  it('if-let with truthy binding', () => {
    expect(run('(if-let [x 42] x :none)')).toBe(42);
  });

  it('if-let with nil binding', () => {
    expect(run('(if-let [x nil] x :none)')).toEqual(keyword('none'));
  });

  it('when-let with truthy', () => {
    expect(run('(when-let [x 10] (+ x 1))')).toBe(11);
  });

  it('when-let with nil', () => {
    expect(run('(when-let [x nil] (+ x 1))')).toBe(null);
  });
});

// ── dotimes ──

describe('dotimes edge cases', () => {
  it('executes body n times', () => {
    const code = `
      (let [result (js* "{ value: '' }")]
        (dotimes [i 3]
          (js* "result.value += String(i)"))
        (js* "result.value"))
    `;
    expect(run(code)).toBe('012');
  });

  it('0 times does nothing', () => {
    const code = `
      (let [result (js* "{ value: 'init' }")]
        (dotimes [i 0]
          (js* "result.value = 'changed'"))
        (js* "result.value"))
    `;
    expect(run(code)).toBe('init');
  });
});

// ── while ──

describe('while macro', () => {
  it('loops while condition is truthy', () => {
    const code = `
      (let [state (js* "{ n: 0 }")]
        (while (js* "state.n < 5")
          (js* "state.n++"))
        (js* "state.n"))
    `;
    expect(run(code)).toBe(5);
  });

  it('skips body when condition is initially false', () => {
    const code = `
      (let [state (js* "{ n: 10 }")]
        (while (js* "state.n < 5")
          (js* "state.n++"))
        (js* "state.n"))
    `;
    expect(run(code)).toBe(10);
  });
});

// ── or/and ──

describe('or/and edge cases', () => {
  it('or returns first truthy', () => {
    expect(run('(or nil false 42 99)')).toBe(42);
  });

  it('or returns last value when all falsy', () => {
    expect(run('(or nil false)')).toBe(false);
  });

  it('and returns last value when all truthy', () => {
    expect(run('(and 1 2 3)')).toBe(3);
  });

  it('and short-circuits on falsy', () => {
    expect(run('(and 1 nil 3)')).toBe(null);
  });

  it('and with no args returns true', () => {
    expect(run('(and)')).toBe(true);
  });

  it('or with no args returns nil', () => {
    expect(run('(or)')).toBe(null);
  });
});
