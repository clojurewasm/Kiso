import { describe, it, expect } from 'vitest';
import { readStr, readAllStr } from '../../src/reader/reader.js';
import { Analyzer } from '../../src/analyzer/analyzer.js';
import { emit, emitModule, munge } from '../../src/codegen/emitter.js';
import { vector, PersistentVector } from '../../src/runtime/vector.js';
import { keyword, Keyword } from '../../src/runtime/keyword.js';
import { hashMap, PersistentHashMap } from '../../src/runtime/hash-map.js';
import { hashSet, PersistentHashSet } from '../../src/runtime/hash-set.js';
import { list, EMPTY_LIST } from '../../src/runtime/list.js';
import { symbol as runtimeSymbol } from '../../src/runtime/symbol.js';
import { defprotocol, protocolFn } from '../../src/runtime/protocols.js';

const analyzer = new Analyzer();

// Runtime functions available to compiled code
const runtime: Record<string, unknown> = {
  vector, keyword, hashMap, hashSet, list, EMPTY_LIST,
  symbol: runtimeSymbol,
  defprotocol, protocolFn,
};
const runtimeKeys = Object.keys(runtime);
const runtimeVals = Object.values(runtime);

/** Compile a single expression to JS. */
function compile(source: string): string {
  const form = readStr(source);
  if (!form) throw new Error('Expected form');
  const node = analyzer.analyze(form);
  return emit(node);
}

/** Compile a full module to JS. */
function compileModule(source: string): string {
  const forms = readAllStr(source);
  const nodes = analyzer.analyzeAll(forms);
  return emitModule(nodes);
}

/**
 * Compile and evaluate a single Clojure expression.
 * Runtime functions are injected as parameters.
 */
function run(source: string): unknown {
  const js = compile(source);
  // eslint-disable-next-line no-new-func -- test-only: evaluating our own compiler output
  const fn = new Function(...runtimeKeys, `return ${js}`);
  return fn(...runtimeVals);
}

// -- Literals --

describe('literal compilation', () => {
  it('compiles nil', () => {
    expect(compile('nil')).toBe('null');
    expect(run('nil')).toBe(null);
  });

  it('compiles booleans', () => {
    expect(compile('true')).toBe('true');
    expect(compile('false')).toBe('false');
    expect(run('true')).toBe(true);
  });

  it('compiles integers', () => {
    expect(compile('42')).toBe('42');
    expect(run('42')).toBe(42);
  });

  it('compiles floats', () => {
    expect(compile('3.14')).toBe('3.14');
  });

  it('compiles strings', () => {
    expect(compile('"hello"')).toBe('"hello"');
    expect(run('"hello"')).toBe('hello');
  });

  it('compiles keywords to runtime Keyword', () => {
    expect(compile(':foo')).toBe('keyword("foo")');
    const k = run(':foo');
    expect(k).toBeInstanceOf(Keyword);
    expect((k as Keyword).name).toBe('foo');
  });

  it('compiles namespaced keywords', () => {
    expect(compile(':ns/foo')).toBe('keyword("foo", "ns")');
    const k = run(':ns/foo') as Keyword;
    expect(k.ns).toBe('ns');
    expect(k.name).toBe('foo');
  });

  it('compiles vectors to PersistentVector', () => {
    expect(compile('[1 2 3]')).toBe('vector(1, 2, 3)');
    const v = run('[1 2 3]');
    expect(v).toBeInstanceOf(PersistentVector);
    expect((v as PersistentVector).count).toBe(3);
    expect((v as PersistentVector).nth(0)).toBe(1);
  });

  it('compiles empty vector', () => {
    expect(compile('[]')).toBe('vector()');
    const v = run('[]') as PersistentVector;
    expect(v.count).toBe(0);
  });

  it('compiles maps to PersistentHashMap', () => {
    expect(compile('{:a 1 :b 2}')).toBe('hashMap(keyword("a"), 1, keyword("b"), 2)');
    const m = run('{:a 1}') as PersistentHashMap;
    expect(m).toBeInstanceOf(PersistentHashMap);
    expect(m.count).toBe(1);
  });

  it('compiles sets to PersistentHashSet', () => {
    expect(compile('#{1 2 3}')).toBe('hashSet(1, 2, 3)');
    const s = run('#{1 2}') as PersistentHashSet;
    expect(s).toBeInstanceOf(PersistentHashSet);
    expect(s.count).toBe(2);
  });
});

