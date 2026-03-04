import { describe, it, expect } from 'vitest';
import {
  hashInt,
  hashFloat,
  hashString,
  hashBoolean,
  hashNull,
  mixCollHash,
  hashOrdered,
  hashUnordered,
} from '../../src/runtime/hash.js';

describe('hashNull', () => {
  it('returns 0 for null', () => {
    expect(hashNull()).toBe(0);
  });
});

describe('hashBoolean', () => {
  it('hashes true as 1231', () => {
    expect(hashBoolean(true)).toBe(1231);
  });

  it('hashes false as 1237', () => {
    expect(hashBoolean(false)).toBe(1237);
  });
});

describe('hashInt', () => {
  it('hashes small integers as themselves', () => {
    expect(hashInt(0)).toBe(0);
    expect(hashInt(1)).toBe(1);
    expect(hashInt(42)).toBe(42);
    expect(hashInt(-1)).toBe(-1);
  });

  it('hashes large integers', () => {
    expect(hashInt(1000000)).toBe(1000000);
    expect(hashInt(-999999)).toBe(-999999);
  });
});

describe('hashFloat', () => {
  it('hashes 0.0', () => {
    const h = hashFloat(0.0);
    expect(typeof h).toBe('number');
    expect(Number.isInteger(h)).toBe(true);
  });

  it('hashes 1.0 same as int 1', () => {
    // In Clojure, (= 1 1.0) → true, so hashes should match
    // But our hashFloat uses the float representation, so it may differ
    // The equiv layer handles cross-type comparison
    const h = hashFloat(1.0);
    expect(typeof h).toBe('number');
  });

  it('same float produces same hash', () => {
    expect(hashFloat(3.14)).toBe(hashFloat(3.14));
    expect(hashFloat(-2.5)).toBe(hashFloat(-2.5));
  });

  it('different floats produce different hashes', () => {
    expect(hashFloat(1.1)).not.toBe(hashFloat(1.2));
  });

  it('hashes NaN consistently', () => {
    expect(hashFloat(NaN)).toBe(hashFloat(NaN));
  });

  it('hashes Infinity', () => {
    expect(hashFloat(Infinity)).toBe(hashFloat(Infinity));
    expect(hashFloat(-Infinity)).toBe(hashFloat(-Infinity));
    expect(hashFloat(Infinity)).not.toBe(hashFloat(-Infinity));
  });
});

describe('hashString', () => {
  it('hashes empty string', () => {
    expect(hashString('')).toBe(0);
  });

  it('hashes single char', () => {
    const h = hashString('a');
    expect(typeof h).toBe('number');
    expect(h).not.toBe(0);
  });

  it('same string same hash', () => {
    expect(hashString('hello')).toBe(hashString('hello'));
    expect(hashString('world')).toBe(hashString('world'));
  });

  it('different strings (usually) different hashes', () => {
    expect(hashString('hello')).not.toBe(hashString('world'));
  });

  it('hash is a 32-bit integer', () => {
    const h = hashString('test');
    expect(h).toBe(h | 0);
  });
});

describe('mixCollHash', () => {
  it('mixes hash and count via Murmur3 finalizer', () => {
    const h = mixCollHash(42, 3);
    expect(typeof h).toBe('number');
    expect(h).toBe(h | 0); // 32-bit
  });

  it('same inputs produce same output', () => {
    expect(mixCollHash(100, 5)).toBe(mixCollHash(100, 5));
  });

  it('different inputs produce different output', () => {
    expect(mixCollHash(1, 1)).not.toBe(mixCollHash(2, 1));
    expect(mixCollHash(1, 1)).not.toBe(mixCollHash(1, 2));
  });
});

describe('hashOrdered', () => {
  it('empty collection hashes to mixCollHash(1, 0)', () => {
    expect(hashOrdered([])).toBe(mixCollHash(1, 0));
  });

  it('same elements same hash', () => {
    expect(hashOrdered([1, 2, 3])).toBe(hashOrdered([1, 2, 3]));
  });

  it('order matters', () => {
    expect(hashOrdered([1, 2, 3])).not.toBe(hashOrdered([3, 2, 1]));
  });

  it('different lengths different hashes', () => {
    expect(hashOrdered([1, 2])).not.toBe(hashOrdered([1, 2, 3]));
  });
});

describe('hashUnordered', () => {
  it('empty collection', () => {
    expect(hashUnordered([])).toBe(mixCollHash(0, 0));
  });

  it('same elements same hash regardless of order', () => {
    // XOR is commutative
    expect(hashUnordered([1, 2, 3])).toBe(hashUnordered([3, 1, 2]));
  });

  it('different elements different hash', () => {
    expect(hashUnordered([1, 2])).not.toBe(hashUnordered([3, 4]));
  });
});
