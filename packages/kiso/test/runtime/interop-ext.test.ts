/**
 * Tests for extended JS interop: bean, js-obj, js-array.
 */
import { describe, it, expect } from 'vitest';
import { bean, js_obj, js_array } from '../../src/runtime/interop.js';
import { keyword, isKeyword } from '../../src/runtime/keyword.js';
import { vector } from '../../src/runtime/vector.js';
import { hashMap, PersistentHashMap } from '../../src/runtime/hash-map.js';
import { list } from '../../src/runtime/list.js';

// ── bean ──

describe('bean', () => {
  it('converts JS object to persistent map with keyword keys', () => {
    const result = bean({ name: 'Alice', age: 30 }) as PersistentHashMap;
    expect(result.get(keyword('name'))).toBe('Alice');
    expect(result.get(keyword('age'))).toBe(30);
  });

  it('is shallow — nested objects remain as JS objects', () => {
    const inner = { x: 1 };
    const result = bean({ nested: inner }) as PersistentHashMap;
    expect(result.get(keyword('nested'))).toBe(inner); // same reference
  });

  it('handles empty object', () => {
    const result = bean({}) as PersistentHashMap;
    expect(result.count).toBe(0);
  });

  it('handles null/undefined', () => {
    expect(bean(null)).toBe(null);
    expect(bean(undefined)).toBe(null);
  });
});

// ── js-obj ──

describe('js_obj', () => {
  it('converts persistent map to plain JS object', () => {
    const m = hashMap(keyword('name'), 'Alice', keyword('age'), 30);
    const result = js_obj(m) as Record<string, unknown>;
    expect(result.name).toBe('Alice');
    expect(result.age).toBe(30);
  });

  it('is shallow — nested maps remain as persistent maps', () => {
    const inner = hashMap(keyword('x'), 1);
    const m = hashMap(keyword('nested'), inner);
    const result = js_obj(m) as Record<string, unknown>;
    expect(result.nested).toBe(inner); // same reference, not converted
  });

  it('uses keyword name as key', () => {
    const m = hashMap(keyword('foo-bar'), 42);
    const result = js_obj(m) as Record<string, unknown>;
    expect(result['foo-bar']).toBe(42);
  });

  it('handles empty map', () => {
    const result = js_obj(hashMap()) as Record<string, unknown>;
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('also accepts key-value pairs like cljs js-obj', () => {
    const result = js_obj('name', 'Alice', 'age', 30) as Record<string, unknown>;
    expect(result.name).toBe('Alice');
    expect(result.age).toBe(30);
  });
});

// ── js-array ──

describe('js_array', () => {
  it('converts persistent vector to JS array', () => {
    const v = vector(1, 2, 3);
    const result = js_array(v) as unknown[];
    expect(result).toEqual([1, 2, 3]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('is shallow — nested vectors remain as persistent vectors', () => {
    const inner = vector(4, 5);
    const v = vector(1, inner, 3);
    const result = js_array(v) as unknown[];
    expect(result[1]).toBe(inner); // same reference
  });

  it('converts list to JS array', () => {
    const l = list(1, 2, 3);
    const result = js_array(l) as unknown[];
    expect(result).toEqual([1, 2, 3]);
  });

  it('handles empty vector', () => {
    const result = js_array(vector()) as unknown[];
    expect(result).toEqual([]);
  });
});
