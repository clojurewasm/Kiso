import { describe, it, expect } from 'vitest';
import { readStr } from '../../src/reader/reader.js';
import { prStr } from '../../src/reader/form.js';
import { MacroEvaluator, makeEnv } from '../../src/analyzer/evaluator.js';
import { MacroExpander } from '../../src/analyzer/macro-expander.js';

const evaluator = new MacroEvaluator();

function ev(source: string): string {
  const form = readStr(source);
  if (!form) throw new Error('Expected form');
  const result = evaluator.evaluate(form, makeEnv());
  return prStr(result);
}

// -- Self-evaluating --

describe('self-evaluating forms', () => {
  it('evaluates nil', () => {
    expect(ev('nil')).toBe('nil');
  });

  it('evaluates boolean', () => {
    expect(ev('true')).toBe('true');
    expect(ev('false')).toBe('false');
  });

  it('evaluates integer', () => {
    expect(ev('42')).toBe('42');
  });

  it('evaluates string', () => {
    expect(ev('"hello"')).toBe('"hello"');
  });

  it('evaluates keyword', () => {
    expect(ev(':foo')).toBe(':foo');
  });
});

// -- quote --

describe('quote', () => {
  it('returns form unevaluated', () => {
    expect(ev("(quote x)")).toBe('x');
  });

  it('returns list unevaluated', () => {
    expect(ev("(quote (1 2 3))")).toBe('(1 2 3)');
  });
});

// -- do --

describe('do', () => {
  it('evaluates and returns last form', () => {
    expect(ev('(do 1 2 3)')).toBe('3');
  });

  it('returns nil for empty do', () => {
    expect(ev('(do)')).toBe('nil');
  });
});

// -- if --

describe('if', () => {
  it('returns then on truthy', () => {
    expect(ev('(if true 1 2)')).toBe('1');
  });

  it('returns else on falsy', () => {
    expect(ev('(if false 1 2)')).toBe('2');
  });

  it('returns nil when no else on falsy', () => {
    expect(ev('(if false 1)')).toBe('nil');
  });

  it('nil is falsy', () => {
    expect(ev('(if nil 1 2)')).toBe('2');
  });
});

// -- def --

describe('def', () => {
  it('defines a var in the global env', () => {
    const env = makeEnv();
    const form = readStr('(def x 42)')!;
    evaluator.evaluate(form, env);
    const ref = readStr('x')!;
    expect(prStr(evaluator.evaluate(ref, env))).toBe('42');
  });
});

// -- let* --

describe('let*', () => {
  it('binds and evaluates body', () => {
    expect(ev('(let* [x 10] x)')).toBe('10');
  });

  it('supports multiple bindings', () => {
    expect(ev('(let* [x 1 y 2] y)')).toBe('2');
  });

  it('later bindings can reference earlier ones', () => {
    expect(ev('(let* [x 1 y x] y)')).toBe('1');
  });
});

// -- fn* --

describe('fn*', () => {
  it('creates and invokes a function', () => {
    expect(ev('((fn* [x] x) 42)')).toBe('42');
  });

  it('closes over environment', () => {
    expect(ev('(let* [x 10] ((fn* [y] x) 99))')).toBe('10');
  });
});

// -- loop*/recur --

describe('loop*/recur', () => {
  it('loops with recur', () => {
    // sum 1..3 = 6
    expect(ev('(loop* [i 1 acc 0] (if (= i 4) acc (recur (+ i 1) (+ acc i))))')).toBe('6');
  });
});

// -- Built-in functions --

describe('built-in: arithmetic', () => {
  it('adds', () => expect(ev('(+ 1 2 3)')).toBe('6'));
  it('subtracts', () => expect(ev('(- 10 3)')).toBe('7'));
  it('negates', () => expect(ev('(- 5)')).toBe('-5'));
  it('multiplies', () => expect(ev('(* 2 3)')).toBe('6'));
  it('divides', () => expect(ev('(/ 10 2)')).toBe('5'));
});

describe('built-in: comparison', () => {
  it('= true', () => expect(ev('(= 1 1)')).toBe('true'));
  it('= false', () => expect(ev('(= 1 2)')).toBe('false'));
  it('not=', () => expect(ev('(not= 1 2)')).toBe('true'));
  it('<', () => expect(ev('(< 1 2)')).toBe('true'));
  it('>', () => expect(ev('(> 2 1)')).toBe('true'));
});

