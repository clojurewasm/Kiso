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
