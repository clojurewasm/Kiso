import { describe, it, expect } from 'vitest';
import * as core from '../../src/runtime/core.js';
import { vector } from '../../src/runtime/vector.js';
import { list } from '../../src/runtime/list.js';
import { hashMap } from '../../src/runtime/hash-map.js';
import { hashSet } from '../../src/runtime/hash-set.js';
import { toArray } from '../../src/runtime/seq.js';

// -- Arithmetic --

describe('arithmetic', () => {
  it('add', () => {
    expect(core.add()).toBe(0);
    expect(core.add(5)).toBe(5);
    expect(core.add(1, 2)).toBe(3);
    expect(core.add(1, 2, 3)).toBe(6);
  });

  it('subtract', () => {
    expect(core.subtract(5)).toBe(-5);
    expect(core.subtract(10, 3)).toBe(7);
    expect(core.subtract(10, 3, 2)).toBe(5);
  });

  it('multiply', () => {
    expect(core.multiply()).toBe(1);
    expect(core.multiply(5)).toBe(5);
    expect(core.multiply(2, 3)).toBe(6);
  });

  it('divide', () => {
    expect(core.divide(10, 2)).toBe(5);
    expect(core.divide(7, 2)).toBe(3.5);
  });

  it('mod', () => {
    expect(core.mod(10, 3)).toBe(1);
    expect(core.mod(-1, 5)).toBe(4); // Clojure mod, not JS %
  });

  it('inc / dec', () => {
    expect(core.inc(1)).toBe(2);
    expect(core.dec(1)).toBe(0);
  });
});

// -- Comparison --

describe('comparison', () => {
  it('lt / gt / lte / gte', () => {
    expect(core.lt(1, 2)).toBe(true);
    expect(core.lt(2, 1)).toBe(false);
    expect(core.gt(2, 1)).toBe(true);
    expect(core.lte(1, 1)).toBe(true);
    expect(core.gte(1, 1)).toBe(true);
  });

  it('eq', () => {
    expect(core.eq(1, 1)).toBe(true);
    expect(core.eq(1, 2)).toBe(false);
    expect(core.eq(null, null)).toBe(true);
  });

  it('not_eq', () => {
    expect(core.not_eq(1, 2)).toBe(true);
    expect(core.not_eq(1, 1)).toBe(false);
  });
});

// -- Predicates --

describe('predicates', () => {
  it('nil_p', () => {
    expect(core.nil_p(null)).toBe(true);
    expect(core.nil_p(undefined)).toBe(true);
    expect(core.nil_p(false)).toBe(false);
    expect(core.nil_p(0)).toBe(false);
  });

  it('some_p', () => {
    expect(core.some_p(1)).toBe(true);
    expect(core.some_p(null)).toBe(false);
  });

  it('not', () => {
    expect(core.not(false)).toBe(true);
    expect(core.not(null)).toBe(true);
    expect(core.not(true)).toBe(false);
    expect(core.not(0)).toBe(false); // Clojure: 0 is truthy
  });

  it('zero_p / pos_p / neg_p', () => {
    expect(core.zero_p(0)).toBe(true);
    expect(core.pos_p(1)).toBe(true);
    expect(core.neg_p(-1)).toBe(true);
  });

  it('number_p / string_p / boolean_p', () => {
    expect(core.number_p(42)).toBe(true);
    expect(core.string_p('hi')).toBe(true);
    expect(core.boolean_p(true)).toBe(true);
  });
});

// -- String --

describe('str', () => {
  it('stringifies values', () => {
    expect(core.str()).toBe('');
    expect(core.str('hello')).toBe('hello');
    expect(core.str(1, 2, 3)).toBe('123');
    expect(core.str('a', null, 'b')).toBe('ab');
  });
});

// -- Collection operations --

describe('count', () => {
  it('counts various collections', () => {
    expect(core.count(null)).toBe(0);
    expect(core.count(list(1, 2, 3))).toBe(3);
    expect(core.count(vector(1, 2))).toBe(2);
    expect(core.count('hello')).toBe(5);
    expect(core.count([1, 2, 3])).toBe(3);
  });
});

describe('conj', () => {
  it('conj onto vector', () => {
    const v = core.conj(vector(1, 2), 3);
    expect(v.count).toBe(3);
    expect(v.nth(2)).toBe(3);
  });

  it('conj onto list', () => {
    const l = core.conj(list(2, 3), 1);
    expect(toArray(l)).toEqual([1, 2, 3]);
  });
});

describe('get', () => {
  it('get from map', () => {
    const m = hashMap('a', 1, 'b', 2);
    expect(core.get(m, 'a')).toBe(1);
    expect(core.get(m, 'z')).toBe(null);
    expect(core.get(m, 'z', 'default')).toBe('default');
  });

  it('get from vector', () => {
    expect(core.get(vector(10, 20, 30), 1)).toBe(20);
    expect(core.get(vector(10), 5)).toBe(null);
  });
});

describe('assoc', () => {
  it('assoc on map', () => {
    const m = core.assoc(hashMap('a', 1), 'b', 2);
    expect(m.get('b')).toBe(2);
  });

  it('assoc on vector', () => {
    const v = core.assoc(vector(1, 2, 3), 1, 99);
    expect(v.nth(1)).toBe(99);
  });
});

describe('dissoc', () => {
  it('removes key from map', () => {
    const m = core.dissoc(hashMap('a', 1, 'b', 2), 'a');
    expect(m.get('a')).toBe(undefined);
    expect(m.count).toBe(1);
  });
});

// -- Higher-order --

describe('map', () => {
  it('maps over collection', () => {
    const result = core.map((x: number) => x * 2, [1, 2, 3]);
    expect(toArray(result)).toEqual([2, 4, 6]);
  });
});

describe('filter', () => {
  it('filters collection', () => {
    const result = core.filter((x: number) => x > 2, [1, 2, 3, 4]);
    expect(toArray(result)).toEqual([3, 4]);
  });
});

describe('reduce', () => {
  it('reduces collection', () => {
    expect(core.reduce((a: number, b: number) => a + b, 0, [1, 2, 3])).toBe(6);
  });

  it('reduce without initial value', () => {
    expect(core.reduce((a: number, b: number) => a + b, [1, 2, 3])).toBe(6);
  });
});

describe('apply', () => {
  it('applies fn to args', () => {
    expect(core.apply(core.add, [1, 2, 3])).toBe(6);
  });
});

describe('identity', () => {
  it('returns its argument', () => {
    expect(core.identity(42)).toBe(42);
    expect(core.identity(null)).toBe(null);
  });
});

describe('constantly', () => {
  it('returns a function that always returns the value', () => {
    const f = core.constantly(42);
    expect(f()).toBe(42);
    expect(f(1, 2, 3)).toBe(42);
  });
});

describe('comp', () => {
  it('composes functions', () => {
    const f = core.comp((x: number) => x + 1, (x: number) => x * 2);
    expect(f(3)).toBe(7); // (3 * 2) + 1
  });
});

describe('partial', () => {
  it('partially applies', () => {
    const add5 = core.partial(core.add, 5);
    expect(add5(3)).toBe(8);
  });
});
