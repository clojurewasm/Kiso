/**
 * Metadata — with-meta, meta, vary-meta on collections.
 */
import { describe, it, expect } from 'vitest';
import { vector } from '../../src/runtime/vector.js';
import { hashMap } from '../../src/runtime/hash-map.js';
import { hashSet } from '../../src/runtime/hash-set.js';
import { list } from '../../src/runtime/list.js';
import { keyword } from '../../src/runtime/keyword.js';
import {
  meta, with_meta, vary_meta,
} from '../../src/runtime/core.js';

describe('meta', () => {
  it('returns null for object with no metadata', () => {
    expect(meta(vector(1, 2, 3))).toBe(null);
  });

  it('returns null for non-object', () => {
    expect(meta(42)).toBe(null);
    expect(meta(null)).toBe(null);
  });
});

describe('with-meta', () => {
  it('attaches metadata to vector', () => {
    const v = vector(1, 2, 3);
    const m = hashMap(keyword('tag'), 'important');
    const v2 = with_meta(v, m);
    expect(meta(v2)).toBe(m);
    // Original unchanged
    expect(meta(v)).toBe(null);
  });

  it('attaches metadata to map', () => {
    const m = hashMap('a', 1);
    const md = hashMap(keyword('doc'), 'a map');
    const m2 = with_meta(m, md);
    expect(meta(m2)).toBe(md);
  });

  it('attaches metadata to set', () => {
    const s = hashSet(1, 2, 3);
    const md = hashMap(keyword('type'), 'numbers');
    const s2 = with_meta(s, md);
    expect(meta(s2)).toBe(md);
  });

  it('attaches metadata to list', () => {
    const l = list(1, 2, 3);
    const md = hashMap(keyword('source'), 'test');
    const l2 = with_meta(l, md);
    expect(meta(l2)).toBe(md);
  });

  it('replaces existing metadata', () => {
    const v = vector(1, 2, 3);
    const md1 = hashMap(keyword('a'), 1);
    const md2 = hashMap(keyword('b'), 2);
    const v1 = with_meta(v, md1);
    const v2 = with_meta(v1, md2);
    expect(meta(v2)).toBe(md2);
  });
});

describe('vary-meta', () => {
  it('applies function to current metadata', () => {
    const v = vector(1, 2, 3);
    const md = hashMap(keyword('count'), 0);
    const v1 = with_meta(v, md);
    const v2 = vary_meta(v1, (m: any) => {
      return hashMap(keyword('count'), 1);
    });
    expect((meta(v2) as any).get(keyword('count'))).toBe(1);
  });

  it('works when no prior metadata exists', () => {
    const v = vector(1, 2, 3);
    const v2 = vary_meta(v, () => hashMap(keyword('new'), true));
    expect((meta(v2) as any).get(keyword('new'))).toBe(true);
  });
});
