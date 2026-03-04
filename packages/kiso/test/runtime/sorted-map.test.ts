/**
 * PersistentTreeMap — Sorted map backed by red-black tree.
 */
import { describe, it, expect } from 'vitest';
import { PersistentTreeMap, sortedMap, isSortedMap, EMPTY_SORTED_MAP } from '../../src/runtime/sorted-map.js';
import { keyword } from '../../src/runtime/keyword.js';

describe('PersistentTreeMap', () => {
  // -- Construction --

  it('creates empty sorted map', () => {
    expect(EMPTY_SORTED_MAP.count).toBe(0);
    expect(isSortedMap(EMPTY_SORTED_MAP)).toBe(true);
  });

  it('creates sorted map from key-value pairs', () => {
    const m = sortedMap('b', 2, 'a', 1, 'c', 3);
    expect(m.count).toBe(3);
    expect(m.get('a')).toBe(1);
    expect(m.get('b')).toBe(2);
    expect(m.get('c')).toBe(3);
  });

  // -- get --

  it('returns undefined for missing key', () => {
    const m = sortedMap('a', 1);
    expect(m.get('z')).toBeUndefined();
  });

  // -- has --

  it('checks key existence', () => {
    const m = sortedMap('a', 1, 'b', 2);
    expect(m.has('a')).toBe(true);
    expect(m.has('z')).toBe(false);
  });

  // -- assoc --

  it('adds new key-value pair', () => {
    const m = EMPTY_SORTED_MAP.assoc('b', 2).assoc('a', 1);
    expect(m.count).toBe(2);
    expect(m.get('a')).toBe(1);
    expect(m.get('b')).toBe(2);
  });

  it('replaces existing key', () => {
    const m = sortedMap('a', 1).assoc('a', 99);
    expect(m.count).toBe(1);
    expect(m.get('a')).toBe(99);
  });

  it('returns same instance when value unchanged', () => {
    const m = sortedMap('a', 1);
    expect(m.assoc('a', 1)).toBe(m);
  });

  // -- dissoc --

  it('removes a key', () => {
    const m = sortedMap('a', 1, 'b', 2, 'c', 3).dissoc('b');
    expect(m.count).toBe(2);
    expect(m.has('b')).toBe(false);
    expect(m.has('a')).toBe(true);
    expect(m.has('c')).toBe(true);
  });

  it('dissoc on missing key returns same instance', () => {
    const m = sortedMap('a', 1);
    expect(m.dissoc('z')).toBe(m);
  });

  it('dissoc all keys returns empty', () => {
    const m = sortedMap('a', 1).dissoc('a');
    expect(m.count).toBe(0);
  });

  // -- Sorted order (forEach) --

  it('iterates in sorted key order', () => {
    const m = sortedMap('c', 3, 'a', 1, 'b', 2);
    const keys: string[] = [];
    m.forEach((k) => keys.push(k as string));
    expect(keys).toEqual(['a', 'b', 'c']);
  });

  it('iterates number keys in sorted order', () => {
    const m = sortedMap(3, 'c', 1, 'a', 2, 'b');
    const keys: number[] = [];
    m.forEach((k) => keys.push(k as number));
    expect(keys).toEqual([1, 2, 3]);
  });

  it('iterates keyword keys in sorted order', () => {
    const m = sortedMap(keyword('c'), 3, keyword('a'), 1, keyword('b'), 2);
    const keys: string[] = [];
    m.forEach((k) => keys.push(String(k)));
    expect(keys).toEqual([':a', ':b', ':c']);
  });

  // -- keys / vals --

  it('returns keys in sorted order', () => {
    const m = sortedMap('c', 3, 'a', 1, 'b', 2);
    expect(m.keys()).toEqual(['a', 'b', 'c']);
  });

  it('returns vals in key-sorted order', () => {
    const m = sortedMap('c', 3, 'a', 1, 'b', 2);
    expect(m.vals()).toEqual([1, 2, 3]);
  });

  // -- Nil key --

  it('handles nil key', () => {
    const m = sortedMap(null, 'nil-val', 'a', 1);
    expect(m.count).toBe(2);
    expect(m.get(null)).toBe('nil-val');
    // nil sorts before everything
    const keys: unknown[] = [];
    m.forEach((k) => keys.push(k));
    expect(keys[0]).toBe(null);
  });

  // -- Custom comparator --

  it('supports custom comparator', () => {
    const descending = (a: unknown, b: unknown) => {
      return (b as number) - (a as number);
    };
    const m = sortedMap(descending, 1, 'a', 3, 'c', 2, 'b');
    const keys: number[] = [];
    m.forEach((k) => keys.push(k as number));
    expect(keys).toEqual([3, 2, 1]);
  });

  // -- Stress: many keys --

  it('handles many insertions correctly', () => {
    let m: PersistentTreeMap = EMPTY_SORTED_MAP;
    for (let i = 100; i >= 1; i--) {
      m = m.assoc(i, i * 10);
    }
    expect(m.count).toBe(100);
    expect(m.get(1)).toBe(10);
    expect(m.get(50)).toBe(500);
    expect(m.get(100)).toBe(1000);

    // Verify sorted order
    const keys: number[] = [];
    m.forEach((k) => keys.push(k as number));
    for (let i = 0; i < 99; i++) {
      expect(keys[i]).toBeLessThan(keys[i + 1]);
    }
  });

  it('handles many deletions correctly', () => {
    let m: PersistentTreeMap = EMPTY_SORTED_MAP;
    for (let i = 1; i <= 50; i++) {
      m = m.assoc(i, i);
    }
    // Delete even numbers
    for (let i = 2; i <= 50; i += 2) {
      m = m.dissoc(i);
    }
    expect(m.count).toBe(25);
    const keys: number[] = [];
    m.forEach((k) => keys.push(k as number));
    expect(keys).toEqual(Array.from({ length: 25 }, (_, i) => i * 2 + 1));
  });

  // -- subseq / rsubseq --

  it('subseq returns entries from key onwards', () => {
    const m = sortedMap(1, 'a', 2, 'b', 3, 'c', 4, 'd', 5, 'e');
    const entries = m.subseq(3);
    expect(entries.map(([k]) => k)).toEqual([3, 4, 5]);
  });

  it('subseq with exclusive start', () => {
    const m = sortedMap(1, 'a', 2, 'b', 3, 'c', 4, 'd', 5, 'e');
    const entries = m.subseq(3, false);
    expect(entries.map(([k]) => k)).toEqual([4, 5]);
  });

  it('rsubseq returns entries up to key in reverse', () => {
    const m = sortedMap(1, 'a', 2, 'b', 3, 'c', 4, 'd', 5, 'e');
    const entries = m.rsubseq(3);
    expect(entries.map(([k]) => k)).toEqual([3, 2, 1]);
  });

  it('rsubseq with exclusive end', () => {
    const m = sortedMap(1, 'a', 2, 'b', 3, 'c', 4, 'd', 5, 'e');
    const entries = m.rsubseq(3, false);
    expect(entries.map(([k]) => k)).toEqual([2, 1]);
  });

  // -- Type predicate --

  it('isSortedMap distinguishes from plain object', () => {
    expect(isSortedMap({})).toBe(false);
    expect(isSortedMap(null)).toBe(false);
    expect(isSortedMap(sortedMap('a', 1))).toBe(true);
  });
});