// -- if --

describe('if compilation', () => {
  it('compiles if with truthiness', () => {
    expect(run('(if true 1 2)')).toBe(1);
    expect(run('(if false 1 2)')).toBe(2);
    expect(run('(if nil 1 2)')).toBe(2);
  });

  it('Clojure truthiness: 0 is truthy', () => {
    expect(run('(if 0 "yes" "no")')).toBe('yes');
  });

  it('Clojure truthiness: empty string is truthy', () => {
    expect(run('(if "" "yes" "no")')).toBe('yes');
  });
});

// -- do --

describe('do compilation', () => {
  it('returns last expression', () => {
    expect(run('(do 1 2 3)')).toBe(3);
  });
});

// -- let --

describe('let compilation', () => {
  it('binds and uses locals', () => {
    expect(run('(let [x 10] x)')).toBe(10);
  });

  it('binds multiple values', () => {
    expect(run('(let [x 1 y 2] y)')).toBe(2);
  });

  it('later bindings see earlier ones', () => {
    expect(run('(let [x 10 y x] y)')).toBe(10);
  });
});

// -- fn --

describe('fn compilation', () => {
  it('compiles and calls anonymous fn', () => {
    expect(run('((fn [x] x) 42)')).toBe(42);
  });

  it('compiles fn with multiple params', () => {
    const js = compile('(fn [x y] y)');
    expect(js).toContain('function');
  });
});

// -- def --

describe('def compilation', () => {
  it('compiles def as const', () => {
    const js = compile('(def x 42)');
    expect(js).toContain('const x = 42');
  });
});

// -- defn (macro → def + fn*) --

describe('defn compilation', () => {
  it('compiles defn to function', () => {
    const js = compile('(defn greet [name] name)');
    expect(js).toContain('const greet');
    expect(js).toContain('function');
  });
});

// -- when (macro → if) --

describe('when compilation', () => {
  it('compiles when to if', () => {
    expect(run('(when true 42)')).toBe(42);
    expect(run('(when false 42)')).toBe(null);
  });
});

// -- threading macros --

describe('threading compilation', () => {
  it('-> threads through calls', () => {
    expect(run('(-> 1)')).toBe(1);
  });
});

// -- interop --

describe('interop compilation', () => {
  it('compiles .method calls', () => {
    const js = compile('(.toUpperCase "hello")');
    expect(js).toBe('"hello".toUpperCase()');
  });

  it('compiles .method with args', () => {
    const js = compile('(.indexOf "hello" "l")');
    expect(js).toBe('"hello".indexOf("l")');
  });

  it('compiles Ctor. calls', () => {
    const js = compile('(Date. 2024)');
    expect(js).toContain('new Date');
  });
});

// -- name munging --

describe('name munging', () => {
  it('munges hyphens to underscores', () => {
    expect(munge('my-fn')).toBe('my_fn');
  });

  it('munges special chars', () => {
    expect(munge('nil?')).toBe('nil_QMARK_');
    expect(munge('swap!')).toBe('swap_BANG_');
    expect(munge('*foo*')).toBe('_STAR_foo_STAR_');
  });
});

// -- module compilation --

describe('module compilation', () => {
  it('compiles multiple defs as exports', () => {
    const js = compileModule('(def x 1) (def y 2)');
    expect(js).toContain('export const x = 1;');
    expect(js).toContain('export const y = 2;');
  });

  it('compiles defn in module', () => {
    const js = compileModule('(defn add [a b] a)');
    expect(js).toContain('export const add');
  });
});

// -- NS require --

