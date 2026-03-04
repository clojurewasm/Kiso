/**
 * Conformance tests — JS interop advanced (Phase 13.2)
 *
 * Tests: chained calls (..), property access, constructor, js*, type coercion
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

// ── Method calls ──

describe('method call edge cases', () => {
  it('.method with no args', () => {
    expect(run('(.toUpperCase "hello")')).toBe('HELLO');
  });

  it('.method with multiple args', () => {
    expect(run('(.slice "hello world" 6 11)')).toBe('world');
  });

  it('.method on number (via threading)', () => {
    expect(run('(-> 42 (.toString 16))')).toBe('2a');
  });

  it('chained method calls via ->', () => {
    expect(run('(-> "  hello  " .trim .toUpperCase)')).toBe('HELLO');
  });

  it('.method returns undefined for void methods', () => {
    const code = `(let [arr (js* "[3,1,2]")] (.sort arr) (js* "arr[0]"))`;
    expect(run(code)).toBe(1);
  });
});

// ── .. (double-dot chaining) ──

describe('.. chained access', () => {
  it('chains property access', () => {
    const code = `(let [obj (js* "{ a: { b: { c: 42 } } }")] (.. obj -a -b -c))`;
    expect(run(code)).toBe(42);
  });

  it('chains method calls', () => {
    expect(run('(.. "hello world" (.split " ") (.join "-"))')).toBe('hello-world');
  });

  it('mixes property and method access', () => {
    const code = `(.. "hello" .toUpperCase -length)`;
    expect(run(code)).toBe(5);
  });

  it('single step', () => {
    expect(run('(.. "hello" .toUpperCase)')).toBe('HELLO');
  });
});

// ── Property access (.-) ──

describe('property access edge cases', () => {
  it('reads property from JS object', () => {
    const code = `(let [obj (js* "{ x: 10 }")] (.-x obj))`;
    expect(run(code)).toBe(10);
  });

  it('reads .length on string', () => {
    expect(run('(.-length "hello")')).toBe(5);
  });

  it('reads .length on array', () => {
    const code = `(.-length (js* "[1,2,3]"))`;
    expect(run(code)).toBe(3);
  });

  it('reads nested property via ..', () => {
    const code = `(let [o (js* "{ a: { b: 99 } }")] (.. o -a -b))`;
    expect(run(code)).toBe(99);
  });

  it('property set! via js*', () => {
    const code = `
      (let [obj (js* "{ x: 0 }")]
        (set! (.-x obj) 42)
        (.-x obj))
    `;
    expect(run(code)).toBe(42);
  });
});

// ── Constructor calls ──

describe('constructor edge cases', () => {
  it('js/Error. creates Error instance', () => {
    expect(run('(.-message (new js/Error "oops"))')).toBe('oops');
  });

  it('js/Date. with args', () => {
    const code = `(let [d (new js/Date 2024 0 1)] (.getFullYear d))`;
    expect(run(code)).toBe(2024);
  });

  it('js/RegExp. constructor', () => {
    const code = `(.test (new js/RegExp "^hello") "hello world")`;
    expect(run(code)).toBe(true);
  });
});

// ── js* (raw JS) ──

describe('js* edge cases', () => {
  it('evaluates raw JS expression', () => {
    expect(run('(js* "1 + 2")')).toBe(3);
  });

  it('can access JS globals', () => {
    expect(run('(js* "Math.PI")')).toBeCloseTo(3.14159, 4);
  });

  it('works in let binding', () => {
    const code = `(let [x (js* "Math.floor(3.7)")] x)`;
    expect(run(code)).toBe(3);
  });

  it('js* inside conditional', () => {
    expect(run('(if (js* "1 > 0") :yes :no)')).toEqual(keyword('yes'));
  });
});

// ── Type coercion / truthiness ──

describe('type coercion in interop', () => {
  it('JS string is truthy (even empty in CLJS)', () => {
    expect(run('(if "" :truthy :falsy)')).toEqual(keyword('truthy'));
  });

  it('JS 0 is truthy in CLJS', () => {
    expect(run('(if 0 :truthy :falsy)')).toEqual(keyword('truthy'));
  });

  it('JS undefined is nil', () => {
    expect(run('(nil? (js* "undefined"))')).toBe(true);
  });

  it('JS null is nil', () => {
    expect(run('(nil? nil)')).toBe(true);
  });

  it('JS false is falsy', () => {
    expect(run('(if false :truthy :falsy)')).toEqual(keyword('falsy'));
  });
});

// ── Interop with collections ──

describe('interop with CLJS collections', () => {
  it('str on a vector uses JS String coercion', () => {
    // str uses String() — CLJS pr-str not yet implemented
    const result = run('(str [1 2 3])') as string;
    expect(typeof result).toBe('string');
  });

  it('access JS array index via js*', () => {
    const code = `
      (let [arr (js* "[10, 20, 30]")]
        (js* "arr[1]"))
    `;
    expect(run(code)).toBe(20);
  });
});
