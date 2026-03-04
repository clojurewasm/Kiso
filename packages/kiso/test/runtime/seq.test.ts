import { describe, it, expect } from 'vitest';
import { seq, first, rest, next, toArray, into } from '../../src/runtime/seq.js';
import { list, EMPTY_LIST } from '../../src/runtime/list.js';
import { vector, EMPTY_VECTOR, isVector } from '../../src/runtime/vector.js';
import { hashMap, EMPTY_MAP } from '../../src/runtime/hash-map.js';
import { hashSet, EMPTY_SET } from '../../src/runtime/hash-set.js';
import { keyword } from '../../src/runtime/keyword.js';
import { get, nth } from '../../src/runtime/core.js';

describe('seq on nil', () => {
  it('seq(null) returns null', () => {
    expect(seq(null)).toBe(null);
  });

  it('first(null) returns null', () => {
    expect(first(null)).toBe(null);
  });

  it('rest(null) returns empty list', () => {
    expect(rest(null)).toBe(EMPTY_LIST);
  });

  it('next(null) returns null', () => {
    expect(next(null)).toBe(null);
  });
});

describe('seq on list', () => {
  it('seq on empty list returns null', () => {
    expect(seq(EMPTY_LIST)).toBe(null);
  });

  it('seq on non-empty list returns the list', () => {
    const l = list(1, 2, 3);
    expect(seq(l)).toBe(l);
  });

  it('first/rest/next on list', () => {
    const l = list(1, 2, 3);
    expect(first(l)).toBe(1);
    expect(first(rest(l))).toBe(2);
    expect(first(next(l))).toBe(2);
  });

  it('next returns null at end', () => {
    const l = list(1);
    expect(next(l)).toBe(null);
  });
});

describe('seq on vector', () => {
  it('seq on empty vector returns null', () => {
    expect(seq(EMPTY_VECTOR)).toBe(null);
  });

  it('seq on vector returns seq-able', () => {
    const v = vector(1, 2, 3);
    const s = seq(v);
    expect(s).not.toBe(null);
    expect(first(s)).toBe(1);
  });

  it('can iterate entire vector via seq', () => {
    const v = vector(10, 20, 30);
    const result: unknown[] = [];
    let s = seq(v);
    while (s !== null) {
      result.push(first(s));
      s = next(s);
    }
    expect(result).toEqual([10, 20, 30]);
  });
});

describe('seq on JS array', () => {
  it('seq on empty array returns null', () => {
    expect(seq([])).toBe(null);
  });

  it('seq on array returns seq-able', () => {
    const s = seq([1, 2, 3]);
    expect(first(s)).toBe(1);
    expect(first(next(s))).toBe(2);
    expect(first(next(next(s)))).toBe(3);
    expect(next(next(next(s)))).toBe(null);
  });
});

describe('toArray', () => {
  it('converts null to empty array', () => {
    expect(toArray(null)).toEqual([]);
  });

  it('converts list to array', () => {
    expect(toArray(list(1, 2, 3))).toEqual([1, 2, 3]);
  });

  it('converts vector to array', () => {
    expect(toArray(vector(1, 2, 3))).toEqual([1, 2, 3]);
  });

  it('converts JS array seq', () => {
    expect(toArray(seq([4, 5, 6]))).toEqual([4, 5, 6]);
  });
});

describe('into', () => {
  it('into empty vector from list', () => {
    const result = into(EMPTY_VECTOR, list(1, 2, 3));
    expect(result.count).toBe(3);
    expect(result.nth(0)).toBe(1);
    expect(result.nth(2)).toBe(3);
  });
});

describe('seq on hash-map', () => {
  it('seq on empty map returns null', () => {
    expect(seq(EMPTY_MAP)).toBe(null);
  });

  it('seq on map returns entries as [key val] vectors', () => {
    const m = hashMap(keyword('a'), 1, keyword('b'), 2);
    const s = seq(m);
    expect(s).not.toBe(null);
    const entry = first(s);
    expect(isVector(entry)).toBe(true);
    expect(get(entry, 0, null)).toEqual(keyword('a'));
    expect(get(entry, 1, null)).toBe(1);
  });

  it('can iterate all map entries via seq', () => {
    const m = hashMap(keyword('x'), 10, keyword('y'), 20);
    const arr = toArray(m);
    expect(arr.length).toBe(2);
  });
});

describe('seq on hash-set', () => {
  it('seq on empty set returns null', () => {
    expect(seq(EMPTY_SET)).toBe(null);
  });

  it('seq on set returns elements', () => {
    const s = hashSet(1, 2, 3);
    const arr = toArray(s);
    expect(arr.length).toBe(3);
    expect(arr.sort()).toEqual([1, 2, 3]);
  });
});

describe('nth', () => {
  it('nth on nil returns null', () => {
    expect(nth(null, 0)).toBe(null);
    expect(nth(null, 5)).toBe(null);
  });

  it('nth on nil with not-found returns not-found', () => {
    expect(nth(null, 0, 'default')).toBe('default');
  });

  it('nth on vector returns element', () => {
    const v = vector(10, 20, 30);
    expect(nth(v, 0)).toBe(10);
    expect(nth(v, 2)).toBe(30);
  });

  it('nth on vector out of bounds throws', () => {
    const v = vector(10, 20, 30);
    expect(() => nth(v, 5)).toThrow('Index out of bounds');
  });

  it('nth on vector out of bounds with not-found', () => {
    const v = vector(10, 20, 30);
    expect(nth(v, 5, 'nf')).toBe('nf');
  });

  it('nth on JS array', () => {
    expect(nth([1, 2, 3], 1)).toBe(2);
    expect(() => nth([1], 5)).toThrow();
    expect(nth([1], 5, -1)).toBe(-1);
  });

  it('nth on string returns character', () => {
    expect(nth('hello', 0)).toBe('h');
    expect(nth('hello', 4)).toBe('o');
    expect(() => nth('hello', 10)).toThrow();
    expect(nth('hello', 10, null)).toBe(null);
  });

  it('nth on list via seq traversal', () => {
    const l = list(10, 20, 30);
    expect(nth(l, 0)).toBe(10);
    expect(nth(l, 2)).toBe(30);
    expect(() => nth(l, 5)).toThrow();
    expect(nth(l, 5, 'nf')).toBe('nf');
  });

  it('nth negative index throws on vector', () => {
    expect(() => nth(vector(1, 2), -1)).toThrow();
  });
});
