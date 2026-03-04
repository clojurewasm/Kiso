/**
 * Transient collections — Mutable variants for batch operations.
 */
import { describe, it, expect } from 'vitest';
import { vector, PersistentVector } from '../../src/runtime/vector.js';
import { hashMap, PersistentHashMap } from '../../src/runtime/hash-map.js';
import { hashSet, PersistentHashSet } from '../../src/runtime/hash-set.js';
import {
  transient, persistent_m, conj_m, assoc_m, dissoc_m, disj_m,
} from '../../src/runtime/transient.js';

describe('TransientVector', () => {
  it('creates transient from vector and conj!', () => {
    const v = vector(1, 2, 3);
    const t = transient(v);
    conj_m(t, 4);
    conj_m(t, 5);
    const result = persistent_m(t) as PersistentVector;
    expect(result.count).toBe(5);
    expect(result.nth(3)).toBe(4);
    expect(result.nth(4)).toBe(5);
  });

  it('original vector is not modified', () => {
    const v = vector(1, 2, 3);
    const t = transient(v);
    conj_m(t, 4);
    persistent_m(t);
    expect(v.count).toBe(3);
  });

  it('assoc! on transient vector', () => {
    const v = vector(1, 2, 3);
    const t = transient(v);
    assoc_m(t, 1, 99);
    const result = persistent_m(t) as PersistentVector;
    expect(result.nth(1)).toBe(99);
    expect(result.count).toBe(3);
  });

  it('builds vector from empty via conj!', () => {
    const t = transient(vector());
    for (let i = 0; i < 100; i++) {
      conj_m(t, i);
    }
    const result = persistent_m(t) as PersistentVector;
    expect(result.count).toBe(100);
    expect(result.nth(0)).toBe(0);
    expect(result.nth(99)).toBe(99);
  });
});

describe('TransientHashMap', () => {
  it('creates transient from map and assoc!', () => {
    const m = hashMap('a', 1);
    const t = transient(m);
    assoc_m(t, 'b', 2);
    assoc_m(t, 'c', 3);
    const result = persistent_m(t) as PersistentHashMap;
    expect(result.count).toBe(3);
    expect(result.get('b')).toBe(2);
    expect(result.get('c')).toBe(3);
  });

  it('dissoc! removes a key', () => {
    const m = hashMap('a', 1, 'b', 2, 'c', 3);
    const t = transient(m);
    dissoc_m(t, 'b');
    const result = persistent_m(t) as PersistentHashMap;
    expect(result.count).toBe(2);
    expect(result.has('b')).toBe(false);
  });

  it('original map is not modified', () => {
    const m = hashMap('a', 1);
    const t = transient(m);
    assoc_m(t, 'b', 2);
    persistent_m(t);
    expect(m.count).toBe(1);
  });

  it('builds map from empty via assoc!', () => {
    const t = transient(hashMap());
    for (let i = 0; i < 50; i++) {
      assoc_m(t, `key${i}`, i);
    }
    const result = persistent_m(t) as PersistentHashMap;
    expect(result.count).toBe(50);
    expect(result.get('key0')).toBe(0);
    expect(result.get('key49')).toBe(49);
  });
});

describe('TransientHashSet', () => {
  it('creates transient from set and conj!', () => {
    const s = hashSet(1, 2, 3);
    const t = transient(s);
    conj_m(t, 4);
    conj_m(t, 5);
    const result = persistent_m(t) as PersistentHashSet;
    expect(result.count).toBe(5);
    expect(result.has(4)).toBe(true);
    expect(result.has(5)).toBe(true);
  });

  it('disj! removes element', () => {
    const s = hashSet(1, 2, 3);
    const t = transient(s);
    disj_m(t, 2);
    const result = persistent_m(t) as PersistentHashSet;
    expect(result.count).toBe(2);
    expect(result.has(2)).toBe(false);
  });

  it('original set is not modified', () => {
    const s = hashSet(1, 2, 3);
    const t = transient(s);
    conj_m(t, 4);
    persistent_m(t);
    expect(s.count).toBe(3);
  });
});

describe('transient error handling', () => {
  it('throws on unsupported type', () => {
    expect(() => transient('string' as any)).toThrow();
  });

  it('throws when using transient after persistent!', () => {
    const t = transient(vector(1, 2, 3));
    persistent_m(t);
    expect(() => conj_m(t, 4)).toThrow();
  });
});
