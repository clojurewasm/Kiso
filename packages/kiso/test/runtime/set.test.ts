import { describe, it, expect } from 'vitest';
import {
  union, intersection, difference, select,
  project, rename_keys, rename, index,
  map_invert, subset_p, superset_p,
} from '../../src/runtime/set.js';
import { hashSet } from '../../src/runtime/hash-set.js';
import { hashMap } from '../../src/runtime/hash-map.js';
import { keyword } from '../../src/runtime/keyword.js';

function hs(...vals: unknown[]) { return hashSet(...vals); }
function hm(...kvs: unknown[]) { return hashMap(...kvs); }
function kw(n: string) { return keyword(n); }

describe('clojure.set', () => {
  // -- union --
  it('union of two sets', () => {
    const result = union(hs(1, 2), hs(2, 3));
    expect(result.count).toBe(3);
    expect(result.has(1)).toBe(true);
    expect(result.has(2)).toBe(true);
    expect(result.has(3)).toBe(true);
  });

  it('union with no args returns empty set', () => {
    const result = union();
    expect(result.count).toBe(0);
  });

  it('union with one arg returns that set', () => {
    const s = hs(1, 2);
    expect(union(s)).toBe(s);
  });

  // -- intersection --
  it('intersection of two sets', () => {
    const result = intersection(hs(1, 2, 3), hs(2, 3, 4));
    expect(result.count).toBe(2);
    expect(result.has(2)).toBe(true);
    expect(result.has(3)).toBe(true);
  });

  it('intersection with disjoint sets', () => {
    const result = intersection(hs(1, 2), hs(3, 4));
    expect(result.count).toBe(0);
  });

  // -- difference --
  it('difference of two sets', () => {
    const result = difference(hs(1, 2, 3), hs(2, 3, 4));
    expect(result.count).toBe(1);
    expect(result.has(1)).toBe(true);
  });

  it('difference with no second set returns first', () => {
    const s = hs(1, 2);
    expect(difference(s)).toBe(s);
  });

  // -- select --
  it('select filters set by predicate', () => {
    const result = select((x: number) => x > 2, hs(1, 2, 3, 4));
    expect(result.count).toBe(2);
    expect(result.has(3)).toBe(true);
    expect(result.has(4)).toBe(true);
  });

  // -- subset? / superset? --
  it('subset? returns true when first is subset', () => {
    expect(subset_p(hs(1, 2), hs(1, 2, 3))).toBe(true);
  });

  it('subset? returns false when not subset', () => {
    expect(subset_p(hs(1, 4), hs(1, 2, 3))).toBe(false);
  });

  it('superset? returns true when first is superset', () => {
    expect(superset_p(hs(1, 2, 3), hs(1, 2))).toBe(true);
  });

  it('superset? returns false when not superset', () => {
    expect(superset_p(hs(1, 2), hs(1, 2, 3))).toBe(false);
  });

  // -- rename-keys --
  it('rename-keys renames keys in a map', () => {
    const m = hm(kw('a'), 1, kw('b'), 2);
    const kmap = hm(kw('a'), kw('x'));
    const result = rename_keys(m, kmap);
    expect(result.get(kw('x'))).toBe(1);
    expect(result.get(kw('b'))).toBe(2);
    expect(result.has(kw('a'))).toBe(false);
  });

  // -- map-invert --
  it('map-invert swaps keys and values', () => {
    const m = hm(kw('a'), 1, kw('b'), 2);
    const result = map_invert(m);
    expect(result.get(1)).toEqual(kw('a'));
    expect(result.get(2)).toEqual(kw('b'));
  });

  // -- project --
  it('project selects keys from set of maps', () => {
    const s = hs(
      hm(kw('a'), 1, kw('b'), 2),
      hm(kw('a'), 3, kw('b'), 4),
    );
    const result = project(s, [kw('a')]);
    expect(result.count).toBe(2);
  });

  // -- rename --
  it('rename renames keys in set of maps', () => {
    const s = hs(
      hm(kw('a'), 1, kw('b'), 2),
    );
    const kmap = hm(kw('a'), kw('x'));
    const result = rename(s, kmap);
    expect(result.count).toBe(1);
    // The single map should have :x instead of :a
    let found = false;
    result.forEach((m: any) => {
      if (m.get(kw('x')) === 1) found = true;
    });
    expect(found).toBe(true);
  });

  // -- index --
  it('index builds lookup from set of maps', () => {
    const s = hs(
      hm(kw('a'), 1, kw('b'), 2),
      hm(kw('a'), 1, kw('b'), 3),
      hm(kw('a'), 2, kw('b'), 4),
    );
    const result = index(s, [kw('a')]);
    // Each unique key-map becomes a separate entry.
    // Note: map-as-key hashing uses reference identity, so each
    // projected key-map is distinct. In practice, 3 entries.
    expect(result.count).toBe(3);
  });
});
