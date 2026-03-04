import { describe, it, expect } from 'vitest';
import {
  walk, postwalk, prewalk,
  postwalk_replace, prewalk_replace,
  stringify_keys, keywordize_keys,
} from '../../src/runtime/walk.js';
import { hashMap } from '../../src/runtime/hash-map.js';
import { vector } from '../../src/runtime/vector.js';
import { keyword } from '../../src/runtime/keyword.js';
import { list, isList } from '../../src/runtime/list.js';
import { hashSet } from '../../src/runtime/hash-set.js';
import { first } from '../../src/runtime/seq.js';

function kw(n: string) { return keyword(n); }

describe('clojure.walk', () => {
  // -- walk --
  it('walk applies inner then outer to a vector', () => {
    const v = vector(1, 2, 3);
    const result = walk(
      (x: unknown) => typeof x === 'number' ? (x as number) + 1 : x,
      (x: unknown) => x,
      v,
    );
    // Each element incremented
    expect((result as any).nth(0)).toBe(2);
    expect((result as any).nth(1)).toBe(3);
    expect((result as any).nth(2)).toBe(4);
  });

  it('walk applies inner then outer to a map', () => {
    const m = hashMap(kw('a'), 1);
    const result = walk(
      (entry: unknown) => entry, // identity on entries
      (x: unknown) => x, // identity outer
      m,
    );
    expect((result as any).get(kw('a'))).toBe(1);
  });

  // -- postwalk --
  it('postwalk increments all numbers in nested structure', () => {
    const v = vector(1, vector(2, 3));
    const result = postwalk(
      (x: unknown) => typeof x === 'number' ? (x as number) + 10 : x,
      v,
    );
    expect((result as any).nth(0)).toBe(11);
    const inner = (result as any).nth(1);
    expect(inner.nth(0)).toBe(12);
    expect(inner.nth(1)).toBe(13);
  });

  // -- prewalk --
  it('prewalk transforms structure top-down', () => {
    const v = vector(1, 2, 3);
    const result = prewalk(
      (x: unknown) => typeof x === 'number' ? (x as number) * 2 : x,
      v,
    );
    expect((result as any).nth(0)).toBe(2);
    expect((result as any).nth(1)).toBe(4);
    expect((result as any).nth(2)).toBe(6);
  });

  // -- postwalk-replace --
  it('postwalk-replace substitutes values', () => {
    const v = vector(1, 2, 3);
    const smap = hashMap(1, 'one', 2, 'two');
    const result = postwalk_replace(smap, v);
    expect((result as any).nth(0)).toBe('one');
    expect((result as any).nth(1)).toBe('two');
    expect((result as any).nth(2)).toBe(3);
  });

  // -- prewalk-replace --
  it('prewalk-replace substitutes values', () => {
    const v = vector(1, 2, 3);
    const smap = hashMap(1, 'one', 2, 'two');
    const result = prewalk_replace(smap, v);
    expect((result as any).nth(0)).toBe('one');
    expect((result as any).nth(1)).toBe('two');
    expect((result as any).nth(2)).toBe(3);
  });

  // -- keywordize-keys --
  it('keywordize-keys converts string keys to keywords', () => {
    const m = hashMap('a', 1, 'b', hashMap('c', 2));
    const result = keywordize_keys(m);
    expect((result as any).get(kw('a'))).toBe(1);
    // Nested map also keywordized
    const inner = (result as any).get(kw('b'));
    expect(inner.get(kw('c'))).toBe(2);
  });

  // -- stringify-keys --
  it('stringify-keys converts keyword keys to strings', () => {
    const m = hashMap(kw('a'), 1, kw('b'), hashMap(kw('c'), 2));
    const result = stringify_keys(m);
    expect((result as any).get('a')).toBe(1);
    const inner = (result as any).get('b');
    expect(inner.get('c')).toBe(2);
  });

  // -- walk with list --
  it('walk preserves list type', () => {
    const l = list(1, 2, 3);
    const result = walk(
      (x: unknown) => typeof x === 'number' ? (x as number) + 1 : x,
      (x: unknown) => x,
      l,
    );
    expect(isList(result)).toBe(true);
    expect(first(result)).toBe(2);
  });

  // -- walk with set --
  it('walk works with sets', () => {
    const s = hashSet(1, 2, 3);
    const result = walk(
      (x: unknown) => typeof x === 'number' ? (x as number) * 10 : x,
      (x: unknown) => x,
      s,
    );
    expect((result as any).has(10)).toBe(true);
    expect((result as any).has(20)).toBe(true);
    expect((result as any).has(30)).toBe(true);
  });
});
