import { describe, it, expect } from 'vitest';
import { keyword, isKeyword, Keyword } from '../../src/runtime/keyword.js';

describe('keyword creation', () => {
  it('creates unqualified keyword', () => {
    const k = keyword('foo');
    expect(k.name).toBe('foo');
    expect(k.ns).toBe(null);
  });

  it('creates namespaced keyword', () => {
    const k = keyword('foo', 'my.ns');
    expect(k.name).toBe('foo');
    expect(k.ns).toBe('my.ns');
  });
});

describe('keyword interning', () => {
  it('same unqualified keyword is identical (interned)', () => {
    const a = keyword('bar');
    const b = keyword('bar');
    expect(a).toBe(b); // same reference
  });

  it('same namespaced keyword is identical', () => {
    const a = keyword('baz', 'ns');
    const b = keyword('baz', 'ns');
    expect(a).toBe(b);
  });

  it('different keywords are not identical', () => {
    const a = keyword('x');
    const b = keyword('y');
    expect(a).not.toBe(b);
  });

  it('same name different ns are not identical', () => {
    const a = keyword('foo', 'a');
    const b = keyword('foo', 'b');
    expect(a).not.toBe(b);
  });

  it('unqualified and namespaced are not identical', () => {
    const a = keyword('foo');
    const b = keyword('foo', 'ns');
    expect(a).not.toBe(b);
  });
});

describe('keyword toString', () => {
  it('unqualified keyword', () => {
    expect(keyword('foo').toString()).toBe(':foo');
  });

  it('namespaced keyword', () => {
    expect(keyword('bar', 'ns').toString()).toBe(':ns/bar');
  });
});

describe('isKeyword', () => {
  it('true for keywords', () => {
    expect(isKeyword(keyword('foo'))).toBe(true);
  });

  it('false for other values', () => {
    expect(isKeyword('foo')).toBe(false);
    expect(isKeyword(42)).toBe(false);
    expect(isKeyword(null)).toBe(false);
    expect(isKeyword({})).toBe(false);
  });
});

describe('keyword as function (IFn)', () => {
  it('keyword invoked on a hash-map performs lookup', async () => {
    const { hashMap } = await import('../../src/runtime/hash-map.js');
    const k = keyword('foo');
    const m = hashMap(k, 42);
    expect(k(m)).toBe(42);
  });

  it('keyword invoked on a hash-map returns notFound when key missing', async () => {
    const { hashMap } = await import('../../src/runtime/hash-map.js');
    const k = keyword('foo');
    const other = keyword('bar');
    const m = hashMap(other, 99);
    expect(k(m)).toBe(null);
    expect(k(m, 'default')).toBe('default');
  });

  it('keyword invoked on nil returns null', () => {
    const k = keyword('foo');
    expect(k(null)).toBe(null);
    expect(k(undefined)).toBe(null);
  });

  it('callable keyword is still interned', () => {
    const a = keyword('ifn-test');
    const b = keyword('ifn-test');
    expect(a).toBe(b);
  });

  it('callable keyword passes isKeyword', () => {
    const k = keyword('callable');
    expect(isKeyword(k)).toBe(true);
  });

  it('callable keyword has correct name/ns/hash', () => {
    const k = keyword('x', 'my.ns');
    expect(k.name).toBe('x');
    expect(k.ns).toBe('my.ns');
    expect(typeof k.hash).toBe('number');
  });

  it('callable keyword toString works', () => {
    expect(keyword('bar').toString()).toBe(':bar');
    expect(keyword('baz', 'ns').toString()).toBe(':ns/baz');
  });
});

describe('keyword hashing', () => {
  it('has a hash property', () => {
    const k = keyword('foo');
    expect(typeof k.hash).toBe('number');
    expect(Number.isInteger(k.hash)).toBe(true);
  });

  it('same keyword same hash', () => {
    expect(keyword('foo').hash).toBe(keyword('foo').hash);
  });

  it('different keywords (usually) different hash', () => {
    expect(keyword('foo').hash).not.toBe(keyword('bar').hash);
  });
});