describe('ns require compilation', () => {
  it('parses :as alias', () => {
    const js = compileModule('(ns my.app (:require [my.util :as u]))');
    expect(js).toContain('import * as u from');
  });

  it('parses :refer names', () => {
    const js = compileModule('(ns my.app (:require [my.util :refer [helper]]))');
    expect(js).toContain('import { helper }');
  });

  it('parses :as and :refer together', () => {
    const js = compileModule('(ns my.app (:require [my.util :as u :refer [helper]]))');
    expect(js).toContain('import * as u from');
    expect(js).toContain('import { helper }');
  });

  it('maps ns to relative path', () => {
    const js = compileModule('(ns my.app (:require [my.util :as u]))');
    expect(js).toContain('./util.js');
  });

  it('maps different-package ns to full path', () => {
    const js = compileModule('(ns my.app (:require [other.lib :as o]))');
    expect(js).toContain('other/lib');
  });

  it('auto-imports runtime when collection literals are used', () => {
    const js = compileModule('(ns my.app) (def v [1 2])');
    expect(js).toContain('import');
    expect(js).toContain('vector');
  });
});

// -- loop/recur --

describe('loop/recur compilation', () => {
  it('loop with no recur returns body', () => {
    expect(run('(loop [x 10] x)')).toBe(10);
  });

  it('loop/recur counts down', () => {
    expect(run('(loop [x 0] (if (js* "x < 3") (recur (js* "x + 1")) x))')).toBe(3);
  });

  it('recur reassigns all bindings simultaneously', () => {
    expect(run('(loop [a 1 b 2 n 0] (if (js* "n < 1") (recur b a (js* "n + 1")) a))')).toBe(2);
  });
});

// -- try/catch --

describe('try/catch compilation', () => {
  it('try returns body value when no exception', () => {
    expect(run('(try 42 (catch Error e 0))')).toBe(42);
  });

  it('try catches thrown exception', () => {
    expect(run('(try (throw "err") (catch Error e "caught"))')).toBe('caught');
  });

  it('catch binds the exception', () => {
    expect(run('(try (throw "hello") (catch Error e e))')).toBe('hello');
  });
});

// -- letfn --

describe('letfn compilation', () => {
  it('basic letfn with single fn', () => {
    expect(run('(letfn [(f [x] x)] (f 42))')).toBe(42);
  });

  it('mutual recursion with letfn', () => {
    // even?/odd? mutual recursion: even?(4) → odd?(3) → even?(2) → odd?(1) → even?(0) → true
    const src = `(letfn [(even? [n] (if (js* "n === 0") true (odd? (js* "n - 1"))))
                         (odd? [n] (if (js* "n === 0") false (even? (js* "n - 1"))))]
                   (even? 4))`;
    expect(run(src)).toBe(true);
  });
});

// -- dot special form --

describe('dot special form', () => {
  it('(. obj method) calls method', () => {
    expect(run('(. "hello" toUpperCase)')).toBe('HELLO');
  });

  it('(. obj method args) calls with args', () => {
    expect(run('(. "hello world" indexOf "world")')).toBe(6);
  });

  it('(. obj -field) accesses field', () => {
    expect(run('(. "hello" -length)')).toBe(5);
  });
});

// -- full E2E --

describe('E2E: compile and execute', () => {
  it('compiles and runs if-let', () => {
    expect(run('(if true "yes" "no")')).toBe('yes');
  });

  it('compiles nested let + if', () => {
    expect(run('(let [x 5] (if true x 0))')).toBe(5);
  });

  it('compiles fn invocation', () => {
    expect(run('((fn [x y] x) 1 2)')).toBe(1);
  });

  it('compiles interop method call', () => {
    expect(run('(.toUpperCase "hello")')).toBe('HELLO');
  });

  it('compiles string interop', () => {
    expect(run('(.indexOf "hello world" "world")')).toBe(6);
  });

  it('vector in let binding', () => {
    const v = run('(let [v [1 2 3]] v)') as PersistentVector;
    expect(v).toBeInstanceOf(PersistentVector);
    expect(v.count).toBe(3);
  });

  it('keyword in map', () => {
    const m = run('(let [m {:x 42}] m)') as PersistentHashMap;
    expect(m).toBeInstanceOf(PersistentHashMap);
    expect(m.get(keyword('x'))).toBe(42);
  });
});

// -- case --

