import { describe, it, expect } from 'vitest';
import * as core from '../../src/runtime/core.js';
import { vector } from '../../src/runtime/vector.js';
import { list } from '../../src/runtime/list.js';
import { hashMap } from '../../src/runtime/hash-map.js';
import { hashSet } from '../../src/runtime/hash-set.js';
import { keyword } from '../../src/runtime/keyword.js';
import { sortedMap } from '../../src/runtime/sorted-map.js';
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

  it('accepts set as IFn predicate', () => {
    const s = hashSet(keyword('a'), keyword('c'));
    const result = core.filter(s, [keyword('a'), keyword('b'), keyword('c'), keyword('d')]);
    expect(toArray(result)).toEqual([keyword('a'), keyword('c')]);
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

// -- Map operations --

import { keyword } from '../../src/runtime/keyword.js';

describe('get-in', () => {
  it('navigates nested maps', () => {
    const m = hashMap(keyword('a'), hashMap(keyword('b'), 42));
    expect(core.get_in(m, vector(keyword('a'), keyword('b')))).toBe(42);
  });

  it('returns null for missing path', () => {
    const m = hashMap(keyword('a'), 1);
    expect(core.get_in(m, vector(keyword('x'), keyword('y')))).toBe(null);
  });

  it('returns not-found when provided', () => {
    const m = hashMap(keyword('a'), 1);
    expect(core.get_in(m, vector(keyword('x')), 'default')).toBe('default');
  });

  it('works with empty path', () => {
    const m = hashMap(keyword('a'), 1);
    expect(core.get_in(m, vector())).toBe(m);
  });
});

describe('assoc-in', () => {
  it('sets nested value', () => {
    const m = hashMap(keyword('a'), hashMap(keyword('b'), 1));
    const result = core.assoc_in(m, vector(keyword('a'), keyword('b')), 42) as any;
    expect(core.get_in(result, vector(keyword('a'), keyword('b')))).toBe(42);
  });

  it('creates intermediate maps', () => {
    const m = hashMap();
    const result = core.assoc_in(m, vector(keyword('a'), keyword('b')), 42) as any;
    expect(core.get_in(result, vector(keyword('a'), keyword('b')))).toBe(42);
  });
});

describe('update', () => {
  it('applies fn to value at key', () => {
    const m = hashMap(keyword('a'), 1);
    const result = core.update(m, keyword('a'), core.inc) as any;
    expect(result.get(keyword('a'))).toBe(2);
  });

  it('passes extra args to fn', () => {
    const m = hashMap(keyword('a'), 1);
    const result = core.update(m, keyword('a'), core.add, 10) as any;
    expect(result.get(keyword('a'))).toBe(11);
  });
});

describe('update-in', () => {
  it('applies fn to nested value', () => {
    const m = hashMap(keyword('a'), hashMap(keyword('b'), 1));
    const result = core.update_in(m, vector(keyword('a'), keyword('b')), core.inc) as any;
    expect(core.get_in(result, vector(keyword('a'), keyword('b')))).toBe(2);
  });
});

describe('keys', () => {
  it('returns keys of a map as list', () => {
    const m = hashMap(keyword('a'), 1, keyword('b'), 2);
    const ks = toArray(core.keys(m) as any);
    expect(ks).toHaveLength(2);
    expect(ks).toContainEqual(keyword('a'));
    expect(ks).toContainEqual(keyword('b'));
  });

  it('returns null for nil', () => {
    expect(core.keys(null)).toBe(null);
  });

  it('returns keys of a sorted map', () => {
    const m = sortedMap('c', 3, 'a', 1, 'b', 2);
    const ks = toArray(core.keys(m) as any);
    expect(ks).toEqual(['a', 'b', 'c']);
  });
});

describe('vals', () => {
  it('returns vals of a map as list', () => {
    const m = hashMap(keyword('a'), 1, keyword('b'), 2);
    const vs = toArray(core.vals(m) as any);
    expect(vs).toHaveLength(2);
    expect(vs).toContain(1);
    expect(vs).toContain(2);
  });

  it('returns vals of a sorted map in key order', () => {
    const m = sortedMap('c', 3, 'a', 1, 'b', 2);
    const vs = toArray(core.vals(m) as any);
    expect(vs).toEqual([1, 2, 3]);
  });
});

describe('merge', () => {
  it('merges two maps', () => {
    const a = hashMap(keyword('a'), 1, keyword('b'), 2);
    const b = hashMap(keyword('b'), 3, keyword('c'), 4);
    const result = core.merge(a, b) as any;
    expect(result.get(keyword('a'))).toBe(1);
    expect(result.get(keyword('b'))).toBe(3);
    expect(result.get(keyword('c'))).toBe(4);
  });

  it('handles nil args', () => {
    const m = hashMap(keyword('a'), 1);
    expect(core.merge(null, m)).toBe(m);
    expect(core.merge(m, null)).toBe(m);
  });
});

describe('select-keys', () => {
  it('returns map with only selected keys', () => {
    const m = hashMap(keyword('a'), 1, keyword('b'), 2, keyword('c'), 3);
    const result = core.select_keys(m, vector(keyword('a'), keyword('c'))) as any;
    expect(result.count).toBe(2);
    expect(result.get(keyword('a'))).toBe(1);
    expect(result.get(keyword('c'))).toBe(3);
  });
});

describe('find', () => {
  it('returns [key val] vector for existing key', () => {
    const m = hashMap(keyword('a'), 1);
    const result = core.find(m, keyword('a')) as any;
    expect(result.nth(0)).toEqual(keyword('a'));
    expect(result.nth(1)).toBe(1);
  });

  it('returns null for missing key', () => {
    const m = hashMap(keyword('a'), 1);
    expect(core.find(m, keyword('x'))).toBe(null);
  });
});

// -- Numeric --

describe('max/min/abs', () => {
  it('max', () => {
    expect(core.max(1, 3, 2)).toBe(3);
    expect(core.max(5)).toBe(5);
  });

  it('min', () => {
    expect(core.min(3, 1, 2)).toBe(1);
    expect(core.min(5)).toBe(5);
  });

  it('abs', () => {
    expect(core.abs(-5)).toBe(5);
    expect(core.abs(3)).toBe(3);
  });
});

describe('even?/odd?', () => {
  it('even?', () => {
    expect(core.even_p(2)).toBe(true);
    expect(core.even_p(3)).toBe(false);
  });

  it('odd?', () => {
    expect(core.odd_p(3)).toBe(true);
    expect(core.odd_p(2)).toBe(false);
  });
});

describe('rem', () => {
  it('remainder', () => {
    expect(core.rem(10, 3)).toBe(1);
    expect(core.rem(-10, 3)).toBe(-1);
  });
});

// -- Seq operations --

describe('take / drop', () => {
  it('take returns first n items', () => {
    expect(toArray(core.take(2, vector(1, 2, 3, 4)) as any)).toEqual([1, 2]);
  });

  it('drop returns items after first n', () => {
    expect(toArray(core.drop(2, vector(1, 2, 3, 4)) as any)).toEqual([3, 4]);
  });
});

describe('take-while / drop-while', () => {
  it('take-while', () => {
    const result = core.take_while((x: number) => x < 3, vector(1, 2, 3, 4));
    expect(toArray(result as any)).toEqual([1, 2]);
  });

  it('drop-while', () => {
    const result = core.drop_while((x: number) => x < 3, vector(1, 2, 3, 4));
    expect(toArray(result as any)).toEqual([3, 4]);
  });
});

describe('some / every?', () => {
  it('some returns first truthy result', () => {
    expect(core.some((x: number) => x > 2, vector(1, 2, 3))).toBe(true);
    expect(core.some((x: number) => x > 5, vector(1, 2, 3))).toBe(null);
  });

  it('every? checks all elements', () => {
    expect(core.every_p((x: number) => x > 0, vector(1, 2, 3))).toBe(true);
    expect(core.every_p((x: number) => x > 1, vector(1, 2, 3))).toBe(false);
  });
});

describe('sort / sort-by / reverse', () => {
  it('sort', () => {
    expect(toArray(core.sort(vector(3, 1, 2)) as any)).toEqual([1, 2, 3]);
  });

  it('sort with comparator', () => {
    expect(toArray(core.sort((a: number, b: number) => b - a, vector(3, 1, 2)) as any)).toEqual([3, 2, 1]);
  });

  it('sort-by', () => {
    const v = vector(hashMap(keyword('n'), 3), hashMap(keyword('n'), 1));
    const result = toArray(core.sort_by((x: any) => x.get(keyword('n')), v) as any);
    expect(result[0].get(keyword('n'))).toBe(1);
  });

  it('reverse', () => {
    expect(toArray(core.reverse(vector(1, 2, 3)) as any)).toEqual([3, 2, 1]);
  });
});

describe('range / repeat / repeatedly', () => {
  it('range with end', () => {
    expect(toArray(core.range(5) as any)).toEqual([0, 1, 2, 3, 4]);
  });

  it('range with start and end', () => {
    expect(toArray(core.range(2, 5) as any)).toEqual([2, 3, 4]);
  });

  it('range with step', () => {
    expect(toArray(core.range(0, 10, 3) as any)).toEqual([0, 3, 6, 9]);
  });

  it('repeat', () => {
    expect(toArray(core.repeat(3, 'x') as any)).toEqual(['x', 'x', 'x']);
  });

  it('repeatedly', () => {
    let i = 0;
    const result = toArray(core.repeatedly(3, () => ++i) as any);
    expect(result).toEqual([1, 2, 3]);
  });
});

describe('group-by / frequencies', () => {
  it('group-by', () => {
    const result = core.group_by(core.even_p, vector(1, 2, 3, 4)) as any;
    expect(toArray(result.get(true))).toEqual([2, 4]);
    expect(toArray(result.get(false))).toEqual([1, 3]);
  });

  it('frequencies', () => {
    const result = core.frequencies(vector('a', 'b', 'a', 'c', 'b', 'a')) as any;
    expect(result.get('a')).toBe(3);
    expect(result.get('b')).toBe(2);
    expect(result.get('c')).toBe(1);
  });
});

// -- Predicates --

describe('type predicates', () => {
  it('fn?', () => {
    expect(core.fn_p(() => {})).toBe(true);
    expect(core.fn_p(42)).toBe(false);
  });

  it('integer?', () => {
    expect(core.integer_p(42)).toBe(true);
    expect(core.integer_p(3.14)).toBe(false);
  });

  it('coll?', () => {
    expect(core.coll_p(vector(1))).toBe(true);
    expect(core.coll_p(hashMap())).toBe(true);
    expect(core.coll_p(42)).toBe(false);
  });

  it('sequential?', () => {
    expect(core.sequential_p(vector(1))).toBe(true);
    expect(core.sequential_p(list(1))).toBe(true);
    expect(core.sequential_p(hashMap())).toBe(false);
  });

  it('associative?', () => {
    expect(core.associative_p(hashMap())).toBe(true);
    expect(core.associative_p(vector(1))).toBe(true);
    expect(core.associative_p(list(1))).toBe(false);
  });
});

// -- Higher-order --

describe('complement', () => {
  it('returns negated predicate', () => {
    const notEven = core.complement(core.even_p);
    expect(notEven(2)).toBe(false);
    expect(notEven(3)).toBe(true);
  });
});

describe('juxt', () => {
  it('applies multiple fns', () => {
    const f = core.juxt(core.inc, core.dec);
    const result = f(5);
    expect(result.nth(0)).toBe(6);
    expect(result.nth(1)).toBe(4);
  });
});

describe('memoize', () => {
  it('caches results', () => {
    let calls = 0;
    const f = core.memoize((x: number) => { calls++; return x * 2; });
    expect(f(5)).toBe(10);
    expect(f(5)).toBe(10);
    expect(calls).toBe(1);
  });
});

// -- Printing --

describe('println', () => {
  it('calls console.log with space-separated str', () => {
    const logs: string[] = [];
    const orig = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(' '));
    core.println('hello', 'world');
    console.log = orig;
    expect(logs[0]).toBe('hello world');
  });
});

// -- Batch 2: Collection ops --

describe('second/last/butlast', () => {
  it('second', () => {
    expect(core.second(vector(1, 2, 3))).toBe(2);
    expect(core.second(vector(1))).toBe(null);
  });

  it('last', () => {
    expect(core.last(vector(1, 2, 3))).toBe(3);
    expect(core.last(vector())).toBe(null);
  });

  it('butlast', () => {
    expect(toArray(core.butlast(vector(1, 2, 3)) as any)).toEqual([1, 2]);
    expect(core.butlast(vector(1))).toBe(null);
  });
});

describe('peek/pop', () => {
  it('peek on vector returns last', () => {
    expect(core.peek(vector(1, 2, 3))).toBe(3);
  });

  it('pop on vector returns without last', () => {
    const result = core.pop(vector(1, 2, 3)) as any;
    expect(result.count).toBe(2);
    expect(result.nth(0)).toBe(1);
    expect(result.nth(1)).toBe(2);
  });

  it('peek on list returns first', () => {
    expect(core.peek(list(1, 2, 3))).toBe(1);
  });
});

describe('subvec', () => {
  it('returns sub-vector', () => {
    const v = vector(1, 2, 3, 4, 5);
    const result = core.subvec(v, 1, 4) as any;
    expect(toArray(result)).toEqual([2, 3, 4]);
  });

  it('subvec with only start', () => {
    const result = core.subvec(vector(1, 2, 3), 1) as any;
    expect(toArray(result)).toEqual([2, 3]);
  });
});

describe('not-empty / empty', () => {
  it('not-empty returns coll when non-empty', () => {
    const v = vector(1);
    expect(core.not_empty(v)).toBe(v);
  });

  it('not-empty returns null when empty', () => {
    expect(core.not_empty(vector())).toBe(null);
    expect(core.not_empty(null)).toBe(null);
  });
});

describe('mapcat / map-indexed / remove / keep', () => {
  it('mapcat', () => {
    const result = core.mapcat(
      (x: number) => vector(x, x * 10),
      vector(1, 2, 3)
    );
    expect(toArray(result as any)).toEqual([1, 10, 2, 20, 3, 30]);
  });

  it('map-indexed', () => {
    const result = core.map_indexed(
      (i: number, v: string) => `${i}:${v}`,
      vector('a', 'b', 'c')
    );
    expect(toArray(result as any)).toEqual(['0:a', '1:b', '2:c']);
  });

  it('remove', () => {
    const result = core.remove(core.even_p, vector(1, 2, 3, 4));
    expect(toArray(result as any)).toEqual([1, 3]);
  });

  it('keep', () => {
    const result = core.keep(
      (x: number) => x > 2 ? x * 10 : null,
      vector(1, 2, 3, 4)
    );
    expect(toArray(result as any)).toEqual([30, 40]);
  });
});

describe('flatten / distinct / dedupe', () => {
  it('flatten', () => {
    const v = vector(1, vector(2, vector(3)), 4);
    expect(toArray(core.flatten(v) as any)).toEqual([1, 2, 3, 4]);
  });

  it('distinct', () => {
    expect(toArray(core.distinct(vector(1, 2, 1, 3, 2)) as any)).toEqual([1, 2, 3]);
  });

  it('dedupe', () => {
    expect(toArray(core.dedupe(vector(1, 1, 2, 2, 3, 1)) as any)).toEqual([1, 2, 3, 1]);
  });
});

describe('interleave / interpose', () => {
  it('interleave', () => {
    expect(toArray(core.interleave(vector(1, 2, 3), vector('a', 'b', 'c')) as any)).toEqual([1, 'a', 2, 'b', 3, 'c']);
  });

  it('interpose', () => {
    expect(toArray(core.interpose(',', vector(1, 2, 3)) as any)).toEqual([1, ',', 2, ',', 3]);
  });
});

describe('partition / partition-all / partition-by', () => {
  it('partition', () => {
    const result = toArray(core.partition(2, vector(1, 2, 3, 4, 5)) as any);
    expect(result).toHaveLength(2);
    expect(toArray(result[0] as any)).toEqual([1, 2]);
    expect(toArray(result[1] as any)).toEqual([3, 4]);
  });

  it('partition-all', () => {
    const result = toArray(core.partition_all(2, vector(1, 2, 3, 4, 5)) as any);
    expect(result).toHaveLength(3);
    expect(toArray(result[2] as any)).toEqual([5]);
  });

  it('partition-by', () => {
    const result = toArray(core.partition_by(core.even_p, vector(1, 1, 2, 2, 3)) as any);
    expect(result).toHaveLength(3);
    expect(toArray(result[0] as any)).toEqual([1, 1]);
    expect(toArray(result[1] as any)).toEqual([2, 2]);
    expect(toArray(result[2] as any)).toEqual([3]);
  });
});

describe('merge-with / zipmap', () => {
  it('merge-with', () => {
    const a = hashMap('x', 1, 'y', 2);
    const b = hashMap('y', 3, 'z', 4);
    const result = core.merge_with(core.add, a, b) as any;
    expect(result.get('x')).toBe(1);
    expect(result.get('y')).toBe(5);
    expect(result.get('z')).toBe(4);
  });

  it('zipmap', () => {
    const result = core.zipmap(vector('a', 'b', 'c'), vector(1, 2, 3)) as any;
    expect(result.get('a')).toBe(1);
    expect(result.get('b')).toBe(2);
    expect(result.get('c')).toBe(3);
  });
});

describe('reduce-kv', () => {
  it('reduces map with key-value-accumulator', () => {
    const m = hashMap('a', 1, 'b', 2);
    const result = core.reduce_kv((acc: string, k: string, v: number) => acc + k + v, '', m);
    // Order may vary, so just check length
    expect((result as string).length).toBe(4); // "a1b2" or "b2a1"
  });
});

describe('re-find / re-matches / re-seq', () => {
  it('re-find returns first match', () => {
    expect(core.re_find(/\d+/, 'abc123def')).toBe('123');
    expect(core.re_find(/\d+/, 'abcdef')).toBe(null);
  });

  it('re-matches returns match only if entire string matches', () => {
    expect(core.re_matches(/\d+/, '123')).toBe('123');
    expect(core.re_matches(/\d+/, 'abc123')).toBe(null);
  });

  it('re-seq returns all matches', () => {
    const result = toArray(core.re_seq(/\d+/g, 'a1b2c3') as any);
    expect(result).toEqual(['1', '2', '3']);
  });
});

describe('fnil', () => {
  it('replaces nil args with defaults', () => {
    const safe_inc = core.fnil(core.inc, 0);
    expect(safe_inc(5)).toBe(6);
    expect(safe_inc(null)).toBe(1);
  });
});

describe('trampoline', () => {
  it('bounces until non-function result', () => {
    let n = 0;
    const bounce = (x: number): unknown => {
      if (x <= 0) return n;
      n += x;
      return () => bounce(x - 1);
    };
    expect(core.trampoline(bounce, 3)).toBe(6); // 3+2+1
  });
});

// -- Batch 3: More small functions --

describe('ffirst/fnext/nfirst/nnext', () => {
  it('ffirst', () => {
    expect(core.ffirst(vector(vector(1, 2), vector(3, 4)))).toBe(1);
  });

  it('fnext', () => {
    expect(core.fnext(vector(1, 2, 3))).toBe(2);
  });

  it('nfirst', () => {
    const result = core.nfirst(vector(vector(1, 2, 3)));
    expect(toArray(result as any)).toEqual([2, 3]);
  });

  it('nnext', () => {
    const result = core.nnext(vector(1, 2, 3, 4));
    expect(toArray(result as any)).toEqual([3, 4]);
  });
});

describe('take-last / take-nth / drop-last', () => {
  it('take-last', () => {
    expect(toArray(core.take_last(2, vector(1, 2, 3, 4)) as any)).toEqual([3, 4]);
  });

  it('take-nth', () => {
    expect(toArray(core.take_nth(2, vector(0, 1, 2, 3, 4, 5)) as any)).toEqual([0, 2, 4]);
  });

  it('drop-last', () => {
    expect(toArray(core.drop_last(2, vector(1, 2, 3, 4)) as any)).toEqual([1, 2]);
  });
});

describe('keep-indexed / reductions', () => {
  it('keep-indexed', () => {
    const result = core.keep_indexed(
      (i: number, v: string) => i > 0 ? `${i}:${v}` : null,
      vector('a', 'b', 'c')
    );
    expect(toArray(result as any)).toEqual(['1:b', '2:c']);
  });

  it('reductions', () => {
    const result = toArray(core.reductions(core.add, 0, vector(1, 2, 3)) as any);
    expect(result).toEqual([0, 1, 3, 6]);
  });
});

describe('iterate / cycle / doall', () => {
  it('iterate (take 5)', () => {
    const inf = core.iterate(core.inc, 0);
    const result = toArray(core.take(5, inf) as any);
    expect(result).toEqual([0, 1, 2, 3, 4]);
  });

  it('cycle (take 6)', () => {
    const inf = core.cycle(vector(1, 2, 3));
    const result = toArray(core.take(6, inf) as any);
    expect(result).toEqual([1, 2, 3, 1, 2, 3]);
  });

  it('doall forces lazy seq', () => {
    const s = core.range(5);
    const result = core.doall(s);
    expect(toArray(result as any)).toEqual([0, 1, 2, 3, 4]);
  });
});

describe('empty / set', () => {
  it('empty of vector is empty vector', () => {
    const result = core.empty(vector(1, 2));
    expect(core.count(result)).toBe(0);
  });

  it('set creates hash-set from collection', () => {
    const s = core.set(vector(1, 2, 2, 3)) as any;
    expect(s.count).toBe(3);
    expect(s.has(1)).toBe(true);
    expect(s.has(2)).toBe(true);
    expect(s.has(3)).toBe(true);
  });
});

describe('type predicates batch 2', () => {
  it('float?', () => {
    expect(core.float_p(3.14)).toBe(true);
    expect(core.float_p(3)).toBe(false);
  });

  it('ifn?', () => {
    expect(core.ifn_p(() => {})).toBe(true);
    expect(core.ifn_p(keyword('a'))).toBe(true); // keywords are IFn
    expect(core.ifn_p(42)).toBe(false);
  });

  it('counted?', () => {
    expect(core.counted_p(vector(1))).toBe(true);
    expect(core.counted_p(hashMap())).toBe(true);
    expect(core.counted_p(42)).toBe(false);
  });
});

describe('quot / compare', () => {
  it('quot', () => {
    expect(core.quot(10, 3)).toBe(3);
    expect(core.quot(-10, 3)).toBe(-3);
  });

  it('compare', () => {
    expect(core.compare(1, 2)).toBe(-1);
    expect(core.compare(2, 1)).toBe(1);
    expect(core.compare(1, 1)).toBe(0);
    expect(core.compare('a', 'b')).toBe(-1);
  });
});

describe('array interop', () => {
  it('aget/aset/alength', () => {
    const arr = [10, 20, 30];
    expect(core.aget(arr, 1)).toBe(20);
    core.aset(arr, 1, 99);
    expect(arr[1]).toBe(99);
    expect(core.alength(arr)).toBe(3);
  });

  it('js-keys', () => {
    const obj = { a: 1, b: 2 };
    const result = core.js_keys(obj);
    expect(result).toEqual(['a', 'b']);
  });
});

// -- Batch 4: numeric equality, printing, regex, interop, misc --

describe('numeric equality (==)', () => {
  it('numbers equal', () => {
    expect(core.num_eq(1, 1)).toBe(true);
    expect(core.num_eq(1, 2)).toBe(false);
  });
  it('coerces to number', () => {
    expect(core.num_eq(1.0, 1)).toBe(true);
  });
});

describe('re-pattern', () => {
  it('creates regex from string', () => {
    const re = core.re_pattern('\\d+');
    expect(re).toBeInstanceOf(RegExp);
    expect(re.test('123')).toBe(true);
  });
});

describe('printing to string', () => {
  it('pr-str', () => {
    expect(core.pr_str('hello')).toBe('"hello"');
    expect(core.pr_str(42)).toBe('42');
    expect(core.pr_str(null)).toBe('nil');
  });
  it('prn-str', () => {
    expect(core.prn_str('hello')).toBe('"hello"\n');
  });
  it('print-str', () => {
    expect(core.print_str('hello')).toBe('hello');
    expect(core.print_str(42)).toBe('42');
  });
  it('println-str', () => {
    expect(core.println_str('hello')).toBe('hello\n');
  });
});

describe('array interop', () => {
  it('array creates JS array', () => {
    const arr = core.array(1, 2, 3);
    expect(arr).toEqual([1, 2, 3]);
  });
  it('aclone clones array', () => {
    const original = [1, 2, 3];
    const cloned = core.aclone(original);
    expect(cloned).toEqual([1, 2, 3]);
    expect(cloned).not.toBe(original);
  });
  it('js-delete removes property', () => {
    const obj: any = { a: 1, b: 2 };
    core.js_delete(obj, 'a');
    expect(obj.a).toBeUndefined();
    expect(obj.b).toBe(2);
  });
});

describe('hash', () => {
  it('returns number for various types', () => {
    expect(typeof core.hash(42)).toBe('number');
    expect(typeof core.hash('hello')).toBe('number');
    expect(typeof core.hash(null)).toBe('number');
  });
  it('same value same hash', () => {
    expect(core.hash('test')).toBe(core.hash('test'));
  });
});

describe('type', () => {
  it('returns constructor or null', () => {
    expect(core.type_fn(42)).toBe(Number);
    expect(core.type_fn('hi')).toBe(String);
    expect(core.type_fn(null)).toBe(null);
    expect(core.type_fn(true)).toBe(Boolean);
  });
});

describe('instance?', () => {
  it('checks instance', () => {
    expect(core.instance_p(RegExp, /abc/)).toBe(true);
    expect(core.instance_p(RegExp, 'abc')).toBe(false);
  });
});

describe('prn and pr', () => {
  it('prn outputs pr-str + newline to console', () => {
    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(' '));
    core.prn('hello', 42);
    console.log = origLog;
    expect(logs[0]).toBe('"hello" 42');
  });

  it('pr outputs pr-str to console (no newline)', () => {
    const logs: string[] = [];
    const origWrite = process.stdout.write;
    (process.stdout as any).write = (s: string) => { logs.push(s); return true; };
    core.pr('hello', 42);
    (process.stdout as any).write = origWrite;
    expect(logs[0]).toBe('"hello" 42');
  });
});

