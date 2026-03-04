import { describe, it, expect } from 'vitest';
import { keyword } from '../../src/runtime/keyword.js';
import { vector } from '../../src/runtime/vector.js';
import { hashMap } from '../../src/runtime/hash-map.js';
import { hashSet } from '../../src/runtime/hash-set.js';
import { list } from '../../src/runtime/list.js';
import { cljToJs, jsToClj } from '../../src/runtime/interop.js';

describe('cljToJs', () => {
  it('passes through primitives', () => {
    expect(cljToJs(42)).toBe(42);
    expect(cljToJs('hello')).toBe('hello');
    expect(cljToJs(true)).toBe(true);
    expect(cljToJs(null)).toBe(null);
    expect(cljToJs(undefined)).toBe(undefined);
  });

  it('converts keyword to string', () => {
    expect(cljToJs(keyword('foo'))).toBe('foo');
    expect(cljToJs(keyword('bar', 'ns'))).toBe('ns/bar');
  });

  it('converts vector to array', () => {
    const result = cljToJs(vector(1, 2, 3));
    expect(result).toEqual([1, 2, 3]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('converts list to array', () => {
    const result = cljToJs(list(1, 2, 3));
    expect(result).toEqual([1, 2, 3]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('converts hash-map to object', () => {
    const m = hashMap(keyword('a'), 1, keyword('b'), 2);
    const result = cljToJs(m) as Record<string, unknown>;
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it('converts hash-map with string keys', () => {
    const m = hashMap('x', 10, 'y', 20);
    const result = cljToJs(m) as Record<string, unknown>;
    expect(result).toEqual({ x: 10, y: 20 });
  });

  it('converts hash-set to array', () => {
    const s = hashSet(1, 2, 3);
    const result = cljToJs(s) as unknown[];
    expect(Array.isArray(result)).toBe(true);
    expect(result.sort()).toEqual([1, 2, 3]);
  });

  it('deeply converts nested structures', () => {
    const m = hashMap(keyword('items'), vector(hashMap(keyword('id'), 1)));
    const result = cljToJs(m) as Record<string, unknown>;
    expect(result).toEqual({ items: [{ id: 1 }] });
  });
});

describe('jsToClj', () => {
  it('passes through primitives', () => {
    expect(jsToClj(42)).toBe(42);
    expect(jsToClj('hello')).toBe('hello');
    expect(jsToClj(true)).toBe(true);
    expect(jsToClj(null)).toBe(null);
    expect(jsToClj(undefined)).toBe(undefined);
  });

  it('converts array to vector', () => {
    const result = jsToClj([1, 2, 3]);
    expect(result).toEqual(vector(1, 2, 3));
  });

  it('converts object to hash-map with keyword keys', () => {
    const result = jsToClj({ a: 1, b: 2 });
    const expected = hashMap(keyword('a'), 1, keyword('b'), 2);
    expect(result).toEqual(expected);
  });

  it('deeply converts nested structures', () => {
    const result = jsToClj({ items: [{ id: 1 }] });
    const expected = hashMap(keyword('items'), vector(hashMap(keyword('id'), 1)));
    expect(result).toEqual(expected);
  });

  it('passes through JS arrays already', () => {
    const arr = [1, [2, 3]];
    const result = jsToClj(arr);
    // Should convert inner array too
    expect(result).toEqual(vector(1, vector(2, 3)));
  });
});
