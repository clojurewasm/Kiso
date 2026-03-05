import { describe, it, expect } from 'vitest';
import {
  reduced, reduced_p, unreduced, ensure_reduced, Reduced,
  reduce, list, vector, add,
  completing, transduce,
  map, filter, take, conj,
  into, comp,
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

describe('map transducer (1-arity)', () => {
  it('returns a transducer when called with 1 arg', () => {
    const xf = map((x: number) => x * 2);
    expect(typeof xf).toBe('function');
  });

  it('works with transduce', () => {
    const result = transduce(
      map((x: number) => x * 2),
      add, 0, list(1, 2, 3),
    );
    expect(result).toBe(12);
  });

  it('still works as eager 2-arity', () => {
    const result = map((x: number) => x + 1, list(1, 2, 3));
    expect(result).toEqual(list(2, 3, 4));
  });
});

describe('filter transducer (1-arity)', () => {
  it('returns a transducer when called with 1 arg', () => {
    const xf = filter((x: number) => x > 2);
    expect(typeof xf).toBe('function');
  });

  it('works with transduce', () => {
    const result = transduce(
      filter((x: number) => x % 2 === 0),
      add, 0, list(1, 2, 3, 4, 5),
    );
    expect(result).toBe(6); // 2+4=6
  });

  it('still works as eager 2-arity', () => {
    const result = filter((x: number) => x > 2, list(1, 2, 3, 4));
    expect(result).toEqual(list(3, 4));
  });
});

describe('take transducer (1-arity)', () => {
  it('returns a transducer when called with 1 arg', () => {
    const xf = take(2);
    expect(typeof xf).toBe('function');
  });

  it('works with transduce, stops via Reduced', () => {
    const result = transduce(
      take(2),
      add, 0, list(10, 20, 30, 40),
    );
    expect(result).toBe(30); // 10+20=30
  });

  it('takes 0 elements', () => {
    const result = transduce(
      take(0),
      add, 0, list(1, 2, 3),
    );
    expect(result).toBe(0);
  });

  it('still works as eager 2-arity', () => {
    const result = take(2, list(1, 2, 3, 4));
    expect(result).toEqual(list(1, 2));
  });
});

describe('into 3-arity (transducer)', () => {
  it('applies xform when collecting into vector', () => {
    const result = into(vector(), map((x: number) => x * 10), list(1, 2, 3));
    expect(result).toEqual(vector(10, 20, 30));
  });

  it('filters into vector', () => {
    const result = into(vector(), filter((x: number) => x > 2), list(1, 2, 3, 4));
    expect(result).toEqual(vector(3, 4));
  });

  it('I7 regression: (into [:div] (map f) coll) returns non-empty', () => {
    const result = into(
      vector(':div' as unknown),
      map((x: number) => x + 1),
      list(1, 2, 3),
    );
    expect(result).toEqual(vector(':div' as unknown, 2, 3, 4));
  });

  it('still works as 2-arity', () => {
    const result = into(vector(1), list(2, 3));
    expect(result).toEqual(vector(1, 2, 3));
  });
});

describe('transducer composition with comp', () => {
  it('comp composes transducers (left-to-right data flow)', () => {
    const xf = comp(
      map((x: number) => x * 2) as (...args: unknown[]) => unknown,
      filter((x: number) => x > 2) as (...args: unknown[]) => unknown,
    );
    const result = transduce(xf, add, 0, list(1, 2, 3, 4));
    // map *2 first: [2,4,6,8], then filter >2: [4,6,8], sum=18
    expect(result).toBe(18);
  });

  it('comp with take limits output', () => {
    const xf = comp(
      take(2) as (...args: unknown[]) => unknown,
      map((x: number) => x * 10) as (...args: unknown[]) => unknown,
    );
    const result = into(vector(), xf, list(1, 2, 3, 4));
    expect(result).toEqual(vector(10, 20));
  });
});
