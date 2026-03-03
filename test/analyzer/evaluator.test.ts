import { describe, it, expect } from 'vitest';
import { readStr } from '../../src/reader/reader.js';
import { prStr } from '../../src/reader/form.js';
import { MacroEvaluator, makeEnv } from '../../src/analyzer/evaluator.js';

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
