import { describe, it, expect } from 'vitest';
import { vector, EMPTY_VECTOR, isVector } from '../../src/runtime/vector.js';

describe('empty vector', () => {
  it('has count 0', () => {
    expect(EMPTY_VECTOR.count).toBe(0);
  });

  it('nth returns undefined', () => {
    expect(EMPTY_VECTOR.nth(0)).toBe(undefined);
  });

  it('isVector is true', () => {
    expect(isVector(EMPTY_VECTOR)).toBe(true);
  });
});

describe('vector creation', () => {
  it('creates empty vector with no args', () => {
    const v = vector();
    expect(v.count).toBe(0);
  });

  it('creates vector with elements', () => {
    const v = vector(1, 2, 3);
    expect(v.count).toBe(3);
    expect(v.nth(0)).toBe(1);
    expect(v.nth(1)).toBe(2);
    expect(v.nth(2)).toBe(3);
  });
});

describe('conj', () => {
  it('appends to empty vector', () => {
    const v = EMPTY_VECTOR.conj(42);
    expect(v.count).toBe(1);
    expect(v.nth(0)).toBe(42);
  });

  it('appends multiple elements', () => {
    let v = EMPTY_VECTOR;
    for (let i = 0; i < 10; i++) {
      v = v.conj(i);
    }
    expect(v.count).toBe(10);
    for (let i = 0; i < 10; i++) {
      expect(v.nth(i)).toBe(i);
    }
  });

  it('preserves existing elements', () => {
    const v1 = vector(1, 2, 3);
    const v2 = v1.conj(4);
    expect(v1.count).toBe(3);
    expect(v2.count).toBe(4);
    expect(v1.nth(0)).toBe(1);
    expect(v2.nth(3)).toBe(4);
  });
});

describe('tail overflow (>32 elements)', () => {
  it('handles 33 elements (tail flush)', () => {
    let v = EMPTY_VECTOR;
    for (let i = 0; i < 33; i++) {
      v = v.conj(i);
    }
    expect(v.count).toBe(33);
    for (let i = 0; i < 33; i++) {
      expect(v.nth(i)).toBe(i);
    }
  });

  it('handles 64 elements (second tail flush)', () => {
    let v = EMPTY_VECTOR;
    for (let i = 0; i < 64; i++) {
      v = v.conj(i);
    }
    expect(v.count).toBe(64);
    for (let i = 0; i < 64; i++) {
      expect(v.nth(i)).toBe(i);
    }
  });

  it('handles 100 elements', () => {
    let v = EMPTY_VECTOR;
    for (let i = 0; i < 100; i++) {
      v = v.conj(i);
    }
    expect(v.count).toBe(100);
    expect(v.nth(0)).toBe(0);
    expect(v.nth(50)).toBe(50);
    expect(v.nth(99)).toBe(99);
  });

  it('handles 1025 elements (root overflow → new level)', () => {
    let v = EMPTY_VECTOR;
    for (let i = 0; i < 1025; i++) {
      v = v.conj(i);
    }
    expect(v.count).toBe(1025);
    expect(v.nth(0)).toBe(0);
    expect(v.nth(512)).toBe(512);
    expect(v.nth(1024)).toBe(1024);
  });
});

describe('nth', () => {
  it('returns undefined for negative index', () => {
    expect(vector(1, 2, 3).nth(-1)).toBe(undefined);
  });

  it('returns undefined for out-of-bounds', () => {
    expect(vector(1, 2, 3).nth(3)).toBe(undefined);
  });

  it('accesses elements in tail', () => {
    const v = vector(1, 2, 3);
    expect(v.nth(0)).toBe(1);
    expect(v.nth(2)).toBe(3);
  });
});

describe('assocN', () => {
  it('updates element in tail', () => {
    const v1 = vector(1, 2, 3);
    const v2 = v1.assocN(1, 99);
    expect(v2.nth(1)).toBe(99);
    expect(v1.nth(1)).toBe(2); // original unchanged
  });

  it('updates element in trie', () => {
    let v = EMPTY_VECTOR;
    for (let i = 0; i < 64; i++) {
      v = v.conj(i);
    }
    const v2 = v.assocN(5, 999);
    expect(v2.nth(5)).toBe(999);
    expect(v.nth(5)).toBe(5); // original unchanged
  });

  it('throws for out-of-bounds', () => {
    expect(() => vector(1, 2).assocN(5, 0)).toThrow();
    expect(() => vector(1, 2).assocN(-1, 0)).toThrow();
  });
});

describe('pop', () => {
  it('removes last element', () => {
    const v = vector(1, 2, 3).pop();
    expect(v.count).toBe(2);
    expect(v.nth(0)).toBe(1);
    expect(v.nth(1)).toBe(2);
  });

  it('pop to empty', () => {
    const v = vector(1).pop();
    expect(v.count).toBe(0);
  });

  it('throws on empty vector', () => {
    expect(() => EMPTY_VECTOR.pop()).toThrow();
  });

  it('pop after tail flush restores tail from trie', () => {
    let v = EMPTY_VECTOR;
    for (let i = 0; i < 33; i++) {
      v = v.conj(i);
    }
    // v has 33 elements: 32 in trie + 1 in tail
    const v2 = v.pop();
    expect(v2.count).toBe(32);
    for (let i = 0; i < 32; i++) {
      expect(v2.nth(i)).toBe(i);
    }
  });
});

describe('structural sharing', () => {
  it('conj shares structure', () => {
    let v1 = EMPTY_VECTOR;
    for (let i = 0; i < 100; i++) {
      v1 = v1.conj(i);
    }
    const v2 = v1.conj(100);
    // v1 is unchanged
    expect(v1.count).toBe(100);
    expect(v2.count).toBe(101);
    // Both share trie structure
    for (let i = 0; i < 100; i++) {
      expect(v2.nth(i)).toBe(v1.nth(i));
    }
  });
});

describe('isVector', () => {
  it('true for vectors', () => {
    expect(isVector(EMPTY_VECTOR)).toBe(true);
    expect(isVector(vector(1, 2))).toBe(true);
  });

  it('false for other types', () => {
    expect(isVector(null)).toBe(false);
    expect(isVector([1, 2])).toBe(false);
    expect(isVector(42)).toBe(false);
  });
});

describe('large vector correctness', () => {
  it('10000 elements all accessible', () => {
    let v = EMPTY_VECTOR;
    for (let i = 0; i < 10000; i++) {
      v = v.conj(i);
    }
    expect(v.count).toBe(10000);
    // Spot check
    expect(v.nth(0)).toBe(0);
    expect(v.nth(999)).toBe(999);
    expect(v.nth(5000)).toBe(5000);
    expect(v.nth(9999)).toBe(9999);
  });
});