describe('case', () => {
  it('matches integer constant', () => {
    expect(run('(case 1 1 :one 2 :two :default)')).toEqual(keyword('one'));
  });

  it('matches second clause', () => {
    expect(run('(case 2 1 :one 2 :two :default)')).toEqual(keyword('two'));
  });

  it('falls through to default', () => {
    expect(run('(case 42 1 :one 2 :two :default)')).toEqual(keyword('default'));
  });

  it('matches string constant', () => {
    expect(run('(case "hello" "hello" 1 "world" 2 0)')).toBe(1);
  });

  it('matches keyword constant', () => {
    expect(run('(case :a :a 1 :b 2 0)')).toBe(1);
  });

  it('supports grouped test values', () => {
    expect(run('(case 2 (1 2) :early 3 :late :default)')).toEqual(keyword('early'));
  });

  it('throws on no match without default', () => {
    expect(() => run('(case 42 1 :one 2 :two)')).toThrow('No matching clause');
  });

  it('evaluates test expression via let binding', () => {
    // test expr is wrapped in let* by the macro
    expect(run('(let [x 2] (case x 1 :one 2 :two :default))')).toEqual(keyword('two'));
  });
});

// -- var --

describe('condp', () => {
  it('matches with predicate', () => {
    // Use inline fn with js* for identity comparison
    const eq = '(fn [a b] (js* "a === b"))';
    expect(run(`(let [eq ${eq}] (condp eq 1 1 :yes :no))`)).toEqual(keyword('yes'));
  });

  it('falls through to default', () => {
    const eq = '(fn [a b] (js* "a === b"))';
    expect(run(`(let [eq ${eq}] (condp eq 99 1 :one 2 :two :default))`)).toEqual(keyword('default'));
  });
});

describe('cond-> and cond->>', () => {
  it('cond-> threads when test is truthy', () => {
    // (cond-> 1 true (.toString)) → "1"
    expect(run('(cond-> 1 true (.toString))')).toBe('1');
  });

  it('cond-> skips when test is falsy', () => {
    // (cond-> 1 false (.toString)) → 1 (not threaded)
    expect(run('(cond-> 1 false (.toString))')).toBe(1);
  });

  it('cond->> threads as last arg', () => {
    // (.concat "hello " cond__auto) → "hello ".concat("world") → "hello world"
    expect(run('(cond->> "world" true (.concat "hello "))')).toBe('hello world');
  });
});

describe('dotimes', () => {
  it('executes body n times', () => {
    // Use js* with mutable object to track loop execution
    const code = `
      (let [result (js* "{ value: '' }")]
        (dotimes [i 3]
          (js* "result.value += String(i)"))
        (js* "result.value"))
    `;
    expect(run(code)).toBe('012');
  });
});

describe('var special form', () => {
  it('resolves var to its value', () => {
    expect(run('(let [x 42] (var x))')).toBe(42);
  });
});

// -- Protocol System --

describe('reify', () => {
  it('generates object literal with symbol methods', () => {
    const code = `
      (defprotocol IFoo
        (foo [this]))
      (def x (reify IFoo (foo [this] 42)))
    `;
    const js = compileModule(code);
    expect(js).toContain('[IFoo.methods.foo]');
    expect(js).toContain('42');
  });
});

describe('extend-type', () => {
  it('generates prototype assignment for protocol methods', () => {
    const code = `
      (defprotocol IFoo
        (foo [this]))
      (extend-type js/Array
        IFoo
        (foo [this] (.-length this)))
    `;
    const js = compileModule(code);
    expect(js).toContain('.prototype[');
    expect(js).toContain('.methods.foo]');
  });
});

describe('defprotocol + protocolFn', () => {
  it('defines protocol and dispatches via symbol', () => {
    const code = `
      (defprotocol IGreet
        (greet [this]))
    `;
    const js = compileModule(code);
    expect(js).toContain('defprotocol');
    expect(js).toContain('protocolFn');
  });
});

describe('deftype', () => {
  it('creates a type with fields and protocol method', () => {
    const code = `
      (defprotocol IGreet
        (greet [this]))
      (deftype Greeter [name]
        IGreet
        (greet [this] (.-name this)))
    `;
    const js = compileModule(code);
    expect(js).toContain('class Greeter');
    expect(js).toContain('constructor(name)');
  });
});
