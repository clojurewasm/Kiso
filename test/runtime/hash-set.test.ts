import { describe, it, expect } from 'vitest';
import { hashSet, EMPTY_SET, isHashSet } from '../../src/runtime/hash-set.js';

describe('empty set', () => {
  it('has count 0', () => {
    expect(EMPTY_SET.count).toBe(0);
  });

  it('does not contain anything', () => {
    expect(EMPTY_SET.has('a')).toBe(false);
  });
});

describe('conj', () => {
  it('adds element', () => {
    const s = EMPTY_SET.conj('a');
    expect(s.count).toBe(1);
    expect(s.has('a')).toBe(true);
  });

  it('adds multiple elements', () => {
    const s = EMPTY_SET.conj('a').conj('b').conj('c');
    expect(s.count).toBe(3);
    expect(s.has('a')).toBe(true);
    expect(s.has('b')).toBe(true);
    expect(s.has('c')).toBe(true);
  });

  it('duplicate elements not counted', () => {
    const s = EMPTY_SET.conj('a').conj('a');
    expect(s.count).toBe(1);
  });

  it('original set unchanged', () => {
    const s1 = EMPTY_SET.conj('a');
    const s2 = s1.conj('b');
    expect(s1.count).toBe(1);
    expect(s1.has('b')).toBe(false);
    expect(s2.count).toBe(2);
  });
});

describe('disj', () => {
  it('removes element', () => {
    const s = EMPTY_SET.conj('a').conj('b').disj('a');
    expect(s.count).toBe(1);
    expect(s.has('a')).toBe(false);
    expect(s.has('b')).toBe(true);
  });

  it('removing missing element returns same set', () => {
    const s = EMPTY_SET.conj('a');
    const s2 = s.disj('b');
    expect(s2.count).toBe(1);
  });

  it('remove to empty', () => {
    const s = EMPTY_SET.conj('a').disj('a');
    expect(s.count).toBe(0);
  });
});

describe('has', () => {
  it('detects present elements', () => {
    const s = hashSet(1, 2, 3);
    expect(s.has(1)).toBe(true);
    expect(s.has(2)).toBe(true);
    expect(s.has(3)).toBe(true);
  });

  it('detects absent elements', () => {
    const s = hashSet(1, 2, 3);
    expect(s.has(4)).toBe(false);
  });

  it('handles null', () => {
    const s = EMPTY_SET.conj(null);
    expect(s.has(null)).toBe(true);
    expect(s.count).toBe(1);
  });
});

describe('hashSet factory', () => {
  it('creates from elements', () => {
    const s = hashSet('a', 'b', 'c');
    expect(s.count).toBe(3);
  });

  it('deduplicates', () => {
    const s = hashSet(1, 1, 2, 2, 3);
    expect(s.count).toBe(3);
  });

  it('creates empty', () => {
    expect(hashSet().count).toBe(0);
  });
});

describe('isHashSet', () => {
  it('true for sets', () => {
    expect(isHashSet(EMPTY_SET)).toBe(true);
    expect(isHashSet(hashSet(1))).toBe(true);
  });

  it('false for other types', () => {
    expect(isHashSet(null)).toBe(false);
    expect(isHashSet(new Set())).toBe(false);
  });
});

describe('large set', () => {
  it('100 elements', () => {
    let s = EMPTY_SET;
    for (let i = 0; i < 100; i++) {
      s = s.conj(i);
    }
    expect(s.count).toBe(100);
    for (let i = 0; i < 100; i++) {
      expect(s.has(i)).toBe(true);
    }
    expect(s.has(100)).toBe(false);
  });
});
