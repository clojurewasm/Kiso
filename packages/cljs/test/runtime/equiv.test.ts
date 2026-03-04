import { describe, it, expect } from 'vitest';
import { equiv } from '../../src/runtime/equiv.js';

describe('nil equality', () => {
  it('nil equals nil', () => {
    expect(equiv(null, null)).toBe(true);
  });

  it('nil does not equal false', () => {
    expect(equiv(null, false)).toBe(false);
  });

  it('nil does not equal 0', () => {
    expect(equiv(null, 0)).toBe(false);
  });

  it('nil does not equal empty string', () => {
    expect(equiv(null, '')).toBe(false);
  });
});

describe('boolean equality', () => {
  it('true equals true', () => {
    expect(equiv(true, true)).toBe(true);
  });

  it('false equals false', () => {
    expect(equiv(false, false)).toBe(true);
  });

  it('true does not equal false', () => {
    expect(equiv(true, false)).toBe(false);
  });

  it('true does not equal 1', () => {
    expect(equiv(true, 1)).toBe(false);
  });
});

describe('number equality', () => {
  it('integers equal', () => {
    expect(equiv(42, 42)).toBe(true);
    expect(equiv(0, 0)).toBe(true);
    expect(equiv(-1, -1)).toBe(true);
  });

  it('different integers not equal', () => {
    expect(equiv(1, 2)).toBe(false);
  });

  it('floats equal', () => {
    expect(equiv(3.14, 3.14)).toBe(true);
  });

  it('NaN not equal to NaN', () => {
    // Clojure: (= ##NaN ##NaN) → false
    expect(equiv(NaN, NaN)).toBe(false);
  });

  it('integer equals same-value float', () => {
    // Clojure: (= 1 1.0) → true
    expect(equiv(1, 1.0)).toBe(true);
  });
});

describe('string equality', () => {
  it('same strings equal', () => {
    expect(equiv('hello', 'hello')).toBe(true);
  });

  it('different strings not equal', () => {
    expect(equiv('hello', 'world')).toBe(false);
  });

  it('empty strings equal', () => {
    expect(equiv('', '')).toBe(true);
  });

  it('string does not equal number', () => {
    expect(equiv('1', 1)).toBe(false);
  });
});

describe('keyword equality', () => {
  // Keywords are represented as strings with ":" prefix in our system
  it('same keywords equal', () => {
    expect(equiv(':foo', ':foo')).toBe(true);
  });

  it('different keywords not equal', () => {
    expect(equiv(':foo', ':bar')).toBe(false);
  });
});

describe('array (vector) equality', () => {
  it('empty arrays equal', () => {
    expect(equiv([], [])).toBe(true);
  });

  it('same elements equal', () => {
    expect(equiv([1, 2, 3], [1, 2, 3])).toBe(true);
  });

  it('different elements not equal', () => {
    expect(equiv([1, 2], [1, 3])).toBe(false);
  });

  it('different lengths not equal', () => {
    expect(equiv([1, 2], [1, 2, 3])).toBe(false);
  });

  it('nested arrays equal', () => {
    expect(equiv([1, [2, 3]], [1, [2, 3]])).toBe(true);
  });

  it('nested arrays with different content not equal', () => {
    expect(equiv([1, [2, 3]], [1, [2, 4]])).toBe(false);
  });

  it('array does not equal non-array', () => {
    expect(equiv([1], 1)).toBe(false);
    expect(equiv([1], '1')).toBe(false);
  });
});

describe('cross-type equality', () => {
  it('null not equal to undefined (undefined treated as null)', () => {
    expect(equiv(null, undefined)).toBe(true);
  });

  it('number not equal to string', () => {
    expect(equiv(42, '42')).toBe(false);
  });

  it('boolean not equal to number', () => {
    expect(equiv(true, 1)).toBe(false);
    expect(equiv(false, 0)).toBe(false);
  });
});