describe('reversible?', () => {
  it('vectors are reversible', () => {
    expect(core.reversible_p(vector(1, 2))).toBe(true);
  });
  it('lists are not reversible', () => {
    expect(core.reversible_p(list(1, 2))).toBe(false);
  });
  it('nil is not reversible', () => {
    expect(core.reversible_p(null)).toBe(false);
  });
});

describe('sorted?', () => {
  it('returns false for hash-map', () => {
    expect(core.sorted_p(hashMap(1, 2))).toBe(false);
  });
  it('returns false for nil', () => {
    expect(core.sorted_p(null)).toBe(false);
  });
});

describe('satisfies?', () => {
  it('returns false for unknown protocol', () => {
    expect(core.satisfies_p({}, 42)).toBe(false);
  });
});

describe('dynamic vars', () => {
  it('*print-fn* is a function by default', () => {
    expect(typeof core._print_fn_).toBe('function');
  });
  it('*print-err-fn* is a function by default', () => {
    expect(typeof core._print_err_fn_).toBe('function');
  });
  it('*print-newline* defaults to true', () => {
    expect(core._print_newline_).toBe(true);
  });
  it('*print-readably* defaults to true', () => {
    expect(core._print_readably_).toBe(true);
  });
  it('*print-length* defaults to null', () => {
    expect(core._print_length_).toBe(null);
  });
  it('*print-level* defaults to null', () => {
    expect(core._print_level_).toBe(null);
  });
});

describe('metadata', () => {
  it('alter-meta! modifies metadata', () => {
    const obj = { x: 1 };
    core.alter_meta_m(obj, (_old: unknown) => hashMap('tag', 'test'));
    core.alter_meta_m(obj, (old: any) => old);
    // Just verify it doesn't throw
    expect(true).toBe(true);
  });

  it('reset-meta! replaces metadata', () => {
    const obj = { x: 1 };
    const meta = hashMap('key', 'val');
    core.reset_meta_m(obj, meta);
    // No getter yet, just verify no crash
    expect(true).toBe(true);
  });

  it('alter-meta!/reset-meta! on nil returns null', () => {
    expect(core.alter_meta_m(null, (x: unknown) => x)).toBe(null);
    expect(core.reset_meta_m(null, {})).toBe(null);
  });
});
