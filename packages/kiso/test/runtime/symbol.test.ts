import { describe, it, expect } from 'vitest';
import { symbol, isSymbol } from '../../src/runtime/symbol.js';
import { keyword } from '../../src/runtime/keyword.js';

describe('symbol creation', () => {
  it('creates unqualified symbol', () => {
    const s = symbol('foo');
    expect(s.name).toBe('foo');
    expect(s.ns).toBe(null);
  });

  it('creates namespaced symbol', () => {
    const s = symbol('foo', 'my.ns');
    expect(s.name).toBe('foo');
    expect(s.ns).toBe('my.ns');
  });
});

describe('symbol identity', () => {
  it('symbols are NOT interned (new instance each time)', () => {
    const a = symbol('foo');
    const b = symbol('foo');
    expect(a).not.toBe(b); // different references
  });
});

describe('symbol toString', () => {
  it('unqualified symbol', () => {
    expect(symbol('foo').toString()).toBe('foo');
  });

  it('namespaced symbol', () => {
    expect(symbol('bar', 'ns').toString()).toBe('ns/bar');
  });
});

describe('isSymbol', () => {
  it('true for symbols', () => {
    expect(isSymbol(symbol('foo'))).toBe(true);
  });

  it('false for other values', () => {
    expect(isSymbol('foo')).toBe(false);
    expect(isSymbol(42)).toBe(false);
    expect(isSymbol(null)).toBe(false);
    expect(isSymbol({})).toBe(false);
  });
});

describe('symbol hashing', () => {
  it('has a hash property', () => {
    const s = symbol('foo');
    expect(typeof s.hash).toBe('number');
    expect(Number.isInteger(s.hash)).toBe(true);
  });

  it('same-name symbols have same hash', () => {
    expect(symbol('foo').hash).toBe(symbol('foo').hash);
  });

  it('different-name symbols (usually) have different hash', () => {
    expect(symbol('foo').hash).not.toBe(symbol('bar').hash);
  });

  it('symbol and keyword with same name have different hash', () => {
    // Different hash seeds ensure this
    expect(symbol('foo').hash).not.toBe(keyword('foo').hash);
  });
});
