import { describe, it, expect } from 'vitest';
import { LazySeq } from '../../src/runtime/lazy-seq.js';
import { first, rest, next, seq, toArray } from '../../src/runtime/seq.js';

describe('LazySeq', () => {
  it('realizes on first access', () => {
    let realized = false;
    const ls = new LazySeq(() => { realized = true; return [1, 2, 3]; });
    expect(realized).toBe(false);
    first(ls);
    expect(realized).toBe(true);
  });

  it('memoizes the result', () => {
    let count = 0;
    const ls = new LazySeq(() => { count++; return [1, 2, 3]; });
    first(ls);
    first(ls);
    expect(count).toBe(1);
  });

  it('supports first', () => {
    const ls = new LazySeq(() => [10, 20, 30]);
    expect(first(ls)).toBe(10);
  });

  it('supports rest', () => {
    const ls = new LazySeq(() => [10, 20, 30]);
    const r = rest(ls);
    expect(first(r)).toBe(20);
  });

  it('supports next', () => {
    const ls = new LazySeq(() => [10, 20, 30]);
    const n = next(ls);
    expect(first(n)).toBe(20);
  });

  it('converts to array', () => {
    const ls = new LazySeq(() => [1, 2, 3]);
    expect(toArray(ls)).toEqual([1, 2, 3]);
  });

  it('handles empty lazy seq', () => {
    const ls = new LazySeq(() => []);
    expect(first(ls)).toBe(null);
  });

  it('handles null-returning thunk', () => {
    const ls = new LazySeq(() => null);
    expect(first(ls)).toBe(null);
    expect(seq(ls)).toBe(null);
  });

  it('chains nested lazy seqs', () => {
    const inner = new LazySeq(() => [1, 2, 3]);
    const outer = new LazySeq(() => inner);
    expect(first(outer)).toBe(1);
    expect(toArray(outer)).toEqual([1, 2, 3]);
  });
});
