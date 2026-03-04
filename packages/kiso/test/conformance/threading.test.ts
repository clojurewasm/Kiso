/**
 * Conformance tests — Threading macro edge cases (Phase 13.1)
 *
 * Tests edge cases for: -> ->> as-> some-> some->> cond-> cond->> doto
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
import { defprotocol, protocolFn } from '../../src/runtime/protocols.js';
import {
  truthy, add, subtract, multiply, nil_p, not, str,
} from '../../src/runtime/core.js';

const analyzer = new Analyzer();

const runtime: Record<string, unknown> = {
  vector, keyword, hashMap, hashSet, list, EMPTY_LIST,
  symbol: runtimeSymbol,
  defprotocol, protocolFn,
  truthy, add, subtract, multiply, nil_p, not, str,
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

// ── -> (thread-first) ──

describe('-> edge cases', () => {
  it('identity with no steps', () => {
    expect(run('(-> 42)')).toBe(42);
  });

  it('deeply nested threading', () => {
    // (-> 1 (+ 2) (+ 3) (+ 4)) → (+ (+ (+ 1 2) 3) 4) → 10
    expect(run('(-> 1 (+ 2) (+ 3) (+ 4))')).toBe(10);
  });

  it('threads into method calls', () => {
    expect(run('(-> "hello" .toUpperCase)')).toBe('HELLO');
  });

  it('threads with interop method + args', () => {
    expect(run('(-> "hello world" (.slice 6))')).toBe('world');
  });

  it('threads nil safely (no short-circuit)', () => {
    expect(run('(-> nil str)')).toBe('');
  });

  it('nested -> expressions', () => {
    expect(run('(-> (-> 1 (+ 2)) (+ 3))')).toBe(6);
  });
});

// ── ->> (thread-last) ──

describe('->> edge cases', () => {
  it('identity with no steps', () => {
    expect(run('(->> 42)')).toBe(42);
  });

  it('threads as last argument', () => {
    // (->> 5 (- 10)) → (- 10 5) → 5
    expect(run('(->> 5 (- 10))')).toBe(5);
  });

  it('multiple steps thread-last', () => {
    expect(run('(->> 1 (+ 2) (+ 3))')).toBe(6);
  });

  it('threads with string methods', () => {
    expect(run('(->> "hello" (.concat "world "))')).toBe('world hello');
  });
});

// ── as-> ──

describe('as-> edge cases', () => {
  it('basic named threading', () => {
    expect(run('(as-> 1 x (+ x 2) (+ x 3))')).toBe(6);
  });

  it('placeholder used in varying positions', () => {
    // (as-> 10 $ (- $ 3) (- 100 $)) → (- 100 (- 10 3)) → 93
    expect(run('(as-> 10 $ (- $ 3) (- 100 $))')).toBe(93);
  });

  it('single step', () => {
    expect(run('(as-> 5 x (+ x 10))')).toBe(15);
  });

  it('no steps returns init', () => {
    expect(run('(as-> 42 x)')).toBe(42);
  });

  it('complex binding with interop', () => {
    expect(run('(as-> "hello" s (.toUpperCase s) (.concat s "!"))')).toBe('HELLO!');
  });
});

// ── some-> ──

describe('some-> edge cases', () => {
  it('propagates non-nil through steps', () => {
    expect(run('(some-> 1 (+ 2) (+ 3))')).toBe(6);
  });

  it('returns nil when initial value is nil', () => {
    expect(run('(some-> nil (+ 1))')).toBe(null);
  });

  it('0 is not nil in some->', () => {
    // 0 is falsy in JS but NOT nil — some-> should continue
    expect(run('(some-> 5 (- 5) (+ 10))')).toBe(10);
  });

  it('false is not nil in some->', () => {
    expect(run('(some-> true not not)')).toBe(true);
  });

  it('nil initial returns nil immediately', () => {
    expect(run('(some-> nil str)')).toBe(null);
  });

  it('no steps returns init', () => {
    expect(run('(some-> 42)')).toBe(42);
  });
});

// ── some->> ──

describe('some->> edge cases', () => {
  it('propagates non-nil through steps', () => {
    expect(run('(some->> 5 (- 10))')).toBe(5);
  });

  it('returns nil when initial is nil', () => {
    expect(run('(some->> nil (+ 1))')).toBe(null);
  });

  it('0 is not nil in some->>', () => {
    expect(run('(some->> 10 (- 10) (+ 5))')).toBe(5);
  });

  it('no steps returns init', () => {
    expect(run('(some->> 99)')).toBe(99);
  });
});

// ── cond-> ──

describe('cond-> edge cases', () => {
  it('applies step when test is truthy', () => {
    expect(run('(cond-> 1 true (+ 10))')).toBe(11);
  });

  it('skips step when test is falsy', () => {
    expect(run('(cond-> 1 false (+ 10))')).toBe(1);
  });

  it('multiple pairs, mixed conditions', () => {
    expect(run('(cond-> 0 true (+ 1) false (+ 10) true (+ 100))')).toBe(101);
  });

  it('threads as first arg', () => {
    expect(run('(cond-> 10 true (- 3))')).toBe(7);
  });

  it('no pairs returns expr unchanged', () => {
    expect(run('(cond-> 42)')).toBe(42);
  });

  it('nil test is falsy', () => {
    expect(run('(cond-> 1 nil (+ 10))')).toBe(1);
  });

  it('0 is truthy in CLJS semantics', () => {
    // In CLJS only nil and false are falsy; 0 is truthy
    expect(run('(cond-> 1 0 (+ 10))')).toBe(11);
  });

  it('works with interop methods', () => {
    expect(run('(cond-> 1 true (.toString))')).toBe('1');
  });
});

// ── cond->> ──

describe('cond->> edge cases', () => {
  it('threads as last arg when test truthy', () => {
    expect(run('(cond->> 5 true (- 10))')).toBe(5);
  });

  it('skips when test falsy', () => {
    expect(run('(cond->> 5 false (- 10))')).toBe(5);
  });

  it('multiple pairs', () => {
    expect(run('(cond->> 1 true (+ 2) false (+ 100) true (+ 3))')).toBe(6);
  });

  it('no pairs returns expr unchanged', () => {
    expect(run('(cond->> 42)')).toBe(42);
  });
});

// ── doto ──

describe('doto edge cases', () => {
  it('returns original object after side effects', () => {
    const code = `
      (let [obj (js* "{ x: 1, set(v) { this.x = v; } }")]
        (doto obj (.set 42))
        (.-x obj))
    `;
    expect(run(code)).toBe(42);
  });

  it('returns the object not the method result', () => {
    const code = `
      (let [obj (js* "{ val: 0, inc() { this.val++; return 'ignored'; } }")]
        (doto obj (.inc))
        (.-val obj))
    `;
    expect(run(code)).toBe(1);
  });
});

// ── mixed/combined ──

describe('combined threading patterns', () => {
  it('-> inside ->>', () => {
    expect(run('(->> (-> 1 (+ 2)) (+ 10))')).toBe(13);
  });

  it('->> inside ->', () => {
    expect(run('(-> (->> 1 (+ 2)) (+ 10))')).toBe(13);
  });

  it('as-> with interop in varying positions', () => {
    expect(run('(as-> "abc" s (.toUpperCase s) (.concat s "def") (.-length s))')).toBe(6);
  });

  it('some-> with method chain', () => {
    expect(run('(some-> "hello" .toUpperCase (.slice 1 3))')).toBe('EL');
  });

  it('cond-> in let binding', () => {
    expect(run('(let [x (cond-> 10 true (+ 5) false (* 2))] x)')).toBe(15);
  });
});
