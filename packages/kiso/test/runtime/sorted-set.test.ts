/**
 * PersistentTreeSet — Sorted set backed by PersistentTreeMap.
 */
import { describe, it, expect } from 'vitest';
import { PersistentTreeSet, sortedSet, isSortedSet, EMPTY_SORTED_SET } from '../../src/runtime/sorted-set.js';
import { keyword } from '../../src/runtime/keyword.js';

describe('PersistentTreeSet', () => {
  // -- Construction --

  it('creates empty sorted set', () => {
    expect(EMPTY_SORTED_SET.count).toBe(0);
    expect(isSortedSet(EMPTY_SORTED_SET)).toBe(true);
  });

  it('creates sorted set from items', () => {
    const s = sortedSet(3, 1, 2);
    expect(s.count).toBe(3);
    expect(s.has(1)).toBe(true);
    expect(s.has(2)).toBe(true);
    expect(s.has(3)).toBe(true);
  });

  // -- has --

  it('returns false for missing element', () => {
    const s = sortedSet(1, 2, 3);
    expect(s.has(99)).toBe(false);
  });

  // -- conj --

  it('adds element', () => {
    const s = EMPTY_SORTED_SET.conj(2).conj(1).conj(3);
    expect(s.count).toBe(3);
  });

  it('conj duplicate returns same instance', () => {
    const s = sortedSet(1, 2, 3);
    expect(s.conj(2)).toBe(s);
  });

  // -- disj --

  it('removes element', () => {
    const s = sortedSet(1, 2, 3).disj(2);
    expect(s.count).toBe(2);
    expect(s.has(2)).toBe(false);
  });

  it('disj missing element returns same instance', () => {
    const s = sortedSet(1, 2, 3);
    expect(s.disj(99)).toBe(s);
  });

  // -- Sorted order --

  it('iterates in sorted order', () => {
    const s = sortedSet(3, 1, 4, 1, 5, 9, 2, 6);
    const items: number[] = [];
    s.forEach((x) => items.push(x as number));
    expect(items).toEqual([1, 2, 3, 4, 5, 6, 9]);
  });

  it('iterates keywords in sorted order', () => {
    const s = sortedSet(keyword('c'), keyword('a'), keyword('b'));
    const items: string[] = [];
    s.forEach((x) => items.push(String(x)));
    expect(items).toEqual([':a', ':b', ':c']);
  });

  // -- Deduplication --

  it('deduplicates on construction', () => {
    const s = sortedSet(1, 2, 3, 2, 1);
    expect(s.count).toBe(3);
  });

  // -- Type predicate --

  it('isSortedSet distinguishes types', () => {
    expect(isSortedSet({})).toBe(false);
    expect(isSortedSet(null)).toBe(false);
    expect(isSortedSet(sortedSet(1, 2))).toBe(true);
  });

  // -- Stress --

  it('handles many elements correctly', () => {
    let s: PersistentTreeSet = EMPTY_SORTED_SET;
    for (let i = 100; i >= 1; i--) {
      s = s.conj(i);
    }
    expect(s.count).toBe(100);
    const items: number[] = [];
    s.forEach((x) => items.push(x as number));
    for (let i = 0; i < 99; i++) {
      expect(items[i]).toBeLessThan(items[i + 1]);
    }
  });
});