describe('built-in: collections', () => {
  it('cons', () => expect(ev('(cons 1 (list 2 3))')).toBe('(1 2 3)'));
  it('concat', () => expect(ev('(concat (list 1 2) (list 3 4))')).toBe('(1 2 3 4)'));
  it('first', () => expect(ev('(first (list 1 2 3))')).toBe('1'));
  it('rest', () => expect(ev('(rest (list 1 2 3))')).toBe('(2 3)'));
  it('next nil on empty', () => expect(ev('(next (list 1))')).toBe('nil'));
  it('seq nil on empty', () => expect(ev('(seq (list))')).toBe('nil'));
  it('conj vector', () => expect(ev('(conj [1 2] 3)')).toBe('[1 2 3]'));
  it('conj list', () => expect(ev('(conj (list 2 3) 1)')).toBe('(1 2 3)'));
  it('count', () => expect(ev('(count [1 2 3])')).toBe('3'));
  it('empty?', () => expect(ev('(empty? (list))')).toBe('true'));
  it('vec', () => expect(ev('(vec (list 1 2))')).toBe('[1 2]'));
  it('nth', () => expect(ev('(nth [10 20 30] 1)')).toBe('20'));
  it('get map', () => expect(ev('(get {:a 1} :a)')).toBe('1'));
  it('assoc', () => expect(ev('(get (assoc {:a 1} :b 2) :b)')).toBe('2'));
  it('dissoc', () => expect(ev('(count (dissoc {:a 1 :b 2} :a))')).toBe('1'));
  it('contains? map', () => expect(ev('(contains? {:a 1} :a)')).toBe('true'));
  it('list*', () => expect(ev('(list* 1 2 (list 3 4))')).toBe('(1 2 3 4)'));
});

describe('built-in: symbols and keywords', () => {
  it('symbol from string', () => expect(ev('(symbol "foo")')).toBe('foo'));
  it('keyword from string', () => expect(ev('(keyword "foo")')).toBe(':foo'));
  it('name of keyword', () => expect(ev('(name :foo)')).toBe('"foo"'));
  it('namespace of keyword', () => expect(ev('(namespace :bar/baz)')).toBe('"bar"'));
  it('namespace nil for unqualified', () => expect(ev('(namespace :foo)')).toBe('nil'));
  it('gensym', () => {
    const result = ev('(symbol? (gensym))');
    expect(result).toBe('true');
  });
});

describe('built-in: predicates', () => {
  it('nil?', () => expect(ev('(nil? nil)')).toBe('true'));
  it('symbol?', () => expect(ev("(symbol? (quote x))")).toBe('true'));
  it('keyword?', () => expect(ev('(keyword? :a)')).toBe('true'));
  it('string?', () => expect(ev('(string? "hi")')).toBe('true'));
  it('number?', () => expect(ev('(number? 42)')).toBe('true'));
  it('list?', () => expect(ev('(list? (list 1))')).toBe('true'));
  it('vector?', () => expect(ev('(vector? [1])')).toBe('true'));
  it('map?', () => expect(ev('(map? {:a 1})')).toBe('true'));
  it('set?', () => expect(ev('(set? #{1})')).toBe('true'));
});

describe('built-in: string', () => {
  it('str concatenates', () => expect(ev('(str "hello" " " "world")')).toBe('"hello world"'));
  it('str with numbers', () => expect(ev('(str "x" 42)')).toBe('"x42"'));
  it('subs', () => expect(ev('(subs "hello" 1 3)')).toBe('"el"'));
});

describe('built-in: apply', () => {
  it('applies function to args', () => expect(ev('(apply + (list 1 2 3))')).toBe('6'));
  it('apply with leading args', () => expect(ev('(apply + 1 (list 2 3))')).toBe('6'));
});

describe('built-in: meta stubs', () => {
  it('meta returns nil', () => expect(ev('(meta 42)')).toBe('nil'));
  it('with-meta returns obj', () => expect(ev('(with-meta [1 2] {:a 1})')).toBe('[1 2]'));
});

// -- Macro expander pipeline --

describe('MacroExpander: defmacro', () => {
  it('registers and expands a user-defined macro', () => {
    const expander = new MacroExpander();
    // Register: (defmacro my-when [test & body] (list (quote if) test (cons (quote do) body)))
    const defmacroForm = readStr('(defmacro my-when [test & body] (list (quote if) test (cons (quote do) body)))')!;
    expander.processToplevel(defmacroForm);

    // Now expand: (my-when true 1 2 3)
    const form = readStr('(my-when true 1 2 3)')!;
    const expanded = expander.expandAll(form);
    expect(prStr(expanded)).toBe('(if true (do 1 2 3))');
  });

  it('user macro composes with core macros', () => {
    const expander = new MacroExpander();
    const defmacroForm = readStr('(defmacro my-unless [test & body] (list (quote when-not) test (cons (quote do) body)))')!;
    expander.processToplevel(defmacroForm);

    const form = readStr('(my-unless false 42)')!;
    const expanded = expander.expandAll(form);
    // my-unless → when-not → if (not ...)
    expect(prStr(expanded)).toBe('(if (not false) (do (do 42)) nil)');
  });
});

// -- fn* with rest params --

describe('fn* with rest params', () => {
  it('collects rest args', () => {
    expect(ev('((fn* [x & rest] (count rest)) 1 2 3)')).toBe('2');
  });

  it('rest is empty list when no extra args', () => {
    expect(ev('((fn* [x & rest] (empty? rest)) 1)')).toBe('true');
  });
});
