import { describe, it, expect } from 'vitest';
import {
  reduced, reduced_p, unreduced, ensure_reduced, Reduced,
  reduce, list, vector,
} from '../../src/runtime/index.js';

describe('Reduced', () => {
  it('reduced wraps a value', () => {
    const r = reduced(42);
    expect(r).toBeInstanceOf(Reduced);
    expect(r.value).toBe(42);
  });

  it('reduced? detects Reduced', () => {
    expect(reduced_p(reduced(1))).toBe(true);
    expect(reduced_p(1)).toBe(false);
    expect(reduced_p(null)).toBe(false);
  });

  it('unreduced unwraps Reduced, passes through non-Reduced', () => {
    expect(unreduced(reduced(42))).toBe(42);
    expect(unreduced(99)).toBe(99);
  });

  it('ensure-reduced wraps non-Reduced, passes through Reduced', () => {
    const r = reduced(10);
    expect(ensure_reduced(r)).toBe(r);
    const r2 = ensure_reduced(20);
    expect(r2).toBeInstanceOf(Reduced);
    expect(r2.value).toBe(20);
  });
});

describe('reduce with Reduced early termination', () => {
  it('stops when f returns reduced', () => {
    // Sum until acc >= 6
    const result = reduce(
      (acc: unknown, x: unknown) => {
        const sum = (acc as number) + (x as number);
        return sum >= 6 ? reduced(sum) : sum;
      },
      0,
      list(1, 2, 3, 4, 5),
    );
    expect(result).toBe(6); // 1+2+3=6, stops
  });

  it('works with vector coll', () => {
    const result = reduce(
      (acc: unknown, x: unknown) => {
        const sum = (acc as number) + (x as number);
        return sum >= 3 ? reduced(sum) : sum;
      },
      0,
      vector(1, 2, 3, 4),
    );
    expect(result).toBe(3);
  });
});
