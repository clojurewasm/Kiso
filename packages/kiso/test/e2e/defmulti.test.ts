/**
 * Tests for defmulti/defmethod compilation.
 */
import { describe, it, expect } from 'vitest';
import { readAllStr } from '../../src/reader/reader.js';
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
import { defmultiFn } from '../../src/runtime/multifn.js';
import {
  truthy, add, subtract, multiply, nil_p, not, str, get, count,
  eq, lt, gt, lte, gte,
} from '../../src/runtime/core.js';

const analyzer = new Analyzer();

const runtime: Record<string, unknown> = {
  vector, keyword, hashMap, hashSet, list, EMPTY_LIST,
  symbol: runtimeSymbol, seq, first, next: seqNext,
  defprotocol, protocolFn, defmultiFn,
  truthy, add, subtract, multiply, nil_p, not, str, get, count,
  eq, lt, gt, lte, gte,
};
const runtimeKeys = Object.keys(runtime);
const runtimeVals = Object.values(runtime);

function runModule(source: string): unknown {
  const forms = readAllStr(source);
  const nodes = analyzer.analyzeAll(forms);
  const stmts: string[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    const isLast = i === nodes.length - 1;
    if (node.type === 'def') {
      const init = emit(node);
      stmts.push(`var ${init.replace(/^const /, '')}`);
    } else if (node.type === 'defmulti') {
      stmts.push(`var ${emit(node).replace(/^const /, '')}`);
    } else if (node.type === 'defmethod') {
      stmts.push(`${emit(node)};`);
    } else if (isLast) {
      stmts.push(`return ${emit(node)};`);
    } else {
      stmts.push(`${emit(node)};`);
    }
  }
  const js = stmts.join('\n');
  // eslint-disable-next-line no-new-func -- test-only
  const fn = new Function(...runtimeKeys, js);
  return fn(...runtimeVals);
}

describe('defmulti/defmethod', () => {
  it('dispatches on keyword', () => {
    const result = runModule(`
      (defmulti greeting :language)
      (defmethod greeting :en [m] "Hello")
      (defmethod greeting :jp [m] "こんにちは")
      (greeting {:language :en})
    `);
    expect(result).toBe('Hello');
  });

  it('dispatches to :default', () => {
    const result = runModule(`
      (defmulti greeting :language)
      (defmethod greeting :en [m] "Hello")
      (defmethod greeting :default [m] "???")
      (greeting {:language :fr})
    `);
    expect(result).toBe('???');
  });

  it('dispatches on custom function', () => {
    const result = runModule(`
      (defmulti area (fn [shape] (get shape :type)))
      (defmethod area :circle [s]
        (js* "Math.PI * s.get(keyword('radius')) * s.get(keyword('radius'))"))
      (defmethod area :rect [s]
        (* (get s :width) (get s :height)))
      (area {:type :rect :width 3 :height 4})
    `);
    expect(result).toBe(12);
  });

  it('throws on no matching method', () => {
    expect(() => runModule(`
      (defmulti foo :type)
      (defmethod foo :a [x] 1)
      (foo {:type :z})
    `)).toThrow();
  });

  it('multi-arg dispatch', () => {
    const result = runModule(`
      (defmulti combine (fn [a b] [(get a :type) (get b :type)]))
      (defmethod combine [:a :b] [a b] "a+b")
      (defmethod combine :default [a b] "other")
      (combine {:type :a} {:type :b})
    `);
    expect(result).toBe('a+b');
  });
});
