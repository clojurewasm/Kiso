import { describe, it, expect } from 'vitest';
import { hashMap, EMPTY_MAP, isHashMap } from '../../src/runtime/hash-map.js';

describe('empty map', () => {
  it('has count 0', () => {
    expect(EMPTY_MAP.count).toBe(0);
  });

  it('get returns undefined', () => {
    expect(EMPTY_MAP.get('anything')).toBe(undefined);
  });

  it('isHashMap is true', () => {
    expect(isHashMap(EMPTY_MAP)).toBe(true);
  });
});

describe('assoc and get', () => {
  it('assoc single key', () => {
    const m = EMPTY_MAP.assoc('a', 1);
    expect(m.count).toBe(1);
    expect(m.get('a')).toBe(1);
  });

  it('assoc multiple keys', () => {
    const m = EMPTY_MAP.assoc('a', 1).assoc('b', 2).assoc('c', 3);
    expect(m.count).toBe(3);
    expect(m.get('a')).toBe(1);
    expect(m.get('b')).toBe(2);
    expect(m.get('c')).toBe(3);
  });

  it('assoc overwrites existing key', () => {
    const m = EMPTY_MAP.assoc('a', 1).assoc('a', 99);
    expect(m.count).toBe(1);
    expect(m.get('a')).toBe(99);
  });

  it('get missing key returns undefined', () => {
    const m = EMPTY_MAP.assoc('a', 1);
    expect(m.get('b')).toBe(undefined);
  });

  it('original map is unchanged after assoc', () => {
    const m1 = EMPTY_MAP.assoc('a', 1);
    const m2 = m1.assoc('b', 2);
    expect(m1.count).toBe(1);
    expect(m1.get('b')).toBe(undefined);
    expect(m2.count).toBe(2);
  });
});

describe('null key handling', () => {
  it('stores null key', () => {
    const m = EMPTY_MAP.assoc(null, 'value');
    expect(m.count).toBe(1);
    expect(m.get(null)).toBe('value');
  });

  it('overwrites null key', () => {
    const m = EMPTY_MAP.assoc(null, 1).assoc(null, 2);
    expect(m.count).toBe(1);
    expect(m.get(null)).toBe(2);
  });

  it('null key coexists with other keys', () => {
    const m = EMPTY_MAP.assoc(null, 'nil').assoc('a', 1);
    expect(m.count).toBe(2);
    expect(m.get(null)).toBe('nil');
    expect(m.get('a')).toBe(1);
  });
});

describe('numeric keys', () => {
  it('stores integer keys', () => {
    const m = EMPTY_MAP.assoc(1, 'one').assoc(2, 'two');
    expect(m.get(1)).toBe('one');
    expect(m.get(2)).toBe('two');
  });

  it('many numeric keys', () => {
    let m = EMPTY_MAP;
    for (let i = 0; i < 100; i++) {
      m = m.assoc(i, i * 10);
    }
    expect(m.count).toBe(100);
    for (let i = 0; i < 100; i++) {
      expect(m.get(i)).toBe(i * 10);
    }
  });
});

describe('dissoc', () => {
  it('removes existing key', () => {
    const m = EMPTY_MAP.assoc('a', 1).assoc('b', 2).dissoc('a');
    expect(m.count).toBe(1);
    expect(m.get('a')).toBe(undefined);
    expect(m.get('b')).toBe(2);
  });

  it('dissoc missing key returns same map', () => {
    const m = EMPTY_MAP.assoc('a', 1);
    const m2 = m.dissoc('b');
    expect(m2.count).toBe(1);
  });

  it('dissoc null key', () => {
    const m = EMPTY_MAP.assoc(null, 'val').dissoc(null);
    expect(m.count).toBe(0);
    expect(m.get(null)).toBe(undefined);
  });

  it('dissoc to empty', () => {
    const m = EMPTY_MAP.assoc('a', 1).dissoc('a');
    expect(m.count).toBe(0);
  });

  it('original map unchanged after dissoc', () => {
    const m1 = EMPTY_MAP.assoc('a', 1).assoc('b', 2);
    const m2 = m1.dissoc('a');
    expect(m1.count).toBe(2);
    expect(m1.get('a')).toBe(1);
    expect(m2.count).toBe(1);
  });
});

describe('has', () => {
  it('returns true for existing keys', () => {
    const m = EMPTY_MAP.assoc('a', 1);
    expect(m.has('a')).toBe(true);
  });

  it('returns false for missing keys', () => {
    expect(EMPTY_MAP.has('a')).toBe(false);
  });

  it('detects null key', () => {
    const m = EMPTY_MAP.assoc(null, 1);
    expect(m.has(null)).toBe(true);
  });
});

describe('string keys', () => {
  it('handles many string keys', () => {
    let m = EMPTY_MAP;
    for (let i = 0; i < 100; i++) {
      m = m.assoc(`key${i}`, i);
    }
    expect(m.count).toBe(100);
    for (let i = 0; i < 100; i++) {
      expect(m.get(`key${i}`)).toBe(i);
    }
  });
});

describe('mixed key types', () => {
  it('stores string and number keys', () => {
    const m = EMPTY_MAP.assoc('a', 1).assoc(42, 2).assoc(null, 3);
    expect(m.count).toBe(3);
    expect(m.get('a')).toBe(1);
    expect(m.get(42)).toBe(2);
    expect(m.get(null)).toBe(3);
  });
});

describe('large map stress test', () => {
  it('1000 entries all accessible', () => {
    let m = EMPTY_MAP;
    for (let i = 0; i < 1000; i++) {
      m = m.assoc(i, i * 2);
    }
    expect(m.count).toBe(1000);
    for (let i = 0; i < 1000; i++) {
      expect(m.get(i)).toBe(i * 2);
    }
  });
});

describe('hashMap factory', () => {
  it('creates from key-value pairs', () => {
    const m = hashMap('a', 1, 'b', 2);
    expect(m.count).toBe(2);
    expect(m.get('a')).toBe(1);
    expect(m.get('b')).toBe(2);
  });

  it('creates empty with no args', () => {
    expect(hashMap().count).toBe(0);
  });
});

describe('isHashMap', () => {
  it('true for maps', () => {
    expect(isHashMap(EMPTY_MAP)).toBe(true);
    expect(isHashMap(EMPTY_MAP.assoc('a', 1))).toBe(true);
  });

  it('false for other types', () => {
    expect(isHashMap(null)).toBe(false);
    expect(isHashMap({})).toBe(false);
    expect(isHashMap(42)).toBe(false);
  });
});
