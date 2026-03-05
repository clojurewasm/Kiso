import { describe, it, expect } from 'vitest';
import {
  reduced, reduced_p, unreduced, ensure_reduced, Reduced,
  reduce, list, vector, add,
  completing, transduce,
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

describe('completing', () => {
  it('wraps a 2-arity fn to add 1-arity completion (identity)', () => {
    const cf = completing(add);
    expect(cf(3, 4)).toBe(7);
    expect(cf(42)).toBe(42); // completion = identity
  });

  it('uses custom completion fn', () => {
    const cf = completing(add, (x: unknown) => (x as number) * 10);
    expect(cf(3, 4)).toBe(7);
    expect(cf(5)).toBe(50); // custom completion
  });
});

describe('transduce', () => {
  it('applies xform to reduce', () => {
    const double = (rf: Function) => (...args: unknown[]) =>
      args.length === 1 ? rf(args[0]) : rf(args[0], (args[1] as number) * 2);
    const result = transduce(double, add, 0, list(1, 2, 3));
    expect(result).toBe(12); // (1*2)+(2*2)+(3*2) = 12
  });

  it('works without init (uses rf() for init)', () => {
    const double = (rf: Function) => (...args: unknown[]) =>
      args.length === 1 ? rf(args[0]) : rf(args[0], (args[1] as number) * 2);
    const result = transduce(double, add, list(1, 2, 3));
    expect(result).toBe(12); // add() = 0, then 2+4+6=12
  });

  it('respects Reduced early termination', () => {
    const takeTwo = (rf: Function) => {
      let n = 2;
      return (...args: unknown[]) => {
        if (args.length === 1) return rf(args[0]);
        if (n > 0) { n--; const r = rf(args[0], args[1]); return n === 0 ? reduced(r) : r; }
        return args[0];
      };
    };
    const result = transduce(takeTwo, add, 0, list(10, 20, 30, 40));
    expect(result).toBe(30); // 10+20=30, then stops
  });
});
