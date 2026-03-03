import { describe, it, expect } from 'vitest';
import { readStr, readAllStr } from '../../src/reader/reader.js';
import { Analyzer } from '../../src/analyzer/analyzer.js';
import { emit, emitModule, munge } from '../../src/codegen/emitter.js';

const analyzer = new Analyzer();

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
 * This is safe because it only evaluates compiler output from our own test inputs.
 * Used exclusively for testing the compiler pipeline in a controlled environment.
 */
function run(source: string): unknown {
  const js = compile(source);
  // eslint-disable-next-line no-new-func -- test-only: evaluating our own compiler output
  return new Function(`return ${js}`)();
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

  it('compiles keywords as strings', () => {
    expect(compile(':foo')).toBe('":foo"');
    expect(run(':foo')).toBe(':foo');
  });

  it('compiles vectors as arrays', () => {
    expect(compile('[1 2 3]')).toBe('[1, 2, 3]');
    expect(run('[1 2 3]')).toEqual([1, 2, 3]);
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
});
