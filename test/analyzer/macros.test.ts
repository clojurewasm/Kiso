import { describe, it, expect } from 'vitest';
import { readStr } from '../../src/reader/reader.js';
import { prStr } from '../../src/reader/form.js';
import { expandOnce, expandAll } from '../../src/analyzer/macros.js';

/** Read → expand once → prStr. */
function ex1(source: string): string {
  const form = readStr(source);
  if (!form) throw new Error('Expected form');
  return prStr(expandOnce(form));
}

/** Read → expand all → prStr. */
function ex(source: string): string {
  const form = readStr(source);
  if (!form) throw new Error('Expected form');
  return prStr(expandAll(form));
}

// -- Control flow --

describe('when', () => {
  it('expands to if + do', () => {
    expect(ex1('(when true 1)')).toBe('(if true (do 1) nil)');
  });

  it('expands with multiple body forms', () => {
    expect(ex1('(when x a b c)')).toBe('(if x (do a b c) nil)');
  });
});

describe('when-not', () => {
  it('expands to if (not test)', () => {
    expect(ex1('(when-not x 1)')).toBe('(if (not x) (do 1) nil)');
  });
});

describe('if-not', () => {
  it('expands to if (not test)', () => {
    expect(ex1('(if-not x a b)')).toBe('(if (not x) a b)');
  });

  it('handles missing else', () => {
    expect(ex1('(if-not x a)')).toBe('(if (not x) a nil)');
  });
});

describe('if-let', () => {
  it('expands to let + if', () => {
    const result = ex1('(if-let [x (foo)] x :default)');
    expect(result).toBe('(let* [x (foo)] (if x x :default))');
  });
});

describe('when-let', () => {
  it('expands to let + when', () => {
    const result = ex1('(when-let [x (foo)] (bar x))');
    expect(result).toBe('(let* [x (foo)] (when x (bar x)))');
  });
});

describe('cond', () => {
  it('expands to nested if', () => {
    expect(ex('(cond a 1 b 2)')).toBe('(if a 1 (if b 2 nil))');
  });

  it('handles :else', () => {
    expect(ex('(cond a 1 :else 2)')).toBe('(if a 1 (if :else 2 nil))');
  });

  it('returns nil for empty cond', () => {
    expect(ex('(cond)')).toBe('nil');
  });
});

describe('and', () => {
  it('expands empty to true', () => {
    expect(ex('(and)')).toBe('true');
  });

  it('single arg returns it', () => {
    expect(ex('(and x)')).toBe('x');
  });

  it('multiple args expand to nested let + if', () => {
    const result = ex1('(and a b)');
    expect(result).toBe('(let* [and__auto a] (if and__auto b and__auto))');
  });
});

describe('or', () => {
  it('expands empty to nil', () => {
    expect(ex('(or)')).toBe('nil');
  });

  it('single arg returns it', () => {
    expect(ex('(or x)')).toBe('x');
  });

  it('multiple args expand to nested let + if', () => {
    const result = ex1('(or a b)');
    expect(result).toBe('(let* [or__auto a] (if or__auto or__auto b))');
  });
});

// -- Threading --

describe('->', () => {
  it('threads through function calls', () => {
    expect(ex('(-> x (f a) (g b))')).toBe('(g (f x a) b)');
  });

  it('wraps bare symbols in lists', () => {
    expect(ex('(-> x f g)')).toBe('(g (f x))');
  });

  it('single arg returns it', () => {
    expect(ex('(-> x)')).toBe('x');
  });
});

describe('->>', () => {
  it('threads as last argument', () => {
    expect(ex('(->> x (f a) (g b))')).toBe('(g b (f a x))');
  });
});

describe('as->', () => {
  it('expands to nested let', () => {
    expect(ex('(as-> x $ (f $ 1) (g 2 $))')).toBe(
      '(let* [$ x $ (f $ 1) $ (g 2 $)] $)',
    );
  });
});

describe('doto', () => {
  it('expands to let with side-effecting calls', () => {
    const result = ex1('(doto (java.util.HashMap.) (.put "a" 1))');
    expect(result).toBe('(let* [doto__auto (java.util.HashMap.)] (.put doto__auto "a" 1) doto__auto)');
  });
});

describe('some->', () => {
  it('expands to let + when-not nil check', () => {
    const result = ex1('(some-> x (f a))');
    expect(result).toBe('(let* [some__auto x some__auto (if (nil? some__auto) nil (f some__auto a))] some__auto)');
  });
});

describe('some->>', () => {
  it('threads as last argument with nil check', () => {
    const result = ex1('(some->> x (f a))');
    expect(result).toBe('(let* [some__auto x some__auto (if (nil? some__auto) nil (f a some__auto))] some__auto)');
  });
});

// -- Definition --

describe('defn', () => {
  it('expands to def + fn*', () => {
    expect(ex('(defn f [x] x)')).toBe('(def f (fn* f [x] x))');
  });

  it('handles docstring', () => {
    expect(ex('(defn f "docs" [x] x)')).toBe('(def f (fn* f [x] x))');
  });

  it('handles multi-arity', () => {
    expect(ex('(defn f ([x] x) ([x y] y))')).toBe('(def f (fn* f ([x] x) ([x y] y)))');
  });
});

describe('defn-', () => {
  it('expands like defn (private)', () => {
    expect(ex('(defn- f [x] x)')).toBe('(def f (fn* f [x] x))');
  });
});

describe('defonce', () => {
  it('expands to def', () => {
    expect(ex('(defonce x 42)')).toBe('(def x 42)');
  });
});

describe('fn', () => {
  it('expands fn to fn* (named)', () => {
    expect(ex('(fn f [x] x)')).toBe('(fn* f [x] x)');
  });

  it('expands fn to fn* (anonymous)', () => {
    expect(ex('(fn [x] x)')).toBe('(fn* [x] x)');
  });
});

describe('let', () => {
  it('expands to let*', () => {
    expect(ex('(let [x 1] x)')).toBe('(let* [x 1] x)');
  });
});

describe('loop', () => {
  it('expands to loop*', () => {
    expect(ex('(loop [i 0] (recur (+ i 1)))')).toBe('(loop* [i 0] (recur (+ i 1)))');
  });
});

// -- Other --

describe('comment', () => {
  it('expands to nil', () => {
    expect(ex('(comment (do stuff))')).toBe('nil');
  });
});

describe('do', () => {
  it('is not expanded (special form)', () => {
    expect(ex('(do 1 2 3)')).toBe('(do 1 2 3)');
  });
});

// -- Non-macro forms pass through --

describe('non-macro forms', () => {
  it('passes through regular function calls', () => {
    expect(ex('(+ 1 2)')).toBe('(+ 1 2)');
  });

  it('passes through literals', () => {
    expect(ex('42')).toBe('42');
  });

  it('expands children recursively', () => {
    expect(ex('(if (when true x) 1 2)')).toBe('(if (if true (do x) nil) 1 2)');
  });
});
