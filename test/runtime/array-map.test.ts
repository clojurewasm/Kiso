import { describe, it, expect } from 'vitest';
import { arrayMap, PersistentArrayMap } from '../../src/runtime/array-map.js';
import { PersistentHashMap } from '../../src/runtime/hash-map.js';
import { keyword } from '../../src/runtime/keyword.js';

describe('PersistentArrayMap', () => {
  it('creates empty array map', () => {
    const m = arrayMap();
    expect(m.count).toBe(0);
  });

  it('creates array map with key-value pairs', () => {
    const m = arrayMap('a', 1, 'b', 2);
    expect(m.count).toBe(2);
    expect(m.get('a')).toBe(1);
    expect(m.get('b')).toBe(2);
  });

  it('get returns undefined for missing key', () => {
    const m = arrayMap('a', 1);
    expect(m.get('z')).toBeUndefined();
  });

  it('get with notFound returns notFound for missing key', () => {
    const m = arrayMap('a', 1);
    expect(m.get('z', 'default')).toBe('default');
  });

  it('assoc adds a new key', () => {
    const m = arrayMap('a', 1);
    const m2 = m.assoc('b', 2);
    expect(m2.count).toBe(2);
    expect(m2.get('b')).toBe(2);
    // Original unchanged
    expect(m.count).toBe(1);
  });

  it('assoc updates existing key', () => {
    const m = arrayMap('a', 1);
    const m2 = m.assoc('a', 99);
    expect(m2.count).toBe(1);
    expect(m2.get('a')).toBe(99);
  });

  it('dissoc removes a key', () => {
    const m = arrayMap('a', 1, 'b', 2, 'c', 3);
    const m2 = m.dissoc('b');
    expect(m2.count).toBe(2);
    expect(m2.get('b')).toBeUndefined();
    expect(m2.get('a')).toBe(1);
    expect(m2.get('c')).toBe(3);
  });

  it('dissoc on missing key returns same map', () => {
    const m = arrayMap('a', 1);
    const m2 = m.dissoc('z');
    expect(m2).toBe(m);
  });

  it('has returns true/false', () => {
    const m = arrayMap('a', 1);
    expect(m.has('a')).toBe(true);
    expect(m.has('z')).toBe(false);
  });

  it('works with keyword keys', () => {
    const k = keyword('name');
    const m = arrayMap(k, 'Alice');
    expect(m.get(k)).toBe('Alice');
  });

  it('forEach iterates all entries', () => {
    const m = arrayMap('x', 10, 'y', 20);
    const entries: [unknown, unknown][] = [];
    m.forEach((k, v) => entries.push([k, v]));
    expect(entries).toHaveLength(2);
    expect(entries).toContainEqual(['x', 10]);
    expect(entries).toContainEqual(['y', 20]);
  });

  describe('auto-promotion to HAMT', () => {
    it('promotes to PersistentHashMap when exceeding threshold', () => {
      let m: PersistentArrayMap | PersistentHashMap = arrayMap();
      for (let i = 0; i < 9; i++) {
        m = m.assoc(`key${i}`, i) as PersistentArrayMap | PersistentHashMap;
      }
      // After 9 entries, should be a HAMT
      expect(m).toBeInstanceOf(PersistentHashMap);
      expect(m.count).toBe(9);
    });

    it('stays ArrayMap at threshold', () => {
      let m: PersistentArrayMap | PersistentHashMap = arrayMap();
      for (let i = 0; i < 8; i++) {
        m = m.assoc(`key${i}`, i) as PersistentArrayMap | PersistentHashMap;
      }
      expect(m).toBeInstanceOf(PersistentArrayMap);
      expect(m.count).toBe(8);
    });
  });
});
